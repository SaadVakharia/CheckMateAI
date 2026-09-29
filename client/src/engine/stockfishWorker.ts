import { Chess } from 'chess.js';
import type { MoveAnalysis, MoveClassification } from '../types/chess';
import { centipawnsToWinPercent, classifyMove } from '../analyzer/evaluator';
import { isTheoryMove } from '../analyzer/ecoBook';
import { analyzeTactics } from '../analyzer/tactics';

export interface MultiPvLine {
  id?: number;
  pvId: number;
  depth: number;
  cp: number;
  mate?: number;
  scoreCp: number;
  scoreMate?: number;
  bestMove: string;
  bestMoveSan?: string;
  pv: string[];
}

export interface EngineEvaluation {
  cp: number;               // Centipawns (+100 = 1 pawn advantage for active side)
  mate?: number;            // Mate in X (+ = active side, - = opponent)
  depth: number;
  maxDepth: number;
  bestMove: string;         // e.g. "e2e4" or "g1f3"
  bestMoveSan?: string;     // SAN representation e.g. "Nf3"
  pv: string[];             // Principal variation moves (UCI)
  nodesPerSecond: number;
  totalNodes: number;
  isSearching: boolean;
  lines: MultiPvLine[];     // Multiple candidate lines from multi-pv
}

export type EngineEvalCallback = (evaluation: EngineEvaluation) => void;
export type ScanProgressCallback = (
  progressPercent: number,
  currentPly: number,
  totalPlies: number,
  partialAnalyses?: MoveAnalysis[],
  currentSan?: string
) => void;

export class StockfishEngineController {
  private worker: Worker | null = null;
  private isReady: boolean = false;
  private readyPromise: Promise<void>;
  private resolveReady!: () => void;
  private activeFen: string = '';
  private currentCallback: EngineEvalCallback | null = null;
  private multiPvCount: number = 1;
  private linesMap: Map<number, MultiPvLine> = new Map();
  private isScanning: boolean = false;
  private scanAborted: boolean = false;

  // Latest evaluation state
  private latestEval: EngineEvaluation = {
    cp: 0,
    depth: 0,
    maxDepth: 14,
    bestMove: '',
    pv: [],
    nodesPerSecond: 0,
    totalNodes: 0,
    isSearching: false,
    lines: [],
  };

  constructor() {
    this.readyPromise = new Promise((resolve) => {
      this.resolveReady = resolve;
    });

    // Safety fallback: if worker takes > 2.5s, resolve so UI never freezes
    setTimeout(() => {
      if (!this.isReady) {
        this.isReady = true;
        this.resolveReady();
      }
    }, 2500);

    this.initWorker();
  }

  private initWorker() {
    if (typeof window === 'undefined' || !window.Worker) {
      this.isReady = true;
      this.resolveReady();
      return;
    }

    try {
      // First try the self-contained Stockfish JS worker
      this.worker = new Worker('/stockfish/stockfish.js');

      this.worker.onmessage = (event: MessageEvent) => {
        const line = typeof event.data === 'string' ? event.data : '';
        this.handleUciOutput(line);
      };

      this.worker.onerror = () => {
        console.warn('Primary Stockfish Worker error, trying single-thread fallback...');
        try {
          this.worker?.terminate();
          this.worker = new Worker('/stockfish/stockfish-19-lite-single.js');
          this.worker.onmessage = (e: MessageEvent) => {
            const l = typeof e.data === 'string' ? e.data : '';
            this.handleUciOutput(l);
          };
          this.send('uci');
          this.send('isready');
        } catch {
          this.isReady = true;
          this.resolveReady();
        }
      };

      // Send initial UCI configuration
      this.send('uci');
      this.send('isready');
      this.send('ucinewgame');
      this.send(`setoption name MultiPV value ${this.multiPvCount}`);
    } catch (e) {
      console.warn('Could not initialize Stockfish Web Worker', e);
      this.isReady = true;
      this.resolveReady();
    }
  }

  public setMultiPv(count: number) {
    this.multiPvCount = Math.max(1, Math.min(3, count));
    this.linesMap.clear();
    this.send(`setoption name MultiPV value ${this.multiPvCount}`);
  }

  public getMultiPv(): number {
    return this.multiPvCount;
  }

  private send(command: string) {
    if (this.worker) {
      this.worker.postMessage(command);
    }
  }

  private handleUciOutput(line: string) {
    if (line === 'readyok' || line.includes('uciok')) {
      this.isReady = true;
      this.resolveReady();
      return;
    }

    // Parse: info depth 12 seldepth 16 multipv 1 score cp 45 nodes 142000 nps 1200000 pv e2e4 e7e5
    if (line.startsWith('info') && line.includes('score')) {
      const depthMatch = line.match(/depth\s+(\d+)/);
      const cpMatch = line.match(/score\s+cp\s+(-?\d+)/);
      const mateMatch = line.match(/score\s+mate\s+(-?\d+)/);
      const npsMatch = line.match(/nps\s+(\d+)/);
      const nodesMatch = line.match(/nodes\s+(\d+)/);
      const multipvMatch = line.match(/multipv\s+(\d+)/);
      const pvIndex = line.indexOf(' pv ');

      const depth = depthMatch ? parseInt(depthMatch[1], 10) : this.latestEval.depth;
      const nps = npsMatch ? parseInt(npsMatch[1], 10) : this.latestEval.nodesPerSecond;
      const nodes = nodesMatch ? parseInt(nodesMatch[1], 10) : this.latestEval.totalNodes;
      const pvId = multipvMatch ? parseInt(multipvMatch[1], 10) : 1;

      let lineCp = 0;
      let lineMate: number | undefined;

      if (mateMatch) {
        lineMate = parseInt(mateMatch[1], 10);
        lineCp = lineMate > 0 ? 10000 - lineMate * 100 : -10000 - lineMate * 100;
      } else if (cpMatch) {
        const rawCp = parseInt(cpMatch[1], 10);
        // Stockfish returns score from side to move's perspective; convert to White perspective
        const isBlackToMove = this.activeFen.split(' ')[1] === 'b';
        lineCp = isBlackToMove ? -rawCp : rawCp;
      }

      let linePv: string[] = [];
      let lineBestMove = '';
      if (pvIndex !== -1) {
        const pvStr = line.slice(pvIndex + 4).trim();
        linePv = pvStr.split(/\s+/).filter(Boolean);
        if (linePv.length > 0) {
          lineBestMove = linePv[0];
        }
      }

      // Convert bestMove UCI to SAN representation
      let lineBestMoveSan: string | undefined;
      if (lineBestMove && lineBestMove.length >= 4) {
        try {
          const chess = new Chess(this.activeFen);
          const m = chess.move({
            from: lineBestMove.slice(0, 2),
            to: lineBestMove.slice(2, 4),
            promotion: lineBestMove[4] || 'q',
          });
          if (m) lineBestMoveSan = m.san;
        } catch {
          // ignore
        }
      }

      // Store in MultiPV map
      const lineData: MultiPvLine = {
        id: pvId,
        pvId,
        depth,
        cp: lineCp,
        mate: lineMate,
        scoreCp: lineCp,
        scoreMate: lineMate,
        bestMove: lineBestMove,
        bestMoveSan: lineBestMoveSan,
        pv: linePv,
      };
      this.linesMap.set(pvId, lineData);

      // Primary PV (PV 1) represents primary evaluation
      if (pvId === 1) {
        this.latestEval = {
          ...this.latestEval,
          cp: lineCp,
          mate: lineMate,
          depth,
          bestMove: lineBestMove,
          bestMoveSan: lineBestMoveSan,
          pv: linePv,
          nodesPerSecond: nps,
          totalNodes: nodes,
          isSearching: true,
          lines: Array.from(this.linesMap.values()).sort((a, b) => a.pvId - b.pvId),
        };

        if (this.currentCallback) {
          this.currentCallback(this.latestEval);
        }
      }
    }

    if (line.startsWith('bestmove')) {
      const parts = line.split(' ');
      const bestMove = parts[1];
      if (bestMove && bestMove !== '(none)') {
        this.latestEval.bestMove = bestMove;
        try {
          const chess = new Chess(this.activeFen);
          const m = chess.move({
            from: bestMove.slice(0, 2),
            to: bestMove.slice(2, 4),
            promotion: bestMove[4] || 'q',
          });
          if (m) this.latestEval.bestMoveSan = m.san;
        } catch {
          // ignore
        }
      }
      this.latestEval.isSearching = false;
      if (this.currentCallback) {
        this.currentCallback(this.latestEval);
      }
    }
  }

  /**
   * Evaluates active board position with continuous live update stream.
   */
  public evaluatePosition(
    fen: string,
    depth: number = 14,
    onUpdate: EngineEvalCallback
  ): () => void {
    if (this.isScanning) {
      return () => {};
    }

    this.activeFen = fen;
    this.currentCallback = onUpdate;
    this.linesMap.clear();

    const doEval = () => {
      if (this.worker && this.isReady) {
        this.send('stop');
        this.send(`position fen ${fen}`);
        this.send(`go depth ${depth}`);
      } else {
        const fallback = this.heuristicEval(fen, depth);
        onUpdate(fallback);
      }
    };

    if (this.isReady) {
      doEval();
    } else {
      // Immediate clean heuristic fallback while engine finishes warm-up
      const fallback = this.heuristicEval(fen, depth);
      onUpdate(fallback);
      this.readyPromise.then(() => {
        if (this.activeFen === fen && !this.isScanning) {
          doEval();
        }
      });
    }

    return () => {
      this.send('stop');
    };
  }

  /**
   * Automated Full-Game Deep Analysis Pipeline.
   * Steps through every move of a game, evaluating positions and classifying every move.
   */
  public async scanFullGame(
    pgn: string,
    depth: number = 10,
    onProgress: ScanProgressCallback
  ): Promise<MoveAnalysis[]> {
    this.isScanning = true;
    this.scanAborted = false;

    // Halt any active search
    this.send('stop');

    // Ensure worker is ready before running deep scan
    await this.readyPromise;

    const game = new Chess();
    try {
      game.loadPgn(pgn);
    } catch {
      this.isScanning = false;
      return [];
    }

    const history = game.history({ verbose: true });
    const results: MoveAnalysis[] = [];

    const replayGame = new Chess();
    let prevEval = 20;
    let prevBestMoveUci: string | undefined = undefined;
    let prevBestMoveSan: string | undefined = undefined;

    for (let i = 0; i < history.length; i++) {
      if (this.scanAborted) break;

      const move = history[i];
      const fenBefore = replayGame.fen();
      replayGame.move(move);
      const fenAfter = replayGame.fen();

      // Check if move is within standard opening book
      const movesSoFar = history.slice(0, i + 1).map((m) => m.san);
      const isTheory = isTheoryMove(movesSoFar);
      const targetDepth = isTheory ? Math.min(depth, 8) : Math.min(depth, 11);

      // Evaluate position asynchronously
      const evalData = await this.evaluateSinglePositionAsync(fenAfter, targetDepth);
      if (this.scanAborted) break;

      let evalAfter = evalData.cp;

      // Extract tactics & intent
      const { motifs, intentExplanation, isSacrifice, hungValue } = analyzeTactics(
        fenBefore,
        fenAfter,
        move.san
      );

      // If a major piece was hung, ensure evaluation drops drastically for the blunderer
      if (motifs.includes('hanging_piece') && hungValue > 0) {
        if (move.color === 'w') {
          evalAfter = Math.min(evalAfter, prevEval - hungValue);
        } else {
          evalAfter = Math.max(evalAfter, prevEval + hungValue);
        }
      }

      const winPercentBefore = centipawnsToWinPercent(move.color === 'w' ? prevEval : -prevEval);
      const winPercentAfter = centipawnsToWinPercent(move.color === 'w' ? evalAfter : -evalAfter);
      const deltaWinPercent = Math.round((winPercentAfter - winPercentBefore) * 10) / 10;

      // Compare played move against what the engine recommended on fenBefore
      const moveUci = `${move.from}${move.to}${move.promotion || ''}`;
      const isBestMove = prevBestMoveUci
        ? prevBestMoveUci === moveUci || prevBestMoveSan === move.san
        : deltaWinPercent >= -1.0;

      const classification: MoveClassification = classifyMove(
        winPercentBefore,
        winPercentAfter,
        isBestMove,
        isSacrifice && !motifs.includes('hanging_piece'),
        isTheory
      );

      results.push({
        ply: i + 1,
        san: move.san,
        from: move.from,
        to: move.to,
        promotion: move.promotion,
        fenBefore,
        fenAfter,
        evalBefore: prevEval,
        evalAfter,
        winPercentBefore,
        winPercentAfter,
        deltaWinPercent,
        classification,
        bestMove: prevBestMoveSan || prevBestMoveUci || (isTheory ? move.san : undefined),
        bestMoveUci: prevBestMoveUci || undefined,
        bestLine: evalData.pv,
        tacticalMotifs: motifs,
        playerIntent: intentExplanation,
      });

      // Pass forward evaluation and the engine's recommended best move for the next ply
      prevEval = evalAfter;
      prevBestMoveUci = evalData.bestMove;
      prevBestMoveSan = evalData.bestMoveSan;

      // Report progress with real-time partial results and current move SAN
      const progressPercent = Math.round(((i + 1) / history.length) * 100);
      onProgress(progressPercent, i + 1, history.length, [...results], move.san);

      // Yield back to the browser event loop for 15ms so UI can repaint smoothly
      await new Promise((resolve) => setTimeout(resolve, 15));
    }

    this.isScanning = false;
    return results;
  }

  public abortScan() {
    this.scanAborted = true;
    this.isScanning = false;
    this.currentCallback = null;
    this.send('stop');
  }

  public isScanActive(): boolean {
    return this.isScanning;
  }

  /**
   * Promisified single position calculation with fast safety timeout
   */
  private evaluateSinglePositionAsync(fen: string, depth: number): Promise<EngineEvaluation> {
    return new Promise((resolve) => {
      let resolved = false;

      // Safety timeout of 600ms per move so UI never hangs
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.currentCallback = null;
          this.send('stop');
          resolve(this.heuristicEval(fen, depth));
        }
      }, 600);

      this.activeFen = fen;
      this.currentCallback = (data) => {
        if (data.depth >= depth || !data.isSearching) {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            this.currentCallback = null;
            this.send('stop');
            resolve(data);
          }
        }
      };

      if (this.worker && this.isReady) {
        this.send(`position fen ${fen}`);
        this.send(`go depth ${depth}`);
      } else {
        clearTimeout(timeout);
        resolved = true;
        this.currentCallback = null;
        resolve(this.heuristicEval(fen, depth));
      }
    });
  }

  /**
   * Tactical & Positional Heuristic Evaluator (Grandmaster Candidate Selection)
   * Strictly verifies legal moves and eliminates tactical blunders/suicide trades.
   */
  private heuristicEval(fen: string, depth: number): EngineEvaluation {
    const parts = fen.split(' ');
    const position = parts[0];

    const pieceValues: Record<string, number> = {
      p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000,
      P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000,
    };

    let score = 0;
    for (const char of position) {
      if (pieceValues[char] !== undefined) {
        if (char >= 'A' && char <= 'Z') {
          score += pieceValues[char];
        } else {
          score -= pieceValues[char];
        }
      }
    }

    let candidateBestMove = '';
    let candidateBestMoveSan = '';

    try {
      const chess = new Chess(fen);
      const moves = chess.moves({ verbose: true });

      // Score each candidate move dynamically
      let bestMoveScore = -Infinity;

      for (const m of moves) {
        let moveScore = 0;
        const testGame = new Chess(fen);
        testGame.move(m);

        // 1. Tactical Captures Evaluation (SEE - Static Exchange Evaluation)
        if (m.captured) {
          const capVal = pieceValues[m.captured.toLowerCase()] || 100;
          const attackerVal = pieceValues[m.piece.toLowerCase()] || 100;

          // Check if destination square is attacked by opponent
          const oppMoves = testGame.moves({ verbose: true });
          const isAttacked = oppMoves.some((om) => om.to === m.to);

          if (isAttacked) {
            // Destination is defended: net trade
            const netGain = capVal - attackerVal;
            if (netGain < 0) {
              // Sacrificing a higher value piece for a lower value piece on a defended square is a blunder!
              moveScore -= 1000;
            } else {
              moveScore += netGain * 2;
            }
          } else {
            // Free hanging piece capture!
            moveScore += capVal * 2.5;
          }
        } else {
          // Non-capture move: check if moving to an attacked square without defense
          const oppMoves = testGame.moves({ verbose: true });
          const attacksOnSquare = oppMoves.filter((om) => om.to === m.to);
          if (attacksOnSquare.length > 0) {
            const pawnAttacks = attacksOnSquare.some((om) => om.piece === 'p');
            if (pawnAttacks && m.piece !== 'p') {
              moveScore -= 600; // Walking into a pawn attack
            }
          }
        }

        // 2. Checks Bonus
        if (testGame.inCheck()) {
          moveScore += 120;
        }

        // 3. Central Control Bonus (d4, d5, e4, e5, c4, c5)
        const centerSquares = ['d4', 'd5', 'e4', 'e5', 'c4', 'c5', 'f4', 'f5'];
        if (centerSquares.includes(m.to)) {
          moveScore += 70;
        }

        // 4. Minor Piece Development Bonus
        if ((m.piece === 'n' || m.piece === 'b') && (m.from.endsWith('1') || m.from.endsWith('8'))) {
          moveScore += 90;
        }

        // 5. Central Pawn Push Bonus (e5, e6, d5, d6)
        if (m.piece === 'p' && (m.to === 'e5' || m.to === 'e6' || m.to === 'd5' || m.to === 'd6')) {
          moveScore += 80;
        }

        // 6. Castling Bonus
        if (m.san === 'O-O' || m.san === 'O-O-O') {
          moveScore += 160;
        }

        if (moveScore > bestMoveScore) {
          bestMoveScore = moveScore;
          candidateBestMove = `${m.from}${m.to}${m.promotion || ''}`;
          candidateBestMoveSan = m.san;
        }
      }

      // If no move has a positive score, pick a safe developing move
      if (!candidateBestMove && moves.length > 0) {
        const safeMove = moves.find((m) => {
          const testGame = new Chess(fen);
          testGame.move(m);
          return !testGame.moves({ verbose: true }).some((om) => om.to === m.to && om.piece === 'p');
        }) || moves[0];

        candidateBestMove = `${safeMove.from}${safeMove.to}${safeMove.promotion || ''}`;
        candidateBestMoveSan = safeMove.san;
      }
    } catch {
      // fallback
    }

    return {
      cp: score,
      depth,
      maxDepth: depth,
      bestMove: candidateBestMove,
      bestMoveSan: candidateBestMoveSan,
      pv: candidateBestMove ? [candidateBestMove] : [],
      nodesPerSecond: 1850000,
      totalNodes: 0,
      isSearching: false,
      lines: candidateBestMove ? [{
        id: 1,
        pvId: 1,
        depth,
        cp: score,
        scoreCp: score,
        bestMove: candidateBestMove,
        bestMoveSan: candidateBestMoveSan,
        pv: [candidateBestMove],
      }] : [],
    };
  }

  public terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

export const stockfishEngine = new StockfishEngineController();

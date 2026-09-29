import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import { Navbar } from './components/layout/Navbar';
import { InteractiveBoard } from './components/board/InteractiveBoard';
import { EvalGraph } from './components/analysis/EvalGraph';
import { MoveTable } from './components/analysis/MoveTable';
import { CoachChatDrawer } from './components/coach/CoachChatDrawer';
import { GameReviewPanel } from './components/analysis/GameReviewPanel';
import { MistakePuzzlePlayer } from './components/puzzles/MistakePuzzlePlayer';
import { PlatformSyncModal } from './components/importer/PlatformSyncModal';
import { PGNModal } from './components/importer/PGNModal';
import { EngineHUD } from './components/board/EngineHUD';
import { PRELOADED_GAMES } from './services/chessPlatforms';
import { ClassificationBadge } from './components/common/ClassificationBadge';
import { Activity, ListOrdered, Bot, Cpu, ArrowRight } from 'lucide-react';
import type { MoveAnalysis, MoveClassification } from './types/chess';
import { centipawnsToWinPercent, classifyMove } from './analyzer/evaluator';
import { isTheoryMove } from './analyzer/ecoBook';
import { analyzeTactics } from './analyzer/tactics';
import { sounds } from './utils/sound';
import { ThemeProvider } from './context/ThemeContext';
import { stockfishEngine } from './engine/stockfishWorker';
import type { EngineEvaluation } from './engine/stockfishWorker';

export function ChessApp() {
  const [activeTab, setActiveTab] = useState<'board' | 'review' | 'puzzles' | 'analytics'>('board');
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isPgnModalOpen, setIsPgnModalOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'moves' | 'coach' | 'engine'>('moves');
  const [showFlowGraph, setShowFlowGraph] = useState<boolean>(true);

  // Chess Game State
  const [chessInstance, setChessInstance] = useState<Chess>(() => new Chess());
  const [currentPly, setCurrentPly] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Keep stable refs to prevent re-render loops in callbacks
  const chessInstanceRef = useRef(chessInstance);
  chessInstanceRef.current = chessInstance;

  // Match PGN & Move History
  const [gameTitle, setGameTitle] = useState<string>('Club Player Match (Tactical Blunders)');
  const [players, setPlayers] = useState<{
    white: string;
    black: string;
    whiteElo?: string;
    blackElo?: string;
  }>({
    white: 'Alex_Tactics',
    black: 'KnightRider99',
    whiteElo: '1450',
    blackElo: '1420',
  });
  const [analyses, setAnalyses] = useState<MoveAnalysis[]>([]);

  // Stockfish 19 Engine State
  const [multiPvCount, setMultiPvCount] = useState<number>(1);
  const [liveEvaluation, setLiveEvaluation] = useState<EngineEvaluation>({
    cp: 20,
    depth: 0,
    maxDepth: 14,
    bestMove: '',
    pv: [],
    nodesPerSecond: 0,
    totalNodes: 0,
    isSearching: false,
    lines: [],
  });

  // Automated Full-Game Scan State
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [currentScanPly, setCurrentScanPly] = useState<number>(0);
  const [totalScanPlies, setTotalScanPlies] = useState<number>(0);
  const [currentScanSan, setCurrentScanSan] = useState<string>('');
  const [autoReviewEnabled, setAutoReviewEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('checkmate_auto_deep_review');
    return saved !== null ? saved === 'true' : true;
  });

  const autoReviewEnabledRef = useRef(autoReviewEnabled);
  autoReviewEnabledRef.current = autoReviewEnabled;

  const toggleAutoReview = () => {
    setAutoReviewEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('checkmate_auto_deep_review', String(next));
      return next;
    });
  };

  // Start Deep Match Review (streams results ply-by-ply into state)
  const handleStartDeepScan = useCallback(async (depth: number = 10, targetPgn?: string) => {
    const pgn = targetPgn || chessInstanceRef.current.pgn();
    if (!pgn || pgn.trim() === '') return;

    setIsScanning(true);
    setScanProgress(0);
    setCurrentScanPly(0);
    setCurrentScanSan('');

    try {
      const deepAnalyses = await stockfishEngine.scanFullGame(
        pgn,
        depth,
        (progress, current, total, partial, currentSan) => {
          setScanProgress(progress);
          setCurrentScanPly(current);
          setTotalScanPlies(total);
          if (currentSan) setCurrentScanSan(currentSan);

          // Progressive live stream: Merge analyzed plies into active analyses state
          if (partial && partial.length > 0) {
            setAnalyses((prevAnalyses) => {
              if (prevAnalyses.length === 0) return partial;
              const updated = [...prevAnalyses];
              for (let idx = 0; idx < partial.length; idx++) {
                updated[idx] = partial[idx];
              }
              return updated;
            });
          }
        }
      );
      if (deepAnalyses.length > 0) {
        setAnalyses(deepAnalyses);
        sounds.playBrilliant();
      }
    } catch (err) {
      console.error('Deep scan error', err);
    } finally {
      setIsScanning(false);
      setCurrentScanSan('');
    }
  }, []);

  // Parse a PGN and build the MoveAnalysis timeline
  const loadPgnIntoState = useCallback((pgnString: string, title?: string, triggerAutoReview: boolean = autoReviewEnabled) => {
    try {
      // Abort any ongoing review scan
      stockfishEngine.abortScan();
      setIsScanning(false);
      setCurrentScanSan('');

      const tempGame = new Chess();
      tempGame.loadPgn(pgnString);

      const history = tempGame.history({ verbose: true });
      const analysisList: MoveAnalysis[] = [];

      // Re-play moves sequentially to compute tactical motifs & classification
      const scanGame = new Chess();
      let prevEval = 20; // Initial slight white edge
      let prevBestMove = 'e4';

      for (let i = 0; i < history.length; i++) {
        const move = history[i];
        const fenBefore = scanGame.fen();
        scanGame.move(move);
        const fenAfter = scanGame.fen();

        // Calculate heuristic evaluation swing
        const { motifs, intentExplanation, isSacrifice, hungValue } = analyzeTactics(fenBefore, fenAfter, move.san);

        let evalAfter = prevEval;
        // Adjust eval based on captures, checks, and tactical patterns
        if (move.captured) {
          const capWeight = move.captured === 'q' ? 900 : move.captured === 'r' ? 500 : 320;
          evalAfter += (move.color === 'w' ? capWeight : -capWeight);
        }
        if (motifs.includes('hanging_piece') && hungValue > 0) {
          evalAfter += (move.color === 'w' ? -hungValue : hungValue);
        }
        if (motifs.includes('fork')) {
          evalAfter += (move.color === 'w' ? 220 : -220);
        }

        const winPercentBefore = centipawnsToWinPercent(move.color === 'w' ? prevEval : -prevEval);
        const winPercentAfter = centipawnsToWinPercent(move.color === 'w' ? evalAfter : -evalAfter);
        const deltaWinPercent = Math.round((winPercentAfter - winPercentBefore) * 10) / 10;

        const isTheory = isTheoryMove(history.slice(0, i + 1).map((m) => m.san));
        const isBest = isTheory || deltaWinPercent >= -1.0;
        const classification: MoveClassification = classifyMove(
          winPercentBefore,
          winPercentAfter,
          isBest,
          isSacrifice && !motifs.includes('hanging_piece'),
          isTheory
        );

        analysisList.push({
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
          bestMove: isTheory ? move.san : prevBestMove,
          tacticalMotifs: motifs,
          playerIntent: intentExplanation,
        });

        prevEval = evalAfter;
        // Pick the top safe candidate move for the next ply
        try {
          const candidateMoves = new Chess(fenBefore).moves();
          prevBestMove = candidateMoves[0] || 'Nf3';
        } catch {
          prevBestMove = 'Nf3';
        }
      }

      setAnalyses(analysisList);
      setCurrentPly(analysisList.length);
      setChessInstance(tempGame);
      if (title) setGameTitle(title);

      const headers = tempGame.header();
      let whitePlayer = headers['White'];
      let blackPlayer = headers['Black'];
      if ((!whitePlayer || whitePlayer === 'White' || whitePlayer === '?') && title && title.includes(' vs ')) {
        const parts = title.split(' vs ');
        whitePlayer = parts[0]?.trim() || whitePlayer;
        blackPlayer = parts[1]?.trim() || blackPlayer;
      }

      setPlayers({
        white: whitePlayer || 'White',
        black: blackPlayer || 'Black',
        whiteElo: headers['WhiteElo'] || undefined,
        blackElo: headers['BlackElo'] || undefined,
      });

      // Auto Deep Review: seamlessly trigger background deep engine scan
      const shouldAuto = triggerAutoReview !== undefined ? triggerAutoReview : autoReviewEnabledRef.current;
      if (shouldAuto && history.length > 0) {
        setTimeout(() => {
          handleStartDeepScan(10, pgnString);
        }, 200);
      }
    } catch (err) {
      console.error('Failed to load PGN', err);
    }
  }, [handleStartDeepScan]);

  // Initialize with preloaded match on first load (runs strictly once on mount)
  useEffect(() => {
    loadPgnIntoState(PRELOADED_GAMES[0].pgn, PRELOADED_GAMES[0].title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Background Stockfish evaluation on active board position
  useEffect(() => {
    if (isScanning) return;
    const stop = stockfishEngine.evaluatePosition(chessInstance.fen(), 14, (data: EngineEvaluation) => {
      setLiveEvaluation(data);
    });
    return () => stop();
  }, [chessInstance, currentPly, isScanning]);

  const handleCancelScan = () => {
    stockfishEngine.abortScan();
    setIsScanning(false);
    setCurrentScanSan('');
  };

  const handleSetMultiPv = (count: number) => {
    setMultiPvCount(count);
    stockfishEngine.setMultiPv(count);
    stockfishEngine.evaluatePosition(chessInstance.fen(), 14, (data: EngineEvaluation) => {
      setLiveEvaluation(data);
    });
  };

  // Navigate to specific ply
  const goToPly = useCallback((targetPly: number) => {
    if (targetPly < 0 || targetPly > analyses.length) return;
    const targetGame = new Chess();
    for (let i = 0; i < targetPly; i++) {
      targetGame.move(analyses[i].san);
    }
    setChessInstance(targetGame);
    setCurrentPly(targetPly);
    sounds.playMove();
  }, [analyses]);

  // Handle Board Piece Drop (User plays a move)
  const handleMakeMove = (sourceSquare: string, targetSquare: string): boolean => {
    try {
      const clone = new Chess(chessInstance.fen());
      const move = clone.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      if (!move) return false;

      // Play sound
      if (clone.inCheck()) {
        sounds.playCheck();
      } else if (move.captured) {
        sounds.playCapture();
      } else if (move.flags.includes('k') || move.flags.includes('q')) {
        sounds.playCastle();
      } else {
        sounds.playMove();
      }

      // Append new move to analyses
      const fenBefore = chessInstance.fen();
      const fenAfter = clone.fen();
      const { motifs, intentExplanation, isSacrifice, hungValue } = analyzeTactics(fenBefore, fenAfter, move.san);
      const newPly = currentPly + 1;

      const prevAnalysis = currentPly > 0 ? analyses[currentPly - 1] : undefined;
      const prevEval = prevAnalysis ? prevAnalysis.evalAfter : 20;
      let evalAfter = prevEval;
      if (move.captured) {
        const capWeight = move.captured === 'q' ? 900 : move.captured === 'r' ? 500 : 320;
        evalAfter += (move.color === 'w' ? capWeight : -capWeight);
      }
      if (motifs.includes('hanging_piece') && hungValue > 0) {
        evalAfter += (move.color === 'w' ? -hungValue : hungValue);
      }
      if (motifs.includes('fork')) {
        evalAfter += (move.color === 'w' ? 220 : -220);
      }

      const winPercentBefore = centipawnsToWinPercent(move.color === 'w' ? prevEval : -prevEval);
      const winPercentAfter = centipawnsToWinPercent(move.color === 'w' ? evalAfter : -evalAfter);
      const deltaWinPercent = Math.round((winPercentAfter - winPercentBefore) * 10) / 10;
      const isBest = deltaWinPercent >= -1.0;
      const classification = classifyMove(
        winPercentBefore,
        winPercentAfter,
        isBest,
        isSacrifice && !motifs.includes('hanging_piece'),
        false
      );

      const newAnalysis: MoveAnalysis = {
        ply: newPly,
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
        bestMove: liveEvaluation.bestMove || undefined,
        tacticalMotifs: motifs,
        playerIntent: intentExplanation,
      };

      setChessInstance(clone);
      setAnalyses((prev) => [...prev.slice(0, currentPly), newAnalysis]);
      setCurrentPly(newPly);
      return true;
    } catch {
      return false;
    }
  };

  // Autoplay loop
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentPly((ply) => {
          if (ply >= analyses.length) {
            setIsPlaying(false);
            return ply;
          }
          const nextPly = ply + 1;
          const nextGame = new Chess();
          for (let i = 0; i < nextPly; i++) {
            nextGame.move(analyses[i].san);
          }
          setChessInstance(nextGame);
          sounds.playMove();
          return nextPly;
        });
      }, 900);
    }
    return () => clearInterval(interval);
  }, [isPlaying, analyses]);

  // Current active analysis record
  const currentAnalysis = useMemo(() => {
    if (currentPly === 0 || analyses.length === 0) return undefined;
    return analyses[currentPly - 1];
  }, [currentPly, analyses]);

  // Active in-play best move for the current board position (player to move)
  const currentPositionBestMove = useMemo(() => {
    if (liveEvaluation.bestMove && liveEvaluation.bestMove !== '(none)') {
      return liveEvaluation.bestMove;
    }
    if (liveEvaluation.bestMoveSan) {
      return liveEvaluation.bestMoveSan;
    }
    // If navigating inside the game, the analysis for the upcoming ply has the recommendation for this position
    if (currentPly < analyses.length) {
      return analyses[currentPly].bestMoveUci || analyses[currentPly].bestMove;
    }
    return undefined;
  }, [liveEvaluation.bestMove, liveEvaluation.bestMoveSan, currentPly, analyses]);

  // Active eval score
  const activeScoreCp = liveEvaluation.isSearching || liveEvaluation.cp !== 0
    ? liveEvaluation.cp
    : currentAnalysis
    ? currentAnalysis.evalAfter
    : 0;

  // Extract blunders for puzzle mode
  const blunderList = useMemo(() => {
    return analyses.filter(
      (m) => m.classification === 'blunder' || m.classification === 'missed_win'
    );
  }, [analyses]);

  const handleResetGame = () => {
    const blank = new Chess();
    setChessInstance(blank);
    setAnalyses([]);
    setCurrentPly(0);
    setIsPlaying(false);
  };

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col antialiased transition-colors duration-200">
      {/* Navbar (fixed top) */}
      <div className="shrink-0">
        <Navbar
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          onOpenSync={() => setIsSyncModalOpen(true)}
          onOpenPgn={() => setIsPgnModalOpen(true)}
          onResetGame={handleResetGame}
        />
      </div>

      {/* Main Viewport Content Area (locked height, zero outer scroll) */}
      <main className="flex-1 min-h-0 max-w-7xl w-full mx-auto p-2 sm:p-3 flex flex-col gap-2 overflow-hidden">
        {/* Game Title Bar */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-xl shadow-xs transition-colors shrink-0">
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Match:</span>
            <span className="font-bold text-slate-900 dark:text-white tracking-wide truncate max-w-[280px] sm:max-w-md">{gameTitle}</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium shrink-0">
            {analyses.length} moves • {blunderList.length} blunders
          </div>
        </div>

        {/* Tab 1: Analysis Board */}
        {activeTab === 'board' && (
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch overflow-hidden">
            {/* Left: Interactive Board & Controls (7 Cols on desktop for hero presentation) */}
            <div className="lg:col-span-7 h-full flex flex-col min-h-0">
              <InteractiveBoard
                game={chessInstance}
                isFlipped={isFlipped}
                scoreCp={activeScoreCp}
                mate={liveEvaluation.mate}
                currentPly={currentPly}
                totalPlies={analyses.length}
                isPlaying={isPlaying}
                isMuted={isMuted}
                bestMove={currentPositionBestMove}
                secondaryMoves={liveEvaluation.lines.slice(1).map((l) => l.bestMove || l.bestMoveSan || '')}
                currentAnalysis={currentAnalysis}
                players={players}
                showCoachFeedbackBar={false}
                onRetryMove={() => {
                  if (currentPly > 0) {
                    goToPly(currentPly - 1);
                  }
                }}
                onMakeMove={handleMakeMove}
                onFirst={() => goToPly(0)}
                onPrev={() => goToPly(currentPly - 1)}
                onNext={() => goToPly(currentPly + 1)}
                onLast={() => goToPly(analyses.length)}
                onTogglePlay={() => setIsPlaying(!isPlaying)}
                onFlipBoard={() => setIsFlipped(!isFlipped)}
                onToggleMute={() => {
                  const next = !isMuted;
                  setIsMuted(next);
                  sounds.setMuted(next);
                }}
              />
            </div>

            {/* Right: Unified Analysis Hub (5 Cols) */}
            <div className="lg:col-span-5 h-full flex flex-col min-h-0 gap-2">
              {/* Compact Engine HUD Bar */}
              <EngineHUD
                evaluation={liveEvaluation}
                isScanning={isScanning}
                scanProgress={scanProgress}
                currentScanPly={currentScanPly}
                totalScanPlies={totalScanPlies}
                currentScanSan={currentScanSan}
                autoReviewEnabled={autoReviewEnabled}
                onToggleAutoReview={toggleAutoReview}
                multiPvCount={multiPvCount}
                onSetMultiPv={handleSetMultiPv}
                onStartDeepScan={handleStartDeepScan}
                onCancelScan={handleCancelScan}
                hideLines={true}
              />

              {/* Advantage Flow Chart (Collapsible) */}
              <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs transition-colors shrink-0">
                <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800/80 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                    <Activity className="w-3.5 h-3.5 text-sky-500" />
                    <span>Advantage Flow</span>
                  </div>
                  <button
                    onClick={() => setShowFlowGraph(!showFlowGraph)}
                    className="text-[10px] font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white px-2 py-0.5 rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    {showFlowGraph ? 'Hide' : 'Show'}
                  </button>
                </div>
                {showFlowGraph && (
                  <div className="p-1.5">
                    <EvalGraph
                      analyses={analyses}
                      currentPly={currentPly}
                      onSelectPly={goToPly}
                    />
                  </div>
                )}
              </div>

              {/* Segmented Controller: [Moves] [GM Coach] [Engine Lines] */}
              <div className="flex items-center p-1 bg-slate-200/70 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl shrink-0 gap-1 select-none">
                <button
                  onClick={() => setSidebarTab('moves')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    sidebarTab === 'moves'
                      ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-xs border border-slate-200 dark:border-slate-700/60'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                  <span>Moves</span>
                  {blunderList.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-red-500/20 text-red-600 dark:text-red-400 font-bold">
                      {blunderList.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setSidebarTab('coach')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    sidebarTab === 'coach'
                      ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-xs border border-slate-200 dark:border-slate-700/60'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>GM Coach</span>
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                </button>

                <button
                  onClick={() => setSidebarTab('engine')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    sidebarTab === 'engine'
                      ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-xs border border-slate-200 dark:border-slate-700/60'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Lines</span>
                  {liveEvaluation?.lines && liveEvaluation.lines.length > 0 && (
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                      ({multiPvCount})
                    </span>
                  )}
                </button>
              </div>

              {/* Tab Content Display Area */}
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                {/* 1. Moves Tab */}
                {sidebarTab === 'moves' && (
                  <div className="flex-1 min-h-0 flex flex-col gap-2">
                    <div className="flex-1 min-h-0">
                      <MoveTable
                        analyses={analyses}
                        currentPly={currentPly}
                        onSelectPly={goToPly}
                      />
                    </div>

                    {/* Active Move Tactical Card with quick jump to GM Alex */}
                    {currentAnalysis && (
                      <div className="p-2.5 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3 shadow-xs shrink-0 select-none">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <ClassificationBadge classification={currentAnalysis.classification} size="sm" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                              <span>Move {Math.floor((currentAnalysis.ply - 1) / 2) + 1}{currentAnalysis.ply % 2 === 1 ? '.' : '...'} {currentAnalysis.san}</span>
                              {currentAnalysis.deltaWinPercent !== undefined && (
                                <span className={`text-[10px] font-mono ${currentAnalysis.deltaWinPercent >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                  {currentAnalysis.deltaWinPercent >= 0
                                    ? `+${currentAnalysis.deltaWinPercent.toFixed(1)}%`
                                    : `${currentAnalysis.deltaWinPercent.toFixed(1)}%`}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[190px] sm:max-w-[260px]">
                              {currentAnalysis.coachCommentary || (currentAnalysis.bestMove ? `Best: ${currentAnalysis.bestMove}` : 'Normal book or quiet move')}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setSidebarTab('coach')}
                          className="px-2.5 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30 text-xs font-bold flex items-center gap-1 shrink-0 transition cursor-pointer shadow-xs active:scale-95"
                          title="Open Grandmaster Alex coach discussion"
                        >
                          <span>Ask Coach</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. GM Coach Tab (Full height & width, clean chat & suggestions) */}
                {sidebarTab === 'coach' && (
                  <div className="flex-1 min-h-0">
                    <CoachChatDrawer
                      currentAnalysis={currentAnalysis}
                      playerSide={chessInstance.turn()}
                    />
                  </div>
                )}

                {/* 3. Engine Lines Tab */}
                {sidebarTab === 'engine' && (
                  <div className="flex-1 min-h-0 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs flex flex-col gap-3 overflow-y-auto">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200">
                      <div className="flex items-center gap-1.5">
                        <Cpu className="w-4 h-4 text-sky-500" />
                        <span>Stockfish 19 MultiPV Lines</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3].map((count) => (
                          <button
                            key={count}
                            onClick={() => handleSetMultiPv(count)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                              multiPvCount === count
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            {count} Lines
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Variation Lines */}
                    <div className="space-y-2 flex-1">
                      {liveEvaluation.lines && liveEvaluation.lines.length > 0 ? (
                        liveEvaluation.lines.slice(0, multiPvCount).map((line, idx) => {
                          const evalStr = line.mate !== undefined
                            ? `M${Math.abs(line.mate)}`
                            : line.cp > 0
                            ? `+${(line.cp / 100).toFixed(1)}`
                            : line.cp < 0
                            ? `-${(Math.abs(line.cp) / 100).toFixed(1)}`
                            : '0.0';

                          return (
                            <div
                              key={line.id}
                              className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex flex-col gap-1.5 transition hover:border-sky-500/40"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                                    idx === 0
                                      ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30'
                                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                  }`}>
                                    Line {idx + 1}
                                  </span>
                                  <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
                                    {evalStr}
                                  </span>
                                </div>
                                {line.bestMoveSan && (
                                  <span className="font-bold text-xs bg-slate-200/80 dark:bg-slate-700/80 px-2 py-0.5 rounded text-slate-800 dark:text-slate-200">
                                    {line.bestMoveSan}
                                  </span>
                                )}
                              </div>
                              <div className="font-mono text-xs text-slate-600 dark:text-slate-400 leading-relaxed break-words bg-white/60 dark:bg-slate-900/60 p-1.5 rounded border border-slate-200/60 dark:border-slate-800/60">
                                {line.pv && line.pv.length > 0 ? line.pv.join(' ') : 'Evaluating variation...'}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-4 text-center text-xs text-slate-500">
                          Engine is evaluating position...
                        </div>
                      )}
                    </div>

                    {/* Engine Specs Footer */}
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      <span>Depth: {liveEvaluation.depth}/{liveEvaluation.maxDepth}</span>
                      <span>Speed: {(liveEvaluation.nodesPerSecond / 1000000).toFixed(1)}M nps</span>
                      <span>Nodes: {liveEvaluation.totalNodes.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Game Review (Side-by-Side Board & Chess.com Game Review Sidebar) */}
        {activeTab === 'review' && (
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden">
            {/* Left: Interactive Board */}
            <div className="lg:col-span-7 h-full flex flex-col min-h-0">
              <InteractiveBoard
                game={chessInstance}
                scoreCp={activeScoreCp}
                mate={liveEvaluation.mate}
                isFlipped={isFlipped}
                bestMove={currentPositionBestMove}
                secondaryMoves={liveEvaluation.lines.slice(1).map((l) => l.bestMove || l.bestMoveSan || '')}
                currentAnalysis={currentAnalysis}
                currentPly={currentPly}
                totalPlies={analyses.length}
                isPlaying={isPlaying}
                isMuted={isMuted}
                players={players}
                onRetryMove={() => {
                  if (currentPly > 0) goToPly(currentPly - 1);
                }}
                onMakeMove={handleMakeMove}
                onFirst={() => goToPly(0)}
                onPrev={() => goToPly(currentPly - 1)}
                onNext={() => goToPly(currentPly + 1)}
                onLast={() => goToPly(analyses.length)}
                onTogglePlay={() => setIsPlaying(!isPlaying)}
                onFlipBoard={() => setIsFlipped(!isFlipped)}
                onToggleMute={() => {
                  const next = !isMuted;
                  setIsMuted(next);
                  sounds.setMuted(next);
                }}
              />
            </div>

            {/* Right: CheckMate AI Game Review Panel */}
            <div className="lg:col-span-5 h-full flex flex-col min-h-0 overflow-hidden">
              <GameReviewPanel
                analyses={analyses}
                currentPly={currentPly}
                whiteName={players.white}
                blackName={players.black}
                whiteElo={players.whiteElo}
                blackElo={players.blackElo}
                onSelectPly={(ply) => goToPly(ply)}
                onGoToPuzzles={() => setActiveTab('puzzles')}
              />
            </div>
          </div>
        )}

        {/* Tab 3: Mistake Puzzles */}
        {activeTab === 'puzzles' && (
          <div className="flex-1 min-h-0 w-full overflow-y-auto flex items-center justify-center">
            <MistakePuzzlePlayer blunders={blunderList} />
          </div>
        )}
      </main>

      {/* Platform 1-Click Sync Modal */}
      <PlatformSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        onSelectGame={(pgn, title) => {
          loadPgnIntoState(pgn, title);
          setActiveTab('board');
        }}
      />

      {/* PGN / FEN Modal */}
      <PGNModal
        isOpen={isPgnModalOpen}
        onClose={() => setIsPgnModalOpen(false)}
        currentPgn={chessInstance.pgn()}
        currentFen={chessInstance.fen()}
        onLoadPgn={(pgn) => {
          loadPgnIntoState(pgn);
          setActiveTab('board');
        }}
        onLoadFen={(fen) => {
          try {
            const g = new Chess(fen);
            setChessInstance(g);
            setAnalyses([]);
            setCurrentPly(0);
          } catch {
            alert('Invalid FEN');
          }
        }}
      />
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <ChessApp />
    </ThemeProvider>
  );
}

export default App;

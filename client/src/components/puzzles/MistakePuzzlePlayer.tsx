import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  RotateCcw,
  ArrowRight,
  Lightbulb,
  AlertTriangle,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import type { MoveAnalysis } from '../../types/chess';
import { sounds } from '../../utils/sound';
import { useTheme } from '../../context/ThemeContext';

interface MistakePuzzlePlayerProps {
  blunders: MoveAnalysis[];
}

const FALLBACK_BLUNDER: MoveAnalysis = {
  ply: 24,
  san: 'Qe7',
  from: 'd8',
  to: 'e7',
  fenBefore: 'r1bqk2r/pppp1ppp/2n5/4p3/1bB1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 5',
  fenAfter: 'r1bqk2r/pppp1ppp/2n5/4p3/1bB1P3/2N2N2/PPPP1PPP/R1BQK2R b KQkq - 5 5',
  evalBefore: 50,
  evalAfter: -320,
  winPercentBefore: 52,
  winPercentAfter: 18,
  deltaWinPercent: -34,
  classification: 'blunder',
  bestMove: 'Nxe5',
  bestMoveUci: 'f3e5',
  tacticalMotifs: ['fork', 'hanging_piece'],
  playerIntent: 'Attempting to develop Queen and protect e5 pawn.',
};

/**
 * Robustly checks if a played move matches the engine's target best move.
 * Handles SAN strings ('Nxe5'), UCI strings ('f3e5'), and square coordinate parity.
 */
function isBestMove(
  gameBefore: Chess,
  userMove: { from: string; to: string; san: string; promotion?: string },
  bestMoveSan?: string,
  bestMoveUci?: string
): boolean {
  if (!bestMoveSan && !bestMoveUci) return true;

  // 1. Direct SAN match
  if (bestMoveSan && userMove.san.trim() === bestMoveSan.trim()) {
    return true;
  }

  // 2. Direct UCI match
  const playedUci = `${userMove.from}${userMove.to}${userMove.promotion || ''}`.toLowerCase();
  if (bestMoveUci && bestMoveUci.toLowerCase().startsWith(playedUci.slice(0, 4))) {
    return true;
  }

  // 3. If bestMoveSan is formatted in UCI (e.g. 'e2e4')
  if (bestMoveSan && /^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(bestMoveSan.trim())) {
    if (bestMoveSan.trim().toLowerCase().startsWith(playedUci.slice(0, 4))) {
      return true;
    }
  }

  // 4. Try making bestMoveSan on a clone of the initial board to get exact source/target squares
  if (bestMoveSan) {
    try {
      const sim = new Chess(gameBefore.fen());
      const simMove = sim.move(bestMoveSan.trim());
      if (simMove && simMove.from === userMove.from && simMove.to === userMove.to) {
        return true;
      }
    } catch {
      // Ignore notation parse errors on simulator
    }
  }

  return false;
}

export const MistakePuzzlePlayer: React.FC<MistakePuzzlePlayerProps> = ({ blunders }) => {
  const { isDark } = useTheme();
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [hintLevel, setHintLevel] = useState(0);
  const [solved, setSolved] = useState(false);
  const [solvedPuzzles, setSolvedPuzzles] = useState<Set<number>>(new Set());
  const [errorStatus, setErrorStatus] = useState<{ type: 'blunder' | 'suboptimal'; message: string } | null>(null);

  const activeBlunders = useMemo(() => {
    return blunders.length > 0 ? blunders : [FALLBACK_BLUNDER];
  }, [blunders]);

  const currentBlunder: MoveAnalysis = activeBlunders[puzzleIndex] || FALLBACK_BLUNDER;

  const [puzzleGame, setPuzzleGame] = useState(() => new Chess(currentBlunder.fenBefore));

  // Sync board and state when blunders prop changes (e.g. game loaded or analyzed)
  useEffect(() => {
    setPuzzleIndex(0);
    setSolved(false);
    setSolvedPuzzles(new Set());
    setErrorStatus(null);
    setHintLevel(0);
    const initialBlunder = blunders.length > 0 ? blunders[0] : FALLBACK_BLUNDER;
    setPuzzleGame(new Chess(initialBlunder.fenBefore));
  }, [blunders]);

  // Load a specific puzzle index
  const loadPuzzle = useCallback(
    (index: number) => {
      const targetBlunder = activeBlunders[index] || FALLBACK_BLUNDER;
      setPuzzleIndex(index);
      setPuzzleGame(new Chess(targetBlunder.fenBefore));
      setSolved(solvedPuzzles.has(index));
      setErrorStatus(null);
      setHintLevel(0);
    },
    [activeBlunders, solvedPuzzles]
  );

  const handleResetPuzzle = () => {
    setPuzzleGame(new Chess(currentBlunder.fenBefore));
    setSolved(false);
    setErrorStatus(null);
    setHintLevel(0);
  };

  const handleNextPuzzle = () => {
    if (activeBlunders.length > 0) {
      const nextIdx = (puzzleIndex + 1) % activeBlunders.length;
      loadPuzzle(nextIdx);
    }
  };

  const handlePieceDrop = (sourceSquare: string, targetSquare: string): boolean => {
    if (solved) return false;

    try {
      const clone = new Chess(puzzleGame.fen());
      const move = clone.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      if (!move) {
        return false;
      }

      // 1. Check if user played the exact game blunder
      const isBlunderPlayed =
        move.san === currentBlunder.san ||
        `${sourceSquare}${targetSquare}` === `${currentBlunder.from}${currentBlunder.to}`;

      if (isBlunderPlayed) {
        sounds.playBlunder();
        setErrorStatus({
          type: 'blunder',
          message: `That was the match blunder (${move.san})! Look for the tactical refutation that turns this game around.`,
        });
        return false;
      }

      // 2. Validate against engine best move
      const isCorrect = isBestMove(puzzleGame, move, currentBlunder.bestMove, currentBlunder.bestMoveUci);

      if (!isCorrect) {
        sounds.playMove();
        setErrorStatus({
          type: 'suboptimal',
          message: `${move.san} is legal, but not the engine's best continuation. Try again or check a hint!`,
        });
        return false;
      }

      // 3. User played the correct best move!
      setPuzzleGame(clone);
      sounds.playBrilliant();
      setSolved(true);
      setSolvedPuzzles((prev) => new Set(prev).add(puzzleIndex));
      setErrorStatus(null);

      confetti({
        particleCount: 60,
        spread: 65,
        origin: { y: 0.65 },
      });

      return true;
    } catch {
      return false;
    }
  };

  // Board orientation follows the active turn of the puzzle position
  const boardOrientation: 'white' | 'black' = puzzleGame.turn() === 'w' ? 'white' : 'black';

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-5xl mx-auto p-4 select-none w-full">
      {/* Board */}
      <div className="w-full max-w-[460px] mx-auto aspect-square rounded-2xl overflow-hidden shadow-2xl border border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 transition-colors">
        <Chessboard
          options={{
            position: puzzleGame.fen(),
            boardOrientation,
            darkSquareStyle: { backgroundColor: isDark ? '#1e324d' : '#3e628d' },
            lightSquareStyle: { backgroundColor: isDark ? '#d8e4f2' : '#e8f1fa' },
            animationDurationInMs: 200,
            allowDragging: !solved,
            onPieceDrop: ({ sourceSquare, targetSquare }) => {
              if (!sourceSquare || !targetSquare) return false;
              return handlePieceDrop(sourceSquare, targetSquare);
            },
          }}
        />
      </div>

      {/* Right Exercise Card */}
      <div className="flex-1 flex flex-col justify-between bg-white dark:bg-[#0d172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm transition-colors space-y-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-500/20 border border-red-200 dark:border-red-500/40 flex items-center justify-center text-red-600 dark:text-red-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Retrain Your Mistake
                  {solved && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      SOLVED
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Puzzle {puzzleIndex + 1} of {activeBlunders.length} • {solvedPuzzles.size} Solved
                </p>
              </div>
            </div>

            <button
              onClick={handleResetPuzzle}
              title="Reset Position"
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Zero Blunders Note (if playing fallback) */}
          {blunders.length === 0 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-800 dark:text-amber-300">
              <span className="font-bold">No blunders found in current game:</span> Practicing demo mistake below. Load or sync another match to practice your own mistakes!
            </div>
          )}

          {/* Prompt banner */}
          <div className="p-3.5 bg-slate-50 dark:bg-[#132038] border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">The match situation:</div>
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              In this position, <span className="text-red-600 dark:text-red-400 font-bold">{currentBlunder.san}</span> was played (a {currentBlunder.classification.replace(/_/g, ' ')}).
            </div>
            <div className="text-xs text-sky-600 dark:text-sky-400 font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Playing as {boardOrientation === 'white' ? 'White' : 'Black'}: Find the winning refutation on the board!</span>
            </div>
          </div>

          {/* Feedback states */}
          {errorStatus && (
            <div
              className={`p-3 border text-xs rounded-xl flex items-center gap-2.5 transition-all animate-in fade-in duration-200 ${
                errorStatus.type === 'blunder'
                  ? 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300'
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorStatus.message}</span>
            </div>
          )}

          {solved && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/60 rounded-xl space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>Solved! Brilliant find!</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                You successfully found the engine's top tactical refutation: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{currentBlunder.bestMove || 'Top move'}</strong>.
              </p>
              {currentBlunder.playerIntent && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                  Note: {currentBlunder.playerIntent}
                </p>
              )}
            </div>
          )}

          {/* Progressive Hints */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                Hints ({hintLevel}/3)
              </span>
              {hintLevel < 3 && !solved && (
                <button
                  onClick={() => setHintLevel((h) => Math.min(3, h + 1))}
                  className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition cursor-pointer font-bold"
                >
                  + Reveal Hint
                </button>
              )}
            </div>

            {hintLevel >= 1 && (
              <div className="text-xs p-2.5 bg-slate-50 dark:bg-[#132038] border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 animate-in fade-in duration-150">
                <span className="text-amber-600 dark:text-amber-400 font-bold">Hint 1: </span>
                Look for an active tactical piece strike near the center or opposing king.
              </div>
            )}

            {hintLevel >= 2 && (
              <div className="text-xs p-2.5 bg-slate-50 dark:bg-[#132038] border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 animate-in fade-in duration-150">
                <span className="text-amber-600 dark:text-amber-400 font-bold">Hint 2 (Tactical Theme): </span>
                {currentBlunder.tacticalMotifs && currentBlunder.tacticalMotifs.length > 0
                  ? currentBlunder.tacticalMotifs.map((m) => m.replace(/_/g, ' ')).join(', ')
                  : 'Exploit the misplaced piece and seize tactical initiative.'}
              </div>
            )}

            {hintLevel >= 3 && currentBlunder.bestMove && (
              <div className="text-xs p-2.5 bg-sky-50 dark:bg-sky-950/40 border border-sky-300 dark:border-sky-800 rounded-lg text-sky-800 dark:text-sky-300 font-mono animate-in fade-in duration-150">
                <span className="text-sky-700 dark:text-sky-400 font-bold">Hint 3 (Best Move): </span>
                Play {currentBlunder.bestMove}
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        {activeBlunders.length > 1 && (
          <button
            onClick={handleNextPuzzle}
            className={`w-full py-2.5 text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer ${
              solved
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'
            }`}
          >
            <span>{solved ? 'Next Puzzle Workout' : 'Skip to Next Puzzle'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

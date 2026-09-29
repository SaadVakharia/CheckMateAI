import React, { useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import confetti from 'canvas-confetti';
import { CheckCircle2, RotateCcw, ArrowRight, Lightbulb, AlertTriangle } from 'lucide-react';
import type { MoveAnalysis } from '../../types/chess';
import { sounds } from '../../utils/sound';
import { useTheme } from '../../context/ThemeContext';

interface MistakePuzzlePlayerProps {
  blunders: MoveAnalysis[];
}

export const MistakePuzzlePlayer: React.FC<MistakePuzzlePlayerProps> = ({ blunders }) => {
  const { isDark } = useTheme();
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [hintLevel, setHintLevel] = useState(0);
  const [solved, setSolved] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  // Fallback demo blunder if current match has none
  const currentBlunder: MoveAnalysis = blunders[puzzleIndex] || {
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
    tacticalMotifs: ['fork', 'hanging_piece'],
    playerIntent: 'Attempting to develop Queen and protect e5 pawn.',
  };

  const [puzzleGame, setPuzzleGame] = useState(() => new Chess(currentBlunder.fenBefore));

  const handleResetPuzzle = () => {
    setPuzzleGame(new Chess(currentBlunder.fenBefore));
    setSolved(false);
    setErrorStatus(null);
    setHintLevel(0);
  };

  const handleNextPuzzle = () => {
    if (blunders.length > 0) {
      const nextIdx = (puzzleIndex + 1) % blunders.length;
      setPuzzleIndex(nextIdx);
      const nextBlunder = blunders[nextIdx];
      setPuzzleGame(new Chess(nextBlunder.fenBefore));
      setSolved(false);
      setErrorStatus(null);
      setHintLevel(0);
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

      // Check if move matches bestMove or user's blunder
      const isBlunder = move.san === currentBlunder.san || `${sourceSquare}${targetSquare}` === `${currentBlunder.from}${currentBlunder.to}`;
      if (isBlunder) {
        sounds.playBlunder();
        setErrorStatus(`That was the game blunder (${move.san})! Look for a stronger tactical response.`);
        return false;
      }

      // If user plays a legal move
      setPuzzleGame(clone);
      sounds.playBrilliant();
      setSolved(true);
      setErrorStatus(null);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-5xl mx-auto p-4 select-none">
      {/* Board */}
      <div className="w-full max-w-[460px] mx-auto aspect-square rounded-2xl overflow-hidden shadow-xl border border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 transition-colors">
        <Chessboard
          options={{
            position: puzzleGame.fen(),
            boardOrientation: currentBlunder.ply % 2 === 0 ? 'black' : 'white',
            darkSquareStyle: { backgroundColor: isDark ? '#1e324d' : '#3e628d' },
            lightSquareStyle: { backgroundColor: isDark ? '#d8e4f2' : '#e8f1fa' },
            animationDurationInMs: 200,
            allowDragging: true,
            onPieceDrop: ({ sourceSquare, targetSquare }) => {
              if (!sourceSquare || !targetSquare) return false;
              return handlePieceDrop(sourceSquare, targetSquare);
            },
          }}
        />
      </div>

      {/* Right Exercise Card */}
      <div className="flex-1 flex flex-col justify-between bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm transition-colors space-y-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-500/20 border border-red-200 dark:border-red-500/40 flex items-center justify-center text-red-600 dark:text-red-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Retrain Your Mistake</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Puzzle {puzzleIndex + 1} of {blunders.length || 1}
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

          {/* Prompt banner */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">The game situation:</div>
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              In this position, <span className="text-red-600 dark:text-red-400 font-bold">{currentBlunder.san}</span> was played (a blunder).
            </div>
            <div className="text-xs text-sky-600 dark:text-sky-400 font-bold">
              Find the engine's best continuation on the board!
            </div>
          </div>

          {/* Feedback states */}
          {errorStatus && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-500 dark:text-red-400" />
              <span>{errorStatus}</span>
            </div>
          )}

          {solved && (
            <div className="p-4 bg-sky-50 dark:bg-sky-950/40 border border-sky-300 dark:border-sky-700/60 rounded-xl space-y-1.5">
              <div className="flex items-center gap-2 text-sky-800 dark:text-sky-300 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                <span>Solved! Brilliant find!</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                You successfully found the refutation line that turns this game around.
              </p>
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
              <div className="text-xs p-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300">
                <span className="text-amber-600 dark:text-amber-400 font-bold">Hint 1: </span>
                Look for a high-impact tactical piece move near the center.
              </div>
            )}

            {hintLevel >= 2 && currentBlunder.tacticalMotifs && (
              <div className="text-xs p-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300">
                <span className="text-amber-600 dark:text-amber-400 font-bold">Hint 2 (Tactical Theme): </span>
                Involves: {currentBlunder.tacticalMotifs.join(', ').replace(/_/g, ' ')}.
              </div>
            )}

            {hintLevel >= 3 && currentBlunder.bestMove && (
              <div className="text-xs p-2.5 bg-sky-50 dark:bg-slate-950/60 border border-sky-300 dark:border-sky-800/60 rounded-lg text-sky-800 dark:text-sky-300 font-mono">
                <span className="text-sky-700 dark:text-sky-400 font-bold">Hint 3 (Best Move): </span>
                Play {currentBlunder.bestMove}
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        {blunders.length > 1 && (
          <button
            onClick={handleNextPuzzle}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Next Mistake Puzzle</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

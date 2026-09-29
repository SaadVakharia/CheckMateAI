import React from 'react';
import { centipawnsToWinPercent } from '../../analyzer/evaluator';

interface EvalBarProps {
  scoreCp: number; // Centipawns from White's perspective
  mate?: number;   // Mate in N moves
  isFlipped?: boolean;
}

export const EvalBar: React.FC<EvalBarProps> = ({ scoreCp, mate, isFlipped = false }) => {
  // Convert score to White win percentage (0 to 100)
  let whitePercent: number;

  if (mate !== undefined && mate !== null) {
    whitePercent = mate > 0 ? 100 : 0;
  } else {
    whitePercent = centipawnsToWinPercent(scoreCp);
  }

  // Display text
  let evalText = '';
  if (mate !== undefined && mate !== null) {
    evalText = `M${Math.abs(mate)}`;
  } else {
    const pawns = (Math.abs(scoreCp) / 100).toFixed(1);
    evalText = scoreCp > 0 ? `+${pawns}` : scoreCp < 0 ? `-${pawns}` : '0.0';
  }

  // Bar fill height depending on orientation
  const fillPercentage = isFlipped ? 100 - whitePercent : whitePercent;

  return (
    <div className="relative flex flex-col items-center justify-between w-6 sm:w-7 h-full min-h-0 bg-slate-800 dark:bg-slate-900 border border-slate-300 dark:border-slate-700/60 rounded-lg overflow-hidden shadow-md select-none transition-colors">

      {/* Top indicator (Black advantage if not flipped) */}
      <div className={`z-10 text-[10px] font-bold px-0.5 py-1 ${fillPercentage < 50 ? 'text-white' : 'text-slate-900'}`}>
        {!isFlipped && scoreCp < 0 ? evalText : ''}
      </div>

      {/* Dynamic Bar background */}
      <div className="absolute inset-0 flex flex-col justify-end w-full h-full bg-slate-700 dark:bg-slate-800">
        <div
          className="w-full bg-slate-100 dark:bg-slate-200 transition-all duration-300 ease-out"
          style={{ height: `${fillPercentage}%` }}
        />
      </div>

      {/* Bottom indicator (White advantage if not flipped) */}
      <div className={`z-10 text-[10px] font-bold px-0.5 py-1 ${fillPercentage >= 50 ? 'text-slate-900' : 'text-white'}`}>
        {!isFlipped && scoreCp >= 0 ? evalText : isFlipped && scoreCp < 0 ? evalText : ''}
      </div>
    </div>
  );
};


import React, { useEffect, useRef, useState } from 'react';
import type { MoveAnalysis } from '../../types/chess';
import { ClassificationBadge } from '../common/ClassificationBadge';
import { Filter } from 'lucide-react';

interface MoveTableProps {
  analyses: MoveAnalysis[];
  currentPly: number;
  onSelectPly: (ply: number) => void;
}

export const MoveTable: React.FC<MoveTableProps> = ({ analyses, currentPly, onSelectPly }) => {
  const [filterMistakes, setFilterMistakes] = useState(false);
  const activeRowRef = useRef<HTMLButtonElement | null>(null);

  // Auto-scroll to active move
  useEffect(() => {
    if (activeRowRef.current) {
      activeRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentPly]);

  // Group analyses into turns (White move + Black move)
  const rows: { moveNumber: number; white?: MoveAnalysis; black?: MoveAnalysis }[] = [];
  for (let i = 0; i < analyses.length; i += 2) {
    const moveNumber = Math.floor(i / 2) + 1;
    const white = analyses[i];
    const black = analyses[i + 1];

    if (filterMistakes) {
      const isWhiteMistake = white && (white.classification === 'blunder' || white.classification === 'mistake' || white.classification === 'inaccuracy' || white.classification === 'missed_win');
      const isBlackMistake = black && (black.classification === 'blunder' || black.classification === 'mistake' || black.classification === 'inaccuracy' || black.classification === 'missed_win');
      if (!isWhiteMistake && !isBlackMistake) {
        continue;
      }
    }

    rows.push({
      moveNumber,
      white,
      black,
    });
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs transition-colors select-none">
      {/* Header with Quick Filter */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
        <div className="flex items-center space-x-2">
          <span className="w-6 text-center">#</span>
          <span>Moves</span>
        </div>
        <button
          onClick={() => setFilterMistakes(!filterMistakes)}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
            filterMistakes
              ? 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30'
              : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500'
          }`}
        >
          <Filter className="w-2.5 h-2.5" />
          <span>{filterMistakes ? 'Mistakes' : 'All'}</span>
        </button>
      </div>

      {/* Move Rows */}
      <div className="overflow-y-auto flex-1 min-h-0 p-1 space-y-0.5">
        {rows.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
            No mistakes found in this view.
          </div>
        ) : (
          rows.map((row) => (
            <div key={row.moveNumber} className="flex items-center text-xs py-0.5 rounded hover:bg-slate-100/70 dark:hover:bg-slate-800/40 transition-colors">
              {/* Move number */}
              <span className="w-7 text-center text-slate-400 dark:text-slate-500 font-mono font-medium text-[11px] shrink-0">
                {row.moveNumber}.
              </span>

              {/* White move */}
              <div className="w-[46%] pr-1">
                {row.white && (
                  <button
                    ref={row.white.ply === currentPly ? activeRowRef : null}
                    onClick={() => onSelectPly(row.white!.ply)}
                    className={`w-full flex items-center justify-between px-2 py-1 rounded transition text-left cursor-pointer ${
                      row.white.ply === currentPly
                        ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-500/30 shadow-2xs'
                        : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="font-mono text-[11px]">{row.white.san}</span>
                    <ClassificationBadge classification={row.white.classification} size="xs" />
                  </button>
                )}
              </div>

              {/* Black move */}
              <div className="w-[46%] pr-1">
                {row.black && (
                  <button
                    ref={row.black.ply === currentPly ? activeRowRef : null}
                    onClick={() => onSelectPly(row.black!.ply)}
                    className={`w-full flex items-center justify-between px-2 py-1 rounded transition text-left cursor-pointer ${
                      row.black.ply === currentPly
                        ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-500/30 shadow-2xs'
                        : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="font-mono text-[11px]">{row.black.san}</span>
                    <ClassificationBadge classification={row.black.classification} size="xs" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

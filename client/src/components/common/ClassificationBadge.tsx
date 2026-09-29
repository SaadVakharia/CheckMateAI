import React from 'react';
import type { MoveClassification } from '../../types/chess';
import { CLASSIFICATION_CONFIG } from '../../analyzer/evaluator';

interface ClassificationBadgeProps {
  classification: MoveClassification;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const ClassificationBadge: React.FC<ClassificationBadgeProps> = ({
  classification,
  size = 'sm',
  showLabel = false,
  className = '',
}) => {
  const meta = CLASSIFICATION_CONFIG[classification] || CLASSIFICATION_CONFIG.good;

  const sizeClasses = {
    xs: 'w-4 h-4 text-[9px]',
    sm: 'w-5 h-5 text-[10px]',
    md: 'w-6 h-6 text-xs',
    lg: 'w-7 h-7 text-sm font-black',
  };

  const badgeBg: Record<MoveClassification, string> = {
    brilliant: 'bg-cyan-500 text-white shadow-cyan-500/50',
    great: 'bg-blue-500 text-white shadow-blue-500/50',
    best: 'bg-emerald-500 text-white shadow-emerald-500/50',
    excellent: 'bg-teal-500 text-white shadow-teal-500/50',
    good: 'bg-slate-400 text-white',
    book: 'bg-purple-600 text-white shadow-purple-500/50',
    inaccuracy: 'bg-amber-400 text-slate-900 shadow-amber-400/40',
    mistake: 'bg-orange-500 text-white shadow-orange-500/50',
    blunder: 'bg-red-600 text-white shadow-red-600/50',
    missed_win: 'bg-rose-600 text-white shadow-rose-600/50',
  };

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <span
        title={`${meta.label}: ${meta.description}`}
        className={`inline-flex items-center justify-center rounded-full font-black select-none shadow-xs border border-white/40 dark:border-slate-900/40 shrink-0 ${sizeClasses[size]} ${badgeBg[classification]}`}
      >
        {meta.badge}
      </span>
      {showLabel && (
        <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
          {meta.label}
        </span>
      )}
    </div>
  );
};

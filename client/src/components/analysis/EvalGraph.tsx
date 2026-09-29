import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { MoveAnalysis, MoveClassification } from '../../types/chess';
import { useTheme } from '../../context/ThemeContext';
import { ClassificationBadge } from '../common/ClassificationBadge';
import { CLASSIFICATION_CONFIG } from '../../analyzer/evaluator';

interface EvalGraphProps {
  analyses: MoveAnalysis[];
  currentPly: number;
  onSelectPly: (ply: number) => void;
}

export const EvalGraph: React.FC<EvalGraphProps> = ({ analyses, currentPly, onSelectPly }) => {
  const { isDark } = useTheme();

  // Transform analysis records for Recharts (memoized to prevent render loops)
  const data = useMemo(() => {
    return analyses.map((m) => {
      // Clamp centipawns between -1000 and +1000 for realistic charting (-10 to +10 pawns)
      const clampedCp = Math.max(-1000, Math.min(1000, m.evalAfter));
      const pawnScore = Math.round((clampedCp / 100) * 10) / 10;

      return {
        ply: m.ply,
        moveNumber: Math.ceil(m.ply / 2),
        san: m.san,
        score: pawnScore,
        classification: m.classification,
        isCurrent: m.ply === currentPly,
        playerIntent: m.playerIntent,
      };
    });
  }, [analyses, currentPly]);

  // Custom dot rendering for blunders, mistakes, brilliant moves, and active ply
  const renderCustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!cx || !cy || !payload) return null;

    const isCurrent = payload.ply === currentPly;
    const cls = payload.classification;

    // Active current ply ring
    if (isCurrent) {
      return (
        <g key={`dot-${payload.ply}`}>
          <circle cx={cx} cy={cy} r={7} fill={isDark ? '#06b6d4' : '#0284c7'} fillOpacity={0.35} />
          <circle cx={cx} cy={cy} r={3.5} fill="#06b6d4" stroke="#ffffff" strokeWidth={1.5} />
        </g>
      );
    }

    // Blunder / Missed Win dot
    if (cls === 'blunder' || cls === 'missed_win') {
      return (
        <circle
          key={`dot-${payload.ply}`}
          cx={cx}
          cy={cy}
          r={3.5}
          fill="#ef4444"
          stroke="#ffffff"
          strokeWidth={1}
          className="cursor-pointer"
        />
      );
    }

    // Mistake dot
    if (cls === 'mistake') {
      return (
        <circle
          key={`dot-${payload.ply}`}
          cx={cx}
          cy={cy}
          r={3}
          fill="#f97316"
          stroke="#ffffff"
          strokeWidth={1}
          className="cursor-pointer"
        />
      );
    }

    // Brilliant diamond
    if (cls === 'brilliant') {
      return (
        <polygon
          key={`dot-${payload.ply}`}
          points={`${cx},${cy - 4} ${cx + 4},${cy} ${cx},${cy + 4} ${cx - 4},${cy}`}
          fill="#06b6d4"
          stroke="#ffffff"
          strokeWidth={1}
          className="cursor-pointer"
        />
      );
    }

    return null;
  };

  return (
    <div className="w-full h-24 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-2 flex flex-col justify-between shadow-xs transition-colors shrink-0 select-none">
      <div className="flex items-center justify-between text-[11px] px-1 text-slate-500 dark:text-slate-400">
        <span className="font-semibold text-slate-800 dark:text-slate-300">Advantage Flow</span>
        <div className="flex items-center space-x-2.5 text-[10px]">
          <span className="flex items-center gap-1 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> White +
          </span>
          <span className="flex items-center gap-1 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" /> Black -
          </span>
          <span className="flex items-center gap-1 font-medium text-red-500">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" /> Blunder
          </span>
          <span className="flex items-center gap-1 font-medium text-cyan-500">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block" /> Brilliant
          </span>
        </div>
      </div>

      <div className="w-full h-16">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            onClick={(e: any) => {
              if (e && e.activePayload && e.activePayload.length > 0) {
                const ply = e.activePayload[0].payload.ply;
                onSelectPly(ply);
              }
            }}
            margin={{ top: 4, right: 8, left: -25, bottom: 0 }}
          >
            <defs>
              <linearGradient id="evalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isDark ? '#10b981' : '#059669'} stopOpacity={0.6} />
                <stop offset="50%" stopColor="#64748b" stopOpacity={0.08} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.6} />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="moveNumber"
              stroke={isDark ? '#475569' : '#94a3b8'}
              fontSize={9}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[-8, 8]}
              stroke={isDark ? '#475569' : '#94a3b8'}
              fontSize={9}
              tickLine={false}
              ticks={[-5, 0, 5]}
            />
            <ReferenceLine y={0} stroke={isDark ? '#64748b' : '#cbd5e1'} strokeDasharray="3 3" opacity={0.6} />

            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const p = payload[0].payload;
                  const meta = p.classification ? CLASSIFICATION_CONFIG[p.classification as MoveClassification] : null;
                  return (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded-lg text-xs shadow-xl select-none">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">
                          Move {p.moveNumber}: {p.san}
                        </span>
                        <ClassificationBadge classification={p.classification} size="xs" />
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-1 text-[11px]">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Evaluation:</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {p.score > 0 ? `+${p.score}` : p.score}
                        </span>
                      </div>
                      {meta && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {meta.label}
                        </p>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />

            <Area
              type="monotone"
              dataKey="score"
              stroke={isDark ? '#38bdf8' : '#0284c7'}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#evalGradient)"
              dot={renderCustomDot}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

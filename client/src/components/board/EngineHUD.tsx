import React, { useState } from 'react';
import { Cpu, Zap, StopCircle, RefreshCw, Layers, Sliders } from 'lucide-react';
import type { EngineEvaluation } from '../../engine/stockfishWorker';

interface EngineHUDProps {
  evaluation: EngineEvaluation;
  isScanning: boolean;
  scanProgress: number; // 0 to 100
  currentScanPly: number;
  totalScanPlies: number;
  currentScanSan?: string;
  autoReviewEnabled?: boolean;
  onToggleAutoReview?: () => void;
  multiPvCount: number;
  onSetMultiPv: (count: number) => void;
  onStartDeepScan: (depth: number) => void;
  onCancelScan: () => void;
  hideLines?: boolean;
}

export const EngineHUD: React.FC<EngineHUDProps> = ({
  evaluation,
  isScanning,
  scanProgress,
  currentScanPly,
  totalScanPlies,
  currentScanSan,
  autoReviewEnabled = true,
  onToggleAutoReview,
  multiPvCount,
  onSetMultiPv,
  onStartDeepScan,
  onCancelScan,
  hideLines = false,
}) => {
  const [targetScanDepth, setTargetScanDepth] = useState<number>(10);
  const [showConfig, setShowConfig] = useState<boolean>(false);

  // Format node count
  const formattedNodes = evaluation.totalNodes > 1000000
    ? `${(evaluation.totalNodes / 1000000).toFixed(2)}M nodes`
    : evaluation.totalNodes > 1000
    ? `${(evaluation.totalNodes / 1000).toFixed(0)}k nodes`
    : null;

  return (
    <div className="w-full bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 shadow-xs transition-colors select-none">
      {/* Top telemetry bar */}
      <div className="flex items-center justify-between text-xs">
        {/* Left: Engine indicator & status */}
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400">
            <Cpu className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 text-[11px]">
              <span>Stockfish 19 WASM</span>
              {isScanning ? (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500" />
                </span>
              ) : evaluation.isSearching ? (
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
              )}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span>
                Depth: <strong className="text-slate-700 dark:text-slate-300">{isScanning ? targetScanDepth : evaluation.depth}</strong>/{isScanning ? targetScanDepth : evaluation.maxDepth}
              </span>
              {evaluation.nodesPerSecond > 0 && (
                <span>• {(evaluation.nodesPerSecond / 1000000).toFixed(1)}M nps</span>
              )}
              {formattedNodes && <span>• {formattedNodes}</span>}
            </div>
          </div>
        </div>

        {/* Right: Controls & Actions */}
        <div className="flex items-center space-x-2">
          {/* Auto Deep Review Toggle */}
          {onToggleAutoReview && (
            <button
              onClick={onToggleAutoReview}
              title={autoReviewEnabled ? "Auto Deep Review is ON (Automatically reviews loaded games)" : "Auto Deep Review is OFF"}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer border ${
                autoReviewEnabled
                  ? 'bg-sky-500/10 border-sky-500/30 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20'
                  : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/60 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <Zap className={`w-2.5 h-2.5 ${autoReviewEnabled ? 'fill-current text-sky-500' : 'text-slate-400'}`} />
              <span className="hidden sm:inline">Auto</span>
              <span className={`text-[8.5px] px-1 py-0.2 rounded font-black tracking-wider ${
                autoReviewEnabled
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
              }`}>
                {autoReviewEnabled ? 'ON' : 'OFF'}
              </span>
            </button>
          )}

          {/* Quick MultiPV Toggle */}
          <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700/60 text-[10px] font-semibold">
            <span className="px-1 text-slate-400 dark:text-slate-500 flex items-center gap-0.5">
              <Layers className="w-2.5 h-2.5" />
            </span>
            {[1, 2, 3].map((count) => (
              <button
                key={count}
                onClick={() => onSetMultiPv(count)}
                className={`px-1.5 py-0.5 rounded cursor-pointer transition ${
                  multiPvCount === count
                    ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {count}L
              </button>
            ))}
          </div>

          {/* Depth settings trigger */}
          <button
            onClick={() => setShowConfig(!showConfig)}
            title="Configure engine search depth"
            className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          {/* Deep Scan Action */}
          {isScanning ? (
            <div className="flex items-center gap-1.5">
              <div className="px-2.5 py-1 bg-sky-500/15 border border-sky-500/40 text-sky-600 dark:text-sky-400 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs">
                <RefreshCw className="w-3 h-3 animate-spin text-sky-500" />
                <span>{scanProgress}%</span>
              </div>
              <button
                onClick={onCancelScan}
                className="px-2 py-1 bg-red-100 hover:bg-red-200 dark:bg-red-950/60 dark:hover:bg-red-900 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow-xs"
                title="Cancel Scan"
              >
                <StopCircle className="w-3.5 h-3.5 text-red-500" />
                <span className="hidden sm:inline">Cancel</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => onStartDeepScan(targetScanDepth)}
              className="relative group px-3 py-1 bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all duration-150 cursor-pointer shadow-sm hover:shadow-sky-500/25 active:scale-95"
              title="Run full-game deep review using Stockfish 19 WASM"
            >
              <Zap className="w-3.5 h-3.5 fill-current text-cyan-200 group-hover:scale-110 transition-transform" />
              <span>Deep Review</span>
            </button>
          )}
        </div>
      </div>

      {/* Config Drawer for Depth */}
      {showConfig && !isScanning && (
        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Review Scan Depth:</span>
          <div className="flex items-center space-x-1.5">
            {[
              { label: 'Fast (10)', depth: 10 },
              { label: 'Balanced (12)', depth: 12 },
              { label: 'Deep (14)', depth: 14 },
            ].map((cfg) => (
              <button
                key={cfg.depth}
                onClick={() => setTargetScanDepth(cfg.depth)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
                  targetScanDepth === cfg.depth
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cfg.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Prominent High-Visibility Scanning Progress Bar */}
      {isScanning && (
        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800/80 space-y-1.5 animate-fadeIn">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <div className="relative flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping absolute" />
                <span className="w-2 h-2 rounded-full bg-sky-500 relative" />
              </div>
              <span className="text-slate-700 dark:text-slate-200 font-medium">
                Analyzing Ply <strong className="text-slate-900 dark:text-white font-mono font-bold">{currentScanPly}</strong> of <span className="text-slate-500">{totalScanPlies}</span>
              </span>
              {currentScanSan && (
                <span className="px-1.5 py-0.2 rounded bg-sky-500/20 border border-sky-500/30 text-sky-600 dark:text-sky-400 font-mono font-bold text-[10px]">
                  {currentScanSan}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              <span>Depth {targetScanDepth}</span>
              <span>•</span>
              <strong className="text-sky-600 dark:text-sky-400 font-bold">{scanProgress}%</strong>
            </div>
          </div>
          {/* Futuristic Laser Progress Bar with shimmer effect */}
          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative p-0.5 border border-slate-200 dark:border-slate-700/60">
            <div
              className="h-full bg-gradient-to-r from-blue-600 via-sky-400 to-cyan-300 rounded-full transition-all duration-150 ease-out relative overflow-hidden shadow-xs"
              style={{ width: `${Math.max(scanProgress, 4)}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
            </div>
          </div>
        </div>
      )}

      {/* MultiPV Lines Display */}
      {!hideLines && evaluation?.lines && evaluation.lines.length > 0 && !isScanning && (
        <div className="mt-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-800/80 space-y-1">
          {evaluation.lines.slice(0, multiPvCount).map((line, idx) => {
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
                className="flex items-center justify-between text-[11px] hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded px-1 py-0.5 transition"
              >
                <div className="flex items-center space-x-1.5 shrink-0">
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${
                    idx === 0
                      ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}>
                    {evalStr}
                  </span>
                  {line.bestMoveSan && (
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                      {line.bestMoveSan}
                    </span>
                  )}
                </div>
                <span className="font-mono text-slate-500 dark:text-slate-400 text-[10px] truncate max-w-[260px] sm:max-w-[320px] text-right">
                  {line.pv.slice(0, 5).join(' ')}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};


import React, { useState, useEffect, useMemo } from 'react';
import {
  Zap,
  Target,
  Sparkles,
  BookOpen,
  BrainCircuit,
  TrendingUp,
  Play,
} from 'lucide-react';
import type { MoveAnalysis } from '../../types/chess';
import {
  calculateAccuracy,
  calculateACPL,
  estimatePerformanceRating,
} from '../../analyzer/evaluator';
import { identifyOpening } from '../../analyzer/ecoBook';
import { fetchGameReviewSummary, type GameSummaryNarrative } from '../../services/coachApi';
import { EvalGraph } from './EvalGraph';

interface MatchReportViewProps {
  analyses: MoveAnalysis[];
  whiteName: string;
  blackName: string;
  whiteElo?: string;
  blackElo?: string;
  gameTitle: string;
  onProceedToCoach: () => void;
  onGoToPuzzles: () => void;
  onSelectPly: (ply: number) => void;
  isScanning?: boolean;
  scanProgress?: number;
  platformAccuracies?: {
    white?: number;
    black?: number;
  };
}

export const MatchReportView: React.FC<MatchReportViewProps> = ({
  analyses,
  whiteName = 'White',
  blackName = 'Black',
  whiteElo,
  blackElo,
  platformAccuracies,
  gameTitle,
  onProceedToCoach,
  onGoToPuzzles,
  onSelectPly,
  isScanning,
  scanProgress = 0,
}) => {
  const [narrativeData, setNarrativeData] = useState<GameSummaryNarrative | null>(null);
  const [isLoadingNarrative, setIsLoadingNarrative] = useState<boolean>(false);

  const whiteMoves = useMemo(() => analyses.filter((m) => m.ply % 2 !== 0), [analyses]);
  const blackMoves = useMemo(() => analyses.filter((m) => m.ply % 2 === 0), [analyses]);

  const computedWhiteAccuracy = useMemo(() => calculateAccuracy(whiteMoves), [whiteMoves]);
  const computedBlackAccuracy = useMemo(() => calculateAccuracy(blackMoves), [blackMoves]);

  const whiteAccuracy = platformAccuracies?.white !== undefined ? platformAccuracies.white : computedWhiteAccuracy;
  const blackAccuracy = platformAccuracies?.black !== undefined ? platformAccuracies.black : computedBlackAccuracy;

  const whiteAcpl = useMemo(() => calculateACPL(whiteMoves), [whiteMoves]);
  const blackAcpl = useMemo(() => calculateACPL(blackMoves), [blackMoves]);

  const whiteRating = useMemo(() => {
    const base = whiteElo ? parseInt(whiteElo, 10) : undefined;
    return estimatePerformanceRating(whiteAccuracy, whiteAcpl, base);
  }, [whiteElo, whiteAccuracy, whiteAcpl]);

  const blackRating = useMemo(() => {
    const base = blackElo ? parseInt(blackElo, 10) : undefined;
    return estimatePerformanceRating(blackAccuracy, blackAcpl, base);
  }, [blackElo, blackAccuracy, blackAcpl]);

  const openingInfo = useMemo(() => {
    return identifyOpening(analyses.map((a) => a.san));
  }, [analyses]);

  const blunders = useMemo(() => {
    return analyses.filter((m) => m.classification === 'blunder' || m.classification === 'missed_win');
  }, [analyses]);

  // Classification summary breakdown
  const classificationCounts = useMemo(() => {
    const counts: Record<string, { white: number; black: number }> = {
      brilliant: { white: 0, black: 0 },
      great: { white: 0, black: 0 },
      best: { white: 0, black: 0 },
      inaccuracy: { white: 0, black: 0 },
      mistake: { white: 0, black: 0 },
      blunder: { white: 0, black: 0 },
    };

    analyses.forEach((m) => {
      const side = m.ply % 2 !== 0 ? 'white' : 'black';
      if (counts[m.classification]) {
        counts[m.classification][side]++;
      }
    });

    return counts;
  }, [analyses]);

  // Fetch GM Alex Post-Game Story Summary via Gemini AI
  useEffect(() => {
    if (analyses.length < 4 || isScanning) return;

    let isMounted = true;
    setIsLoadingNarrative(true);

    fetchGameReviewSummary({
      title: gameTitle,
      openingName: openingInfo?.name,
      openingEco: openingInfo?.eco,
      whiteAccuracy,
      blackAccuracy,
      whiteAcpl,
      blackAcpl,
      blundersCount: blunders.length,
      moves: analyses.map((m) => ({
        ply: m.ply,
        san: m.san,
        classification: m.classification,
        deltaWinPercent: m.deltaWinPercent,
      })),
    })
      .then((data) => {
        if (isMounted) {
          setNarrativeData(data);
          setIsLoadingNarrative(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoadingNarrative(false);
      });

    return () => {
      isMounted = false;
    };
  }, [analyses.length, gameTitle, openingInfo, whiteAccuracy, blackAccuracy, whiteAcpl, blackAcpl, blunders.length, isScanning]);

  return (
    <div className="flex-1 w-full max-w-6xl mx-auto p-4 sm:p-6 overflow-y-auto space-y-6 select-none">
      {/* Scan in Progress Banner */}
      {isScanning && (
        <div className="p-4 bg-sky-50 dark:bg-[#132038] border border-sky-300 dark:border-sky-800 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-sky-500 animate-pulse" />
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                Deep Stockfish Engine Review in Progress...
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Evaluating move accuracy, tactical motifs, and win probability delta.
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-mono font-bold text-sky-600 dark:text-sky-400">{scanProgress}%</div>
            <div className="text-[10px] text-slate-400">Streaming live</div>
          </div>
        </div>
      )}

      {/* Header Match Card */}
      <div className="p-5 sm:p-6 bg-white dark:bg-[#0d172a] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-sky-400 border border-blue-200 dark:border-blue-900/60 uppercase tracking-wider">
              Match Report
            </span>
            {openingInfo && (
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-sky-500" />
                {openingInfo.name} ({openingInfo.eco})
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {gameTitle}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Full match overview • {analyses.length} Plies Analyzed • {blunders.length} Tactical Blunders Detected
          </p>
        </div>

        {/* Quick Action Navigation */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onProceedToCoach}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start Review</span>
          </button>

          {blunders.length > 0 && (
            <button
              onClick={onGoToPuzzles}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-md shadow-red-500/20 transition flex items-center gap-2 cursor-pointer"
            >
              <Target className="w-4 h-4" />
              <span>Retrain Mistakes ({blunders.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Accuracy Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* White Player */}
        <div className="p-5 bg-white dark:bg-[#0d172a] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm flex items-center justify-between gap-3">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-3.5 h-3.5 rounded-full bg-white border border-slate-400 shadow-xs shrink-0" />
              <span className="text-sm font-bold text-slate-900 dark:text-white truncate">{whiteName}</span>
              {whiteElo && <span className="text-xs font-semibold text-slate-400">({whiteElo})</span>}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Avg Centipawn Loss: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{whiteAcpl} cp</strong>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Est. Performance: <strong className="text-sky-600 dark:text-sky-400 font-bold">{whiteRating}</strong>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {whiteAccuracy}%
            </div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">White Accuracy</span>
          </div>
        </div>

        {/* Black Player */}
        <div className="p-5 bg-white dark:bg-[#0d172a] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm flex items-center justify-between gap-3">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-3.5 h-3.5 rounded-full bg-slate-900 border border-slate-600 shadow-xs shrink-0" />
              <span className="text-sm font-bold text-slate-900 dark:text-white truncate">{blackName}</span>
              {blackElo && <span className="text-xs font-semibold text-slate-400">({blackElo})</span>}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Avg Centipawn Loss: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{blackAcpl} cp</strong>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Est. Performance: <strong className="text-sky-600 dark:text-sky-400 font-bold">{blackRating}</strong>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {blackAccuracy}%
            </div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Black Accuracy</span>
          </div>
        </div>
      </div>

      {/* GM Alex Post-Game Story Verdict */}
      <div className="p-6 bg-gradient-to-br from-blue-50/90 via-sky-50/50 to-slate-100/70 dark:from-blue-950/20 dark:via-slate-900/60 dark:to-[#0d172a] border border-blue-200/80 dark:border-blue-900/40 rounded-3xl shadow-sm space-y-4 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-600/20 border border-blue-200 dark:border-blue-500/40 flex items-center justify-center text-blue-600 dark:text-sky-400 font-bold">
              <BrainCircuit className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Grandmaster Alex's Story Review
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-300/80 dark:border-sky-500/20">
                  AI PEDAGOGY
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Post-match tactical narrative and critical turning point</p>
            </div>
          </div>
        </div>

        {isLoadingNarrative ? (
          <div className="py-6 flex items-center justify-center gap-2 text-xs text-blue-600 dark:text-sky-400">
            <div className="w-4 h-4 border-2 border-blue-600 dark:border-sky-400 border-t-transparent rounded-full animate-spin" />
            <span className="font-medium text-slate-600 dark:text-sky-400">Grandmaster Alex is synthesizing match insights...</span>
          </div>
        ) : narrativeData ? (
          <div className="space-y-4">
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {narrativeData.narrative}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {narrativeData.criticalTurningPoint && (
                <div className="p-3.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl text-xs space-y-1">
                  <div className="font-bold text-amber-600 dark:text-amber-500 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Decisive Turning Point</span>
                  </div>
                  <div className="text-slate-700 dark:text-slate-300">{narrativeData.criticalTurningPoint}</div>
                </div>
              )}

              {narrativeData.keyLesson && (
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl text-xs space-y-1">
                  <div className="font-bold text-emerald-600 dark:text-emerald-500 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Key Training Lesson</span>
                  </div>
                  <div className="text-slate-700 dark:text-slate-300">{narrativeData.keyLesson}</div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Click into move-by-move coaching to inspect individual decisions or explore the advantage chart below.
          </p>
        )}
      </div>

      {/* Move Classification Breakdown */}
      <div className="p-5 sm:p-6 bg-white dark:bg-[#0d172a] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Move Accuracy Breakdown
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-800/40 rounded-xl text-center space-y-0.5">
            <div className="text-xs font-bold text-cyan-600 dark:text-cyan-400">Brilliant (!!)</div>
            <div className="text-base font-black text-cyan-700 dark:text-cyan-300">
              {classificationCounts.brilliant.white + classificationCounts.brilliant.black}
            </div>
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 rounded-xl text-center space-y-0.5">
            <div className="text-xs font-bold text-blue-600 dark:text-blue-400">Great (!)</div>
            <div className="text-base font-black text-blue-700 dark:text-blue-300">
              {classificationCounts.great.white + classificationCounts.great.black}
            </div>
          </div>

          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-center space-y-0.5">
            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Best (★)</div>
            <div className="text-base font-black text-emerald-700 dark:text-emerald-300">
              {classificationCounts.best.white + classificationCounts.best.black}
            </div>
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl text-center space-y-0.5">
            <div className="text-xs font-bold text-amber-600 dark:text-amber-400">Inaccuracy (?!)</div>
            <div className="text-base font-black text-amber-700 dark:text-amber-300">
              {classificationCounts.inaccuracy.white + classificationCounts.inaccuracy.black}
            </div>
          </div>

          <div className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/40 rounded-xl text-center space-y-0.5">
            <div className="text-xs font-bold text-orange-600 dark:text-orange-400">Mistake (?)</div>
            <div className="text-base font-black text-orange-700 dark:text-orange-300">
              {classificationCounts.mistake.white + classificationCounts.mistake.black}
            </div>
          </div>

          <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 rounded-xl text-center space-y-0.5">
            <div className="text-xs font-bold text-red-600 dark:text-red-400">Blunder (??)</div>
            <div className="text-base font-black text-red-700 dark:text-red-300">
              {classificationCounts.blunder.white + classificationCounts.blunder.black}
            </div>
          </div>
        </div>
      </div>

      {/* Advantage Timeline Graph */}
      <div className="p-5 sm:p-6 bg-white dark:bg-[#0d172a] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Evaluation Advantage Flow
          </h3>
          <span className="text-xs text-slate-400">Click any point to jump to that move</span>
        </div>

        <div className="h-44 w-full">
          <EvalGraph analyses={analyses} currentPly={0} onSelectPly={onSelectPly} />
        </div>
      </div>

      {/* Bottom Progression Banner */}
      <div className="p-6 bg-slate-100 dark:bg-[#132038] border border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Continue Analysis</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Inspect the board move-by-move with Grandmaster Alex, or jump straight to the blunder workout.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {blunders.length > 0 && (
            <button
              onClick={onGoToPuzzles}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Skip to Puzzles ({blunders.length})
            </button>
          )}

          <button
            onClick={onProceedToCoach}
            className="flex-1 sm:flex-initial px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/25 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start Review (Move 1)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

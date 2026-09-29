import React, { useState, useMemo, useEffect } from 'react';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  BrainCircuit,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Target,
  Zap,
  BookOpen,
  Filter,
  CheckCircle2,
  AlertCircle,
  Eye,
  BarChart3,
  Layers,
} from 'lucide-react';
import type { MoveAnalysis, MoveClassification } from '../../types/chess';
import {
  CLASSIFICATION_CONFIG,
  calculateAccuracy,
  calculateACPL,
  estimatePerformanceRating,
} from '../../analyzer/evaluator';
import { identifyOpening } from '../../analyzer/ecoBook';
import { fetchGameReviewSummary, type GameSummaryNarrative } from '../../services/coachApi';
import { ClassificationBadge } from '../common/ClassificationBadge';

interface GameReviewPanelProps {
  analyses: MoveAnalysis[];
  currentPly: number;
  onSelectPly: (ply: number) => void;
  onGoToPuzzles: () => void;
  whiteName?: string;
  blackName?: string;
  whiteElo?: string;
  blackElo?: string;
  onStartReview?: () => void;
}

export const GameReviewPanel: React.FC<GameReviewPanelProps> = ({
  analyses,
  currentPly,
  onSelectPly,
  onGoToPuzzles,
  whiteName = 'White',
  blackName = 'Black',
  whiteElo,
  blackElo,
}) => {
  // Navigation & mode states
  const [viewMode, setViewMode] = useState<'report' | 'walkthrough'>('report');
  const [selectedCategory, setSelectedCategory] = useState<MoveClassification | null>(null);
  const [walkthroughIndex, setWalkthroughIndex] = useState<number>(0);
  const [narrativeData, setNarrativeData] = useState<GameSummaryNarrative | null>(null);
  const [isLoadingNarrative, setIsLoadingNarrative] = useState<boolean>(false);

  // In-walkthrough Retry Puzzle state
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [retryResult, setRetryResult] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [showSolution, setShowSolution] = useState<boolean>(false);

  // Separate moves by player
  const whiteMoves = useMemo(() => analyses.filter((m) => m.ply % 2 !== 0), [analyses]);
  const blackMoves = useMemo(() => analyses.filter((m) => m.ply % 2 === 0), [analyses]);

  // Overall Accuracy & ACPL
  const whiteAccuracy = useMemo(() => calculateAccuracy(whiteMoves), [whiteMoves]);
  const blackAccuracy = useMemo(() => calculateAccuracy(blackMoves), [blackMoves]);

  const whiteAcpl = useMemo(() => calculateACPL(whiteMoves), [whiteMoves]);
  const blackAcpl = useMemo(() => calculateACPL(blackMoves), [blackMoves]);

  const whiteRating = useMemo(() => {
    if (whiteElo && parseInt(whiteElo, 10)) return parseInt(whiteElo, 10);
    return estimatePerformanceRating(whiteAccuracy, whiteAcpl);
  }, [whiteElo, whiteAccuracy, whiteAcpl]);

  const blackRating = useMemo(() => {
    if (blackElo && parseInt(blackElo, 10)) return parseInt(blackElo, 10);
    return estimatePerformanceRating(blackAccuracy, blackAcpl);
  }, [blackElo, blackAccuracy, blackAcpl]);

  // Phase Accuracies: Opening (1-20), Middlegame (21-40), Endgame (41+)
  const phaseStats = useMemo(() => {
    const openingMoves = analyses.filter((m) => m.ply <= 20);
    const middleMoves = analyses.filter((m) => m.ply > 20 && m.ply <= 40);
    const endMoves = analyses.filter((m) => m.ply > 40);

    return {
      opening: {
        white: calculateAccuracy(openingMoves.filter((m) => m.ply % 2 !== 0)),
        black: calculateAccuracy(openingMoves.filter((m) => m.ply % 2 === 0)),
      },
      middlegame: {
        white: calculateAccuracy(middleMoves.filter((m) => m.ply % 2 !== 0)),
        black: calculateAccuracy(middleMoves.filter((m) => m.ply % 2 === 0)),
        hasMoves: middleMoves.length > 0,
      },
      endgame: {
        white: calculateAccuracy(endMoves.filter((m) => m.ply % 2 !== 0)),
        black: calculateAccuracy(endMoves.filter((m) => m.ply % 2 === 0)),
        hasMoves: endMoves.length > 0,
      },
    };
  }, [analyses]);

  // Identify opening
  const opening = useMemo(() => identifyOpening(analyses.map((m) => m.san)), [analyses]);

  // Key moments (Blunders, Missed Wins, Mistakes, Inaccuracies, Brilliant)
  const keyMoments = useMemo(() => {
    return analyses.filter(
      (m) =>
        m.classification === 'blunder' ||
        m.classification === 'missed_win' ||
        m.classification === 'mistake' ||
        m.classification === 'brilliant' ||
        m.classification === 'great' ||
        m.classification === 'inaccuracy'
    );
  }, [analyses]);

  // Load GM Narrative on match load
  useEffect(() => {
    let isCancelled = false;
    async function loadSummary() {
      if (analyses.length < 4) return;
      setIsLoadingNarrative(true);
      try {
        const result = await fetchGameReviewSummary({
          whiteAccuracy,
          blackAccuracy,
          whiteAcpl,
          blackAcpl,
          openingName: opening.name,
          openingEco: opening.eco,
          blundersCount: keyMoments.filter((m) => m.classification === 'blunder').length,
          moves: analyses.map((m) => ({
            ply: m.ply,
            san: m.san,
            classification: m.classification,
            deltaWinPercent: m.deltaWinPercent,
          })),
        });
        if (!isCancelled) {
          setNarrativeData(result);
        }
      } catch {
        // fallback gracefully
      } finally {
        if (!isCancelled) setIsLoadingNarrative(false);
      }
    }
    loadSummary();
    return () => {
      isCancelled = true;
    };
  }, [analyses.length, opening.eco, whiteAccuracy, blackAccuracy, whiteAcpl, blackAcpl, keyMoments]);

  // Classification categories
  const categories: MoveClassification[] = [
    'brilliant',
    'great',
    'best',
    'excellent',
    'good',
    'book',
    'inaccuracy',
    'mistake',
    'missed_win',
    'blunder',
  ];

  const countClassification = (moves: MoveAnalysis[], cls: MoveClassification) =>
    moves.filter((m) => m.classification === cls).length;

  // Chart data for advantage flow timeline
  const chartData = useMemo(() => {
    return analyses.map((m) => {
      const clamped = Math.max(-800, Math.min(800, m.evalAfter));
      return {
        ply: m.ply,
        score: Math.round((clamped / 100) * 10) / 10,
        san: m.san,
        classification: m.classification,
      };
    });
  }, [analyses]);

  // Guided Walkthrough handlers
  const startWalkthrough = (startAtFirstBlunder: boolean = false) => {
    setViewMode('walkthrough');
    setIsRetrying(false);
    setRetryResult('idle');
    setShowSolution(false);

    if (startAtFirstBlunder) {
      const blunderIdx = keyMoments.findIndex(
        (m) => m.classification === 'blunder' || m.classification === 'missed_win' || m.classification === 'mistake'
      );
      if (blunderIdx !== -1) {
        setWalkthroughIndex(blunderIdx);
        onSelectPly(keyMoments[blunderIdx].ply);
        return;
      }
    }

    if (keyMoments.length > 0) {
      setWalkthroughIndex(0);
      onSelectPly(keyMoments[0].ply);
    } else if (analyses.length > 0) {
      onSelectPly(1);
    }
  };

  const handleNextMoment = () => {
    if (walkthroughIndex < keyMoments.length - 1) {
      const nextIdx = walkthroughIndex + 1;
      setWalkthroughIndex(nextIdx);
      setIsRetrying(false);
      setRetryResult('idle');
      setShowSolution(false);
      onSelectPly(keyMoments[nextIdx].ply);
    }
  };

  const handlePrevMoment = () => {
    if (walkthroughIndex > 0) {
      const prevIdx = walkthroughIndex - 1;
      setWalkthroughIndex(prevIdx);
      setIsRetrying(false);
      setRetryResult('idle');
      setShowSolution(false);
      onSelectPly(keyMoments[prevIdx].ply);
    }
  };

  const currentMoment = keyMoments[walkthroughIndex] || null;

  // Start retry puzzle mode on current mistake
  const handleStartRetry = () => {
    if (!currentMoment) return;
    setIsRetrying(true);
    setRetryResult('idle');
    setShowSolution(false);
    // Rewind board to the position immediately before the mistake
    if (currentMoment.ply > 0) {
      onSelectPly(currentMoment.ply - 1);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm transition-colors select-none text-slate-800 dark:text-slate-200">
      {/* Top Header Bar */}
      <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/70 dark:bg-slate-950/40">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <BrainCircuit className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-xs">
              Deep Match Review
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Grandmaster Engine Analysis & Walkthrough
            </p>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center bg-slate-200/80 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-300 dark:border-slate-700/60">
          <button
            onClick={() => setViewMode('report')}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition flex items-center gap-1 cursor-pointer ${
              viewMode === 'report'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-3 h-3" />
            <span>Report</span>
          </button>
          <button
            onClick={() => startWalkthrough(false)}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition flex items-center gap-1 cursor-pointer ${
              viewMode === 'walkthrough'
                ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Zap className="w-3 h-3" />
            <span>Coach Review</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-3.5 space-y-3.5 flex-1 overflow-y-auto">
        {/* ===================== VIEW MODE 1: GUIDED COACH WALKTHROUGH ===================== */}
        {viewMode === 'walkthrough' ? (
          <div className="space-y-3">
            {currentMoment ? (
              <div className="bg-gradient-to-br from-slate-50 via-white to-emerald-500/5 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/20 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-xs">
                {/* Moment Progress & Badges */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                      Key Moment {walkthroughIndex + 1} of {keyMoments.length}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      Ply {currentMoment.ply} ({currentMoment.ply % 2 !== 0 ? 'White' : 'Black'})
                    </span>
                  </div>

                  <ClassificationBadge classification={currentMoment.classification} size="sm" />
                </div>

                {/* Move Notation & Tactical Overview */}
                <div className="bg-slate-100/80 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Move Played</div>
                    <div className="text-base font-black text-slate-900 dark:text-white font-mono">
                      {Math.ceil(currentMoment.ply / 2)}.{currentMoment.ply % 2 === 0 ? '..' : ''} {currentMoment.san}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Eval Shift</div>
                    <div className={`text-sm font-bold font-mono ${
                      currentMoment.deltaWinPercent < -5
                        ? 'text-rose-500'
                        : currentMoment.deltaWinPercent > 5
                        ? 'text-emerald-500'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}>
                      {currentMoment.deltaWinPercent > 0 ? '+' : ''}{currentMoment.deltaWinPercent}% Win Chance
                    </div>
                  </div>
                </div>

                {/* Tactical Explanation from Grandmaster AI */}
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1">
                    <BrainCircuit className="w-3 h-3 text-emerald-500" />
                    <span>Tactical Analysis</span>
                  </span>
                  <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed bg-white dark:bg-slate-800/70 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 font-medium">
                    {currentMoment.playerIntent ||
                      `A critical turning point where ${currentMoment.ply % 2 !== 0 ? 'White' : 'Black'} played ${currentMoment.san}. The position drastically shifted the game dynamic.`}
                  </p>
                </div>

                {/* Best Engine Move / Solution Section */}
                {currentMoment.bestMove && (
                  <div className="p-3 bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5" />
                        <span>Recommended Continuation</span>
                      </span>
                      <button
                        onClick={() => setShowSolution(!showSolution)}
                        className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                      >
                        <Eye className="w-3 h-3" />
                        <span>{showSolution ? 'Hide Engine Line' : 'Show Engine Line'}</span>
                      </button>
                    </div>

                    {showSolution && (
                      <div className="flex items-center gap-2 pt-1 font-mono text-xs text-slate-800 dark:text-slate-200">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/15 font-bold text-emerald-700 dark:text-emerald-300">
                          {currentMoment.bestMove}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Maintains optimal evaluation without conceding tactical concessions.
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Interactive In-Review Retry Mistake Challenge */}
                {(currentMoment.classification === 'blunder' ||
                  currentMoment.classification === 'missed_win' ||
                  currentMoment.classification === 'mistake') && (
                  <div className="pt-1">
                    {!isRetrying ? (
                      <button
                        onClick={handleStartRetry}
                        className="w-full py-2.5 bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-amber-500/15 hover:from-amber-500/25 hover:to-rose-500/20 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                        <span>Retry This Move (Find the Better Continuation)</span>
                      </button>
                    ) : (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                            <Target className="w-3.5 h-3.5" />
                            <span>Retry Mode Active</span>
                          </span>
                          <button
                            onClick={() => {
                              setIsRetrying(false);
                              onSelectPly(currentMoment.ply);
                            }}
                            className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          >
                            Exit Retry
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300">
                          The board has been rewound to ply {currentMoment.ply - 1}. Make a move directly on the board to discover if you can match the Grandmaster move!
                        </p>
                        {retryResult === 'correct' && (
                          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span>Outstanding find! That was the top engine move.</span>
                          </div>
                        )}
                        {retryResult === 'wrong' && (
                          <div className="p-2 rounded-lg bg-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4 text-rose-500" />
                            <span>Not quite the best move. Try again or click 'Show Engine Line'!</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Walkthrough Navigation Controls */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    onClick={handlePrevMoment}
                    disabled={walkthroughIndex === 0}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Previous</span>
                  </button>

                  <div className="text-[11px] text-slate-400 font-mono">
                    {walkthroughIndex + 1} / {keyMoments.length}
                  </div>

                  <button
                    onClick={handleNextMoment}
                    disabled={walkthroughIndex === keyMoments.length - 1}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-30 text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <span>Next Moment</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Clean Game</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  No blunders or critical tactical misses were detected in this match. Excellent precision!
                </p>
                <button
                  onClick={() => setViewMode('report')}
                  className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl"
                >
                  Return to Report
                </button>
              </div>
            )}
          </div>
        ) : (
          /* ===================== VIEW MODE 2: COMPREHENSIVE MATCH REPORT ===================== */
          <div className="space-y-4">
            {/* AI Grandmaster Narrative Summary Card */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <BrainCircuit className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white text-xs">
                    Grandmaster Tactical Verdict
                  </span>
                </div>

                <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <BookOpen className="w-3 h-3" />
                  <span>{opening.eco} • {opening.name}</span>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans font-medium">
                {isLoadingNarrative
                  ? 'Computing precision metrics and tactical motifs...'
                  : narrativeData?.narrative ||
                    `A hard-fought contest contested in the ${opening.name}. White concluded with ${whiteAccuracy.toFixed(1)}% accuracy and Black scored ${blackAccuracy.toFixed(1)}%. Key tactical turning points determined the outcome.`}
              </p>

              {narrativeData?.criticalTurningPoint && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 text-[11px]">
                  <strong className="text-emerald-600 dark:text-emerald-400 block mb-0.5">Critical Turning Point:</strong>
                  <span className="text-slate-600 dark:text-slate-400">{narrativeData.criticalTurningPoint}</span>
                </div>
              )}
            </div>

            {/* Players Comparison Matrix */}
            <div className="grid grid-cols-2 gap-3">
              {/* White Player Card */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white truncate max-w-[120px]">
                    <span className="w-2.5 h-2.5 rounded-full bg-white border border-slate-400 shadow-2xs" />
                    <span className="truncate">{whiteName}</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400">~{whiteRating} Elo</span>
                </div>

                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-slate-900 dark:text-white font-sans tracking-tight">
                    {whiteAccuracy.toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {whiteAcpl} ACPL
                  </span>
                </div>

                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(whiteAccuracy, 100)}%` }}
                  />
                </div>
              </div>

              {/* Black Player Card */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white truncate max-w-[120px]">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-700 shadow-2xs" />
                    <span className="truncate">{blackName}</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400">~{blackRating} Elo</span>
                </div>

                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-slate-900 dark:text-white font-sans tracking-tight">
                    {blackAccuracy.toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {blackAcpl} ACPL
                  </span>
                </div>

                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(blackAccuracy, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Match Phase Precision Breakdown */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Phase Breakdown Accuracy</span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium">White vs Black</span>
              </div>

              <div className="space-y-1.5 text-xs">
                {/* Opening */}
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-800/60">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Opening (Book Theory)</span>
                  <div className="flex items-center gap-3 font-mono font-bold">
                    <span className="text-emerald-600 dark:text-emerald-400">{phaseStats.opening.white.toFixed(1)}%</span>
                    <span className="text-slate-300 dark:text-slate-600">/</span>
                    <span className="text-teal-600 dark:text-teal-400">{phaseStats.opening.black.toFixed(1)}%</span>
                  </div>
                </div>

                {/* Middlegame */}
                {phaseStats.middlegame.hasMoves && (
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-800/60">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Middlegame (Tactics)</span>
                    <div className="flex items-center gap-3 font-mono font-bold">
                      <span className="text-emerald-600 dark:text-emerald-400">{phaseStats.middlegame.white.toFixed(1)}%</span>
                      <span className="text-slate-300 dark:text-slate-600">/</span>
                      <span className="text-teal-600 dark:text-teal-400">{phaseStats.middlegame.black.toFixed(1)}%</span>
                    </div>
                  </div>
                )}

                {/* Endgame */}
                {phaseStats.endgame.hasMoves && (
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Endgame (Technique)</span>
                    <div className="flex items-center gap-3 font-mono font-bold">
                      <span className="text-emerald-600 dark:text-emerald-400">{phaseStats.endgame.white.toFixed(1)}%</span>
                      <span className="text-slate-300 dark:text-slate-600">/</span>
                      <span className="text-teal-600 dark:text-teal-400">{phaseStats.endgame.black.toFixed(1)}%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Advantage Momentum Timeline */}
            {chartData.length > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium px-1">
                  <span>Advantage Momentum Timeline</span>
                  <span>{analyses.length} Plies</span>
                </div>
                <div className="w-full h-14 bg-slate-50 dark:bg-slate-950/60 rounded-xl p-1 border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 2, right: 4, left: 4, bottom: 0 }}>
                      <defs>
                        <linearGradient id="reviewFlowGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="score"
                        stroke="#10b981"
                        strokeWidth={1.5}
                        fill="url(#reviewFlowGrad)"
                      />
                      <Tooltip
                        content={({ payload }) => {
                          if (!payload || payload.length === 0) return null;
                          const pt = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow-md font-mono">
                              Move {Math.ceil(pt.ply / 2)}: {pt.san} (Eval: {pt.score > 0 ? '+' : ''}{pt.score})
                            </div>
                          );
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Move Breakdown Matrix with Interactive Filter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs px-1">
                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <span>Move Classification Explorer</span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Click category to inspect moves</span>
              </div>

              <div className="bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-200/60 dark:divide-slate-800/60 text-xs">
                {categories.map((cat) => {
                  const meta = CLASSIFICATION_CONFIG[cat];
                  const wCount = countClassification(whiteMoves, cat);
                  const bCount = countClassification(blackMoves, cat);
                  const totalCount = wCount + bCount;
                  const isSelected = selectedCategory === cat;

                  return (
                    <div key={cat} className="transition-colors">
                      <div
                        onClick={() => setSelectedCategory(isSelected ? null : cat)}
                        className={`grid grid-cols-12 py-2 px-3 items-center cursor-pointer transition ${
                          isSelected
                            ? 'bg-slate-200/60 dark:bg-slate-800/80 font-bold'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800/30'
                        }`}
                      >
                        {/* Badge & Label */}
                        <div className="col-span-6 flex items-center gap-2">
                          <ClassificationBadge classification={cat} size="sm" />
                          <span className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">
                            {meta.label}
                          </span>
                        </div>

                        {/* White Count */}
                        <span className={`col-span-3 text-center font-mono font-bold text-xs ${
                          wCount > 0 ? 'text-slate-900 dark:text-white' : 'text-slate-400'
                        }`}>
                          {wCount}
                        </span>

                        {/* Black Count */}
                        <span className={`col-span-3 text-center font-mono font-bold text-xs ${
                          bCount > 0 ? 'text-slate-900 dark:text-white' : 'text-slate-400'
                        }`}>
                          {bCount}
                        </span>
                      </div>

                      {/* Expanded moves list when category is selected */}
                      {isSelected && (
                        <div className="px-3 py-2 bg-slate-100/70 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 space-y-1.5 animate-fadeIn">
                          {totalCount === 0 ? (
                            <p className="text-[11px] text-slate-400 italic py-1">
                              No {meta.label.toLowerCase()} moves in this match.
                            </p>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {analyses
                                .filter((m) => m.classification === cat)
                                .map((m) => (
                                  <button
                                    key={m.ply}
                                    onClick={() => onSelectPly(m.ply)}
                                    className={`px-2 py-1 rounded-lg border text-xs font-mono font-bold transition cursor-pointer flex items-center gap-1 ${
                                      currentPly === m.ply
                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-500'
                                    }`}
                                  >
                                    <span>{Math.ceil(m.ply / 2)}.{m.ply % 2 === 0 ? '..' : ''} {m.san}</span>
                                    <span className="text-[10px] opacity-75">
                                      ({m.deltaWinPercent > 0 ? '+' : ''}{m.deltaWinPercent}%)
                                    </span>
                                  </button>
                                ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/70 space-y-2 shrink-0">
        {viewMode === 'report' ? (
          <>
            <button
              onClick={() => startWalkthrough(true)}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm rounded-xl shadow-md transition active:scale-98 cursor-pointer flex items-center justify-center gap-2 tracking-wide"
            >
              <Zap className="w-4 h-4 fill-current text-amber-300" />
              <span>Launch Guided Walkthrough</span>
            </button>

            {keyMoments.some((m) => m.classification === 'blunder' || m.classification === 'missed_win') && (
              <button
                onClick={onGoToPuzzles}
                className="w-full py-2 bg-white dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700/80"
              >
                <Target className="w-3.5 h-3.5 text-rose-500" />
                <span>
                  Practice Match Blunders ({keyMoments.filter(m => m.classification === 'blunder' || m.classification === 'missed_win').length})
                </span>
              </button>
            )}
          </>
        ) : (
          <button
            onClick={() => setViewMode('report')}
            className="w-full py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Return to Match Report</span>
          </button>
        )}
      </div>
    </div>
  );
};

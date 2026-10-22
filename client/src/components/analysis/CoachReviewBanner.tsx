import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowRight,
  RotateCcw,
  Sparkles,
  ChevronLeft,
  MessageSquare,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Chess } from 'chess.js';
import type { MoveAnalysis } from '../../types/chess';
import { CLASSIFICATION_CONFIG } from '../../analyzer/evaluator';
import { MoveNotationTooltip } from '../common/MoveNotationTooltip';
import { speakCoachText, stopCoachSpeaking } from '../../utils/speech';

export interface HoveredMoveInfo {
  from?: string;
  to?: string;
  color?: 'emerald' | 'red';
}

interface CoachReviewBannerProps {
  currentAnalysis?: MoveAnalysis;
  currentPly: number;
  totalPlies: number;
  onSelectPly: (ply: number) => void;
  onGoToReport?: () => void;
  onAskCoach?: () => void;
  onRetryMove?: () => void;
  onHoverMove?: (info: HoveredMoveInfo | null) => void;
}

export const CoachReviewBanner: React.FC<CoachReviewBannerProps> = ({
  currentAnalysis,
  currentPly,
  totalPlies,
  onSelectPly,
  onAskCoach,
  onRetryMove,
  onHoverMove,
}) => {
  const isStart = currentPly === 0 || !currentAnalysis;
  const isEnd = currentPly >= totalPlies && totalPlies > 0;

  // Resolve squares for recommended best move for board glow
  const bestMoveSquares = useMemo(() => {
    if (!currentAnalysis?.bestMove) return { from: undefined, to: undefined };

    if (currentAnalysis.bestMoveUci && currentAnalysis.bestMoveUci.length >= 4) {
      return {
        from: currentAnalysis.bestMoveUci.slice(0, 2),
        to: currentAnalysis.bestMoveUci.slice(2, 4),
      };
    }

    if (currentAnalysis.fenBefore) {
      try {
        const temp = new Chess(currentAnalysis.fenBefore);
        const moves = temp.moves({ verbose: true });
        const match = moves.find(
          (m) =>
            m.san === currentAnalysis.bestMove ||
            `${m.from}${m.to}` === currentAnalysis.bestMove?.toLowerCase()
        );
        if (match) {
          return { from: match.from, to: match.to };
        }
      } catch {
        // fallback
      }
    }

    const matchSq = currentAnalysis.bestMove.match(/[a-h][1-8]/);
    return { from: undefined, to: matchSq ? matchSq[0] : undefined };
  }, [currentAnalysis?.bestMove, currentAnalysis?.bestMoveUci, currentAnalysis?.fenBefore]);

  // Format evaluation score badge
  const formatEvalScore = (cp?: number) => {
    if (cp === undefined) return null;
    if (Math.abs(cp) > 2000) {
      const mateIn = Math.ceil((3000 - Math.abs(cp)) / 10);
      return cp > 0 ? `+M${Math.max(1, mateIn)}` : `-M${Math.max(1, mateIn)}`;
    }
    const val = (cp / 100).toFixed(1);
    return cp > 0 ? `+${val}` : `${val}`;
  };

  const isMistakeMove =
    currentAnalysis &&
    (currentAnalysis.classification === 'blunder' ||
      currentAnalysis.classification === 'mistake' ||
      currentAnalysis.classification === 'missed_win');

  // Build headline text
  const getHeadline = () => {
    if (isStart) {
      return {
        badgeIcon: '♟',
        badgeBg: 'bg-slate-700 text-white',
        suffix: 'Game Review Ready',
      };
    }

    const classification = currentAnalysis.classification;
    const meta = CLASSIFICATION_CONFIG[classification] || CLASSIFICATION_CONFIG.good;

    let suffix = `is a ${meta.label.toLowerCase()} move`;
    if (classification === 'best') {
      suffix = 'was the best move';
    } else if (classification === 'blunder') {
      suffix = 'was a blunder';
    } else if (classification === 'mistake') {
      suffix = 'is a mistake';
    } else if (classification === 'inaccuracy') {
      suffix = 'is an inaccuracy';
    } else if (classification === 'brilliant') {
      suffix = 'is a brilliant move!!';
    } else if (classification === 'great') {
      suffix = 'is a great move!';
    } else if (classification === 'missed_win') {
      suffix = 'missed a winning move';
    }

    return {
      badgeIcon: meta.badge || meta.symbol,
      badgeBg:
        classification === 'book'
          ? 'bg-[#a06a42] text-white'
          : classification === 'best'
          ? 'bg-[#81b64c] text-white'
          : classification === 'brilliant'
          ? 'bg-cyan-500 text-white'
          : classification === 'great'
          ? 'bg-blue-500 text-white'
          : classification === 'excellent'
          ? 'bg-emerald-500 text-white'
          : classification === 'good'
          ? 'bg-slate-500 text-white'
          : classification === 'inaccuracy'
          ? 'bg-amber-500 text-slate-900'
          : classification === 'mistake'
          ? 'bg-orange-500 text-white'
          : 'bg-red-600 text-white',
      suffix,
    };
  };

  // Build natural pedagogical explanation
  const getCommentary = () => {
    if (isStart) {
      return 'The board is set at Move 1. Click Next to walk through each turn with grandmaster commentary, tactical analysis, and accuracy classifications.';
    }

    if (currentAnalysis.playerIntent) {
      return currentAnalysis.playerIntent;
    }

    if (currentAnalysis.coachCommentary) {
      return currentAnalysis.coachCommentary;
    }

    switch (currentAnalysis.classification) {
      case 'book':
        return 'Standard opening theory, preparing active piece development and central presence.';
      case 'best':
        return 'Top choice by the engine. Optimizes piece coordination and maintains board pressure.';
      case 'brilliant':
        return 'A visionary sacrifice that breaks open enemy lines for a decisive advantage.';
      case 'great':
        return 'High precision move neutralizing counterplay in a sharp position.';
      case 'inaccuracy':
        return currentAnalysis.bestMove
          ? `Gives away a fraction of the advantage. Better was ${currentAnalysis.bestMove}.`
          : 'Slightly passive continuation.';
      case 'mistake':
        return currentAnalysis.bestMove
          ? `Allows opponent counter-chances. Engine recommends ${currentAnalysis.bestMove}.`
          : 'Surrenders the initiative.';
      case 'blunder':
        return currentAnalysis.bestMove
          ? `Overlooked critical tactics. ${currentAnalysis.bestMove} was necessary.`
          : 'A critical oversight changing the match evaluation.';
      case 'missed_win':
        return currentAnalysis.bestMove
          ? `Missed an immediate winning continuation: ${currentAnalysis.bestMove}.`
          : 'Missed a direct path to victory.';
      default:
        return 'A solid move maintaining the flow of the game.';
    }
  };

  const headline = getHeadline();
  const commentary = getCommentary();
  const scoreBadge = currentAnalysis ? formatEvalScore(currentAnalysis.evalAfter) : null;

  // Shared Voice Narration State
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('checkmate_coach_voice') === 'true';
  });
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Sync voice preference across tabs/components in real time
  useEffect(() => {
    const handleVoiceChange = () => {
      setVoiceEnabled(localStorage.getItem('checkmate_coach_voice') === 'true');
    };
    window.addEventListener('coach_voice_changed', handleVoiceChange);
    return () => {
      window.removeEventListener('coach_voice_changed', handleVoiceChange);
    };
  }, []);

  const triggerSpeak = useCallback(() => {
    const textToSpeak = currentAnalysis
      ? `${currentAnalysis.san ? `${currentAnalysis.san}, ` : ''}${headline.suffix}. ${commentary}. ${
          currentAnalysis.bestMove &&
          currentAnalysis.classification !== 'best' &&
          currentAnalysis.classification !== 'book' &&
          currentAnalysis.classification !== 'brilliant'
            ? `Best move was ${currentAnalysis.bestMove}.`
            : ''
        }`
      : `${headline.suffix}. ${commentary}`;

    speakCoachText(textToSpeak, {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  }, [currentAnalysis, headline.suffix, commentary]);

  const toggleVoice = () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    localStorage.setItem('checkmate_coach_voice', String(next));
    window.dispatchEvent(new Event('coach_voice_changed'));
    if (!next) {
      stopCoachSpeaking();
      setIsSpeaking(false);
    } else {
      triggerSpeak();
    }
  };

  // Automatically speak move review if voice is enabled when currentPly changes
  useEffect(() => {
    if (voiceEnabled && currentPly > 0 && currentAnalysis) {
      triggerSpeak();
    } else {
      stopCoachSpeaking();
      setIsSpeaking(false);
    }
    return () => {
      stopCoachSpeaking();
      setIsSpeaking(false);
    };
  }, [currentPly, voiceEnabled, triggerSpeak]);

  const handleNext = () => {
    if (isEnd) {
      onSelectPly(1);
    } else {
      onSelectPly(currentPly + 1);
    }
  };

  const handlePrev = () => {
    if (currentPly > 0) {
      onSelectPly(currentPly - 1);
    }
  };

  return (
    <div className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 p-2 sm:p-2.5 space-y-1.5 shrink-0 transition-colors">
      {/* Top: Compact Avatar + Speech Bubble Container */}
      <div className="flex items-start gap-2 sm:gap-2.5">
        {/* GM Alex Avatar (Compact, borderless portrait with active speaking glow) */}
        <div
          className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden border shadow-xs bg-[#162032] shrink-0 mt-0.5 transition-all duration-300 ${
            isSpeaking
              ? 'border-emerald-400 ring-2 ring-emerald-400/50 shadow-[0_0_12px_rgba(52,211,153,0.5)]'
              : 'border-slate-300 dark:border-slate-700'
          }`}
        >
          <img
            src="/coach_alex.jpg"
            alt="GM Alex Coach"
            className="w-full h-full object-cover object-top scale-110"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <span
            className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-white dark:border-slate-900 shadow-2xs transition-colors ${
              isSpeaking ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-500'
            }`}
          />
        </div>

        {/* Speech Bubble (Slim & Compact) */}
        <div className="flex-1 min-w-0 relative bg-white dark:bg-slate-800/95 border border-slate-200 dark:border-slate-700/80 rounded-xl rounded-tl-xs p-2 sm:p-2.5 shadow-2xs">
          {/* Bubble Pointer triangle */}
          <div className="absolute top-2.5 -left-1 w-2.5 h-2.5 bg-white dark:bg-slate-800/95 border-l border-b border-slate-200 dark:border-slate-700/80 transform rotate-45" />

          {/* Header Row: Classification Badge + Headline with Hoverable Move + Score + Voice Toggle */}
          <div className="flex items-center justify-between gap-1.5 pb-1 mb-1 border-b border-slate-100 dark:border-slate-700/50">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className={`w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 shadow-xs ${headline.badgeBg}`}
              >
                {headline.badgeIcon}
              </span>
              <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1 truncate">
                {currentAnalysis ? (
                  <>
                    <MoveNotationTooltip
                      san={currentAnalysis.san}
                      from={currentAnalysis.from}
                      to={currentAnalysis.to}
                      variant={isMistakeMove ? 'blunder' : 'normal'}
                      onHoverChange={(isHovered, from, to) => {
                        onHoverMove?.(
                          isHovered
                            ? { from, to, color: isMistakeMove ? 'red' : 'emerald' }
                            : null
                        );
                      }}
                      className="border-b-2 border-dotted border-current hover:opacity-90 cursor-pointer"
                    />
                    <span className="truncate">{headline.suffix}</span>
                  </>
                ) : (
                  <span>{headline.suffix}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {scoreBadge && (
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded shrink-0 ${
                    currentAnalysis?.evalAfter && currentAnalysis.evalAfter > 20
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : currentAnalysis?.evalAfter && currentAnalysis.evalAfter < -20
                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {scoreBadge}
                </span>
              )}

              {/* GM Alex Voice Narration Button */}
              {'speechSynthesis' in window && (
                <button
                  onClick={toggleVoice}
                  title={
                    voiceEnabled
                      ? isSpeaking
                        ? 'GM Alex speaking (click to mute)'
                        : 'Voice on (click to mute)'
                      : 'Enable GM Alex voice'
                  }
                  className={`p-1 rounded-md transition cursor-pointer flex items-center justify-center ${
                    voiceEnabled
                      ? isSpeaking
                        ? 'bg-emerald-500/20 text-emerald-500 animate-pulse'
                        : 'text-sky-500 hover:bg-sky-500/10'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  {voiceEnabled ? (
                    <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'text-emerald-400' : ''}`} />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* AI Commentary Text */}
          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug font-normal line-clamp-2">
            {commentary}
          </p>

          {/* Best Move Suggestion Pill with interactive Hover Glow & Tooltip */}
          {currentAnalysis?.bestMove &&
            currentAnalysis.classification !== 'best' &&
            currentAnalysis.classification !== 'book' &&
            currentAnalysis.classification !== 'brilliant' && (
              <div className="mt-1 pt-1 border-t border-slate-100 dark:border-slate-700/40 flex items-center justify-between gap-2 text-[10.5px]">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <Sparkles className="w-3 h-3 text-emerald-500 shrink-0" />
                  <span>Best move:</span>
                  <MoveNotationTooltip
                    san={currentAnalysis.bestMove}
                    from={bestMoveSquares.from}
                    to={bestMoveSquares.to}
                    variant="best"
                    onHoverChange={(isHovered, from, to) => {
                      onHoverMove?.(isHovered ? { from, to, color: 'emerald' } : null);
                    }}
                    className="ring-1 ring-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 font-bold px-1 py-0.2 rounded transition-all hover:scale-105 hover:shadow-[0_0_10px_rgba(16,185,129,0.5)] cursor-pointer text-[10.5px]"
                  />
                </div>

                {onAskCoach && (
                  <button
                    onClick={onAskCoach}
                    className="text-[10px] text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-0.5 font-semibold cursor-pointer shrink-0"
                  >
                    <MessageSquare className="w-2.5 h-2.5" />
                    <span>Ask Why</span>
                  </button>
                )}
              </div>
            )}
        </div>
      </div>

      {/* Prominent Action Bar (Sleek Chess.com Green Button) */}
      <div className="flex items-center gap-1.5 pt-0.5">
        {/* Prev Move Button */}
        <button
          onClick={handlePrev}
          disabled={currentPly <= 0}
          className={`h-8 px-2.5 rounded-lg border flex items-center justify-center transition cursor-pointer text-xs font-semibold shrink-0 ${
            currentPly <= 0
              ? 'border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-700 cursor-not-allowed'
              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 active:scale-95'
          }`}
          title="Previous move"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Big Prominent Green "Next" Button */}
        <button
          id="review-next-btn"
          onClick={handleNext}
          className="flex-1 h-8 sm:h-8.5 rounded-lg bg-[#81b64c] hover:bg-[#90c55b] active:bg-[#72a342] text-white font-bold text-xs tracking-wide shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.99]"
        >
          {isEnd ? (
            <>
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restart Review</span>
            </>
          ) : isStart ? (
            <>
              <span>Start Review</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              <span>Next</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>

        {/* Optional Retry button on blunders */}
        {isMistakeMove && onRetryMove && (
          <button
            onClick={onRetryMove}
            className="h-8 px-2.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1 text-[11px] font-bold transition cursor-pointer shrink-0 active:scale-95"
            title="Step back to retry this blunder"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Retry</span>
          </button>
        )}
      </div>
    </div>
  );
};

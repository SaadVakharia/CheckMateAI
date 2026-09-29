import React, { useState } from 'react';
import { Eye, EyeOff, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import type { MoveAnalysis } from '../../types/chess';
import { ClassificationBadge } from '../common/ClassificationBadge';
import { CLASSIFICATION_CONFIG } from '../../analyzer/evaluator';

interface CoachFeedbackBarProps {
  currentAnalysis?: MoveAnalysis;
  showBestMoveArrow: boolean;
  onToggleBestMoveArrow: () => void;
  onRetryMove?: () => void;
}

export const CoachFeedbackBar: React.FC<CoachFeedbackBarProps> = ({
  currentAnalysis,
  showBestMoveArrow,
  onToggleBestMoveArrow,
  onRetryMove,
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  if (!currentAnalysis) {
    return (
      <div className="w-full bg-slate-100/80 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs transition-colors shrink-0 select-none">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xs">
            GM
          </div>
          <span className="text-slate-600 dark:text-slate-400 font-medium text-[11px]">
            Starting position. Step through moves or make a move to receive live grandmaster coaching.
          </span>
        </div>
      </div>
    );
  }

  const cls = currentAnalysis.classification;
  const meta = CLASSIFICATION_CONFIG[cls];
  const isMistakeOrBlunder = cls === 'blunder' || cls === 'mistake' || cls === 'missed_win' || cls === 'inaccuracy';
  const motifs = currentAnalysis.tacticalMotifs || [];

  // Construct highly specific and contextual live coach verdict
  let verdictText = '';
  if (cls === 'brilliant') {
    verdictText = `${currentAnalysis.san} is brilliant! A master-level tactical sacrifice to blow open opponent defenses.`;
  } else if (cls === 'great') {
    verdictText = `Great move! ${currentAnalysis.san} was the only precise continuation that preserves the advantage.`;
  } else if (cls === 'best') {
    verdictText = `${currentAnalysis.san} is the top engine move, optimizing piece coordination and central pressure.`;
  } else if (cls === 'book') {
    verdictText = `${currentAnalysis.san} is standard opening book theory for control of the center.`;
  } else if (cls === 'blunder') {
    if (currentAnalysis.playerIntent) {
      verdictText = `Blunder: ${currentAnalysis.playerIntent}.`;
    } else if (motifs.includes('hanging_piece')) {
      verdictText = `Devastating blunder! ${currentAnalysis.san} leaves a piece undefended for capture.`;
    } else if (motifs.includes('fork')) {
      verdictText = `Blunder! ${currentAnalysis.san} permits an unavoidable tactical fork.`;
    } else if (motifs.includes('pin')) {
      verdictText = `Blunder! Leaves a piece trapped in a fatal tactical pin.`;
    } else {
      verdictText = `Critical blunder! This drastically shifts the win probability to the opponent.`;
    }
  } else if (cls === 'mistake') {
    if (currentAnalysis.playerIntent) {
      verdictText = `Mistake: ${currentAnalysis.playerIntent}.`;
    } else {
      verdictText = `Mistake: ${currentAnalysis.san} compromises piece coordination and surrenders the initiative.`;
    }
  } else if (cls === 'inaccuracy') {
    verdictText = `Inaccuracy: ${currentAnalysis.san} is slightly passive and relieves pressure on the opponent.`;
  } else if (cls === 'missed_win') {
    verdictText = `Missed Win! You had an immediate knockout blow, but ${currentAnalysis.san} let the opponent escape.`;
  } else {
    verdictText = `${currentAnalysis.san} is a solid positional move that maintains the balance.`;
  }

  // Handle Speech Synthesis
  const handleSpeakVerdict = () => {
    if (!('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const textToSpeak = `${meta.label}. ${verdictText} ${
      isMistakeOrBlunder && currentAnalysis.bestMove ? `Best move was ${currentAnalysis.bestMove}.` : ''
    }`;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 flex items-center justify-between text-xs shadow-xs transition-colors shrink-0 select-none">
      {/* Left: Classification Badge + Live Verdict */}
      <div className="flex items-center space-x-2 min-w-0 mr-2">
        <ClassificationBadge classification={cls} size="sm" />
        <div className="min-w-0 truncate">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-900 dark:text-white text-[11px] truncate">
              {meta.label} ({currentAnalysis.san})
            </span>
            <span
              className={`text-[10px] font-mono font-bold ${
                currentAnalysis.deltaWinPercent < 0
                  ? 'text-rose-500'
                  : currentAnalysis.deltaWinPercent > 0
                  ? 'text-emerald-500'
                  : 'text-slate-400'
              }`}
            >
              {currentAnalysis.deltaWinPercent > 0 ? `+${currentAnalysis.deltaWinPercent}` : currentAnalysis.deltaWinPercent}%
            </span>
            {isMistakeOrBlunder && currentAnalysis.bestMove && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold hidden sm:inline">
                • Best: {currentAnalysis.bestMove}
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-600 dark:text-slate-400 truncate max-w-[280px] sm:max-w-md">
            {verdictText}
          </p>
        </div>
      </div>

      {/* Right: Live Interactive Controls */}
      <div className="flex items-center space-x-1.5 shrink-0">
        {/* Voice Coach Button */}
        {'speechSynthesis' in window && (
          <button
            onClick={handleSpeakVerdict}
            title={isSpeaking ? 'Stop voice' : 'Listen to Live Coach verdict'}
            className={`p-1 rounded-lg text-[10px] transition cursor-pointer border ${
              isSpeaking
                ? 'bg-emerald-600 text-white border-emerald-600 animate-pulse'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {isSpeaking ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
          </button>
        )}

        {/* Toggle Best Move Arrow */}
        {currentAnalysis.bestMove && (
          <button
            onClick={onToggleBestMoveArrow}
            title={showBestMoveArrow ? 'Hide Best Move Arrow' : 'Show Best Move Arrow'}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer border ${
              showBestMoveArrow
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-400 shadow-2xs'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {showBestMoveArrow ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            <span className="hidden sm:inline">Best Move</span>
          </button>
        )}

        {/* Retry Button if Mistake/Blunder */}
        {isMistakeOrBlunder && onRetryMove && (
          <button
            onClick={onRetryMove}
            title="Rewind 1 ply to find the winning continuation"
            className="px-2 py-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-700 dark:text-amber-400 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        )}
      </div>
    </div>
  );
};

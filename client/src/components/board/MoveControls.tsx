import React, { useEffect } from 'react';
import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface MoveControlsProps {
  currentPly: number;
  totalPlies: number;
  isPlaying: boolean;
  isMuted: boolean;
  onFirst: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLast: () => void;
  onTogglePlay: () => void;
  onFlipBoard: () => void;
  onToggleMute: () => void;
}

export const MoveControls: React.FC<MoveControlsProps> = ({
  currentPly,
  totalPlies,
  isPlaying,
  isMuted,
  onFirst,
  onPrev,
  onNext,
  onLast,
  onTogglePlay,
  onFlipBoard,
  onToggleMute,
}) => {
  // Global arrow keys listener for move navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onNext();
      } else if (e.key === 'Home') {
        e.preventDefault();
        onFirst();
      } else if (e.key === 'End') {
        e.preventDefault();
        onLast();
      } else if (e.key === ' ') {
        e.preventDefault();
        onTogglePlay();
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        onFlipBoard();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onPrev, onNext, onFirst, onLast, onTogglePlay, onFlipBoard]);

  return (
    <div className="flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm transition-colors">
      {/* Quick ply indicator */}
      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
        Ply <span className="text-sky-600 dark:text-sky-400 font-bold">{currentPly}</span> / {totalPlies}
      </div>

      {/* Main navigation controls */}
      <div className="flex items-center space-x-1">
        <button
          onClick={onFirst}
          disabled={currentPly <= 0}
          title="First Move (Home)"
          className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition cursor-pointer"
        >
          <ChevronFirst className="w-5 h-5" />
        </button>

        <button
          onClick={onPrev}
          disabled={currentPly <= 0}
          title="Previous Move (Left Arrow)"
          className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={onTogglePlay}
          title="Autoplay (Spacebar)"
          className="p-2 text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-md shadow-blue-500/20 transition cursor-pointer"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
        </button>

        <button
          onClick={onNext}
          disabled={currentPly >= totalPlies}
          title="Next Move (Right Arrow)"
          className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition cursor-pointer"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <button
          onClick={onLast}
          disabled={currentPly >= totalPlies}
          title="Last Move (End)"
          className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition cursor-pointer"
        >
          <ChevronLast className="w-5 h-5" />
        </button>
      </div>

      {/* Actions: Flip & Mute */}
      <div className="flex items-center space-x-1">
        <button
          onClick={onFlipBoard}
          title="Flip Board (F)"
          className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={onToggleMute}
          title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-500 dark:text-red-400" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};


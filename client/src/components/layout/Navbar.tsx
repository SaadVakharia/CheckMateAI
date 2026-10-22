import React from 'react';
import {
  RotateCcw,
  Sun,
  Moon,
  Gamepad2,
  BarChart3,
  BrainCircuit,
  Target,
  RefreshCw,
} from 'lucide-react';
import { Logo } from '../common/Logo';
import { useTheme } from '../../context/ThemeContext';
import type { WorkflowStep } from './WorkflowStepper';

interface NavbarProps {
  currentStep: WorkflowStep;
  onSelectStep: (step: WorkflowStep) => void;
  gameTitle: string;
  blundersCount: number;
  movesCount: number;
  isScanning?: boolean;
  scanProgress?: number;
  onOpenLaunchpad: () => void;
  onResetGame: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentStep,
  onSelectStep,
  gameTitle,
  blundersCount,
  movesCount,
  isScanning,
  scanProgress,
  onOpenLaunchpad,
  onResetGame,
}) => {
  const { isDark, toggleTheme } = useTheme();

  const steps: { id: WorkflowStep; label: string; badge?: string | number; icon: React.ReactNode }[] = [
    {
      id: 'select',
      label: 'Select Match',
      badge: movesCount > 0 ? `${movesCount}m` : undefined,
      icon: <Gamepad2 className="w-3.5 h-3.5" />,
    },
    {
      id: 'report',
      label: 'Game Review',
      badge: isScanning ? `${scanProgress}%` : undefined,
      icon: <BarChart3 className="w-3.5 h-3.5" />,
    },
    {
      id: 'board',
      label: 'Analysis Board',
      icon: <BrainCircuit className="w-3.5 h-3.5" />,
    },
    {
      id: 'puzzles',
      label: 'Mistake Puzzles',
      badge: blundersCount > 0 ? blundersCount : undefined,
      icon: <Target className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 px-3 sm:px-4 py-1.5 transition-colors duration-200 shrink-0">
      <div className="w-full max-w-[1550px] mx-auto flex items-center justify-between gap-2">
        {/* Left: Brand with Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <Logo />
        </div>

        {/* Center: Integrated Workflow Stepper (Merged directly into Navbar for max height) */}
        <div className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-900/90 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0 select-none">
          {steps.map((s) => {
            const isActive = currentStep === s.id;
            return (
              <button
                key={s.id}
                onClick={() => {
                  if (s.id === 'select') {
                    onOpenLaunchpad();
                  } else {
                    onSelectStep(s.id);
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
                }`}
              >
                {s.icon}
                <span>{s.label}</span>
                {s.badge !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : s.id === 'puzzles'
                        ? 'bg-red-500/20 text-red-600 dark:text-red-400'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {s.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right: Active Match & Actions */}
        <div className="flex items-center space-x-1.5 shrink-0">
          {/* Active Match Badge with Switch Button */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
            <span className="text-slate-400 font-medium">Match:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[170px]" title={gameTitle}>
              {gameTitle}
            </span>
            <button
              onClick={onOpenLaunchpad}
              className="text-sky-600 dark:text-sky-400 hover:text-sky-500 font-bold ml-0.5 flex items-center gap-1 cursor-pointer transition"
              title="Switch Match PGN"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Switch</span>
            </button>
          </div>

          {/* Light / Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl transition cursor-pointer"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>

          {/* Reset Game */}
          <button
            onClick={onResetGame}
            title="Reset Board"
            className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

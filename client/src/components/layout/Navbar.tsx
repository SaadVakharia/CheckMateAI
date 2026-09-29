import React from 'react';
import { Globe, FileCode2, RotateCcw, BrainCircuit, Activity, HelpCircle, Sun, Moon } from 'lucide-react';
import { Logo } from '../common/Logo';
import { useTheme } from '../../context/ThemeContext';

interface NavbarProps {
  activeTab: 'board' | 'review' | 'puzzles' | 'analytics';
  onChangeTab: (tab: 'board' | 'review' | 'puzzles' | 'analytics') => void;
  onOpenSync: () => void;
  onOpenPgn: () => void;
  onResetGame: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onChangeTab,
  onOpenSync,
  onOpenPgn,
  onResetGame,
}) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 px-4 lg:px-8 py-3 transition-colors duration-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand with Logo */}
        <Logo />

        {/* Center Navigation Tabs */}
        <nav className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-900/90 p-1 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors">
          <button
            onClick={() => onChangeTab('board')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'board'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            <span>Analysis Board</span>
          </button>

          <button
            onClick={() => onChangeTab('review')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'review'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Game Review</span>
          </button>

          <button
            onClick={() => onChangeTab('puzzles')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'puzzles'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Mistake Puzzles</span>
          </button>
        </nav>

        {/* Quick Actions & Theme Switcher */}
        <div className="flex items-center space-x-2">
          {/* Light / Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl transition cursor-pointer"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>

          {/* Sync Button */}
          <button
            onClick={onOpenSync}
            title="1-Click Sync Chess.com / Lichess"
            className="px-3 py-1.5 bg-emerald-50 dark:bg-slate-900 hover:bg-emerald-100 dark:hover:bg-slate-800 border border-emerald-200 dark:border-slate-700/80 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Sync Match</span>
          </button>

          {/* PGN / FEN */}
          <button
            onClick={onOpenPgn}
            title="PGN or FEN Data"
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl transition cursor-pointer"
          >
            <FileCode2 className="w-4 h-4" />
          </button>

          {/* Reset Game */}
          <button
            onClick={onResetGame}
            title="Reset Board"
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

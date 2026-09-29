import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

/**
 * CheckMate AI Brand Logo Component
 * Modern geometric Knight emblem with cyber-emerald gradients and high-contrast typography.
 */
export const Logo: React.FC<LogoProps> = ({
  className = '',
  size = 'md',
  showSubtitle = true,
}) => {
  const iconSize = size === 'sm' ? 28 : size === 'lg' ? 44 : 36;
  const titleSize = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-2xl' : 'text-lg';

  return (
    <div className={`flex items-center space-x-2.5 select-none ${className}`}>
      {/* CheckMate AI Brand Emblem */}
      <div className="relative shrink-0 flex items-center justify-center transition-transform hover:scale-105 duration-200">
        <img
          src="/logo.png"
          alt="CheckMate AI Logo"
          width={iconSize}
          height={iconSize}
          className="rounded-lg object-contain drop-shadow-md select-none"
          style={{ width: `${iconSize}px`, height: `${iconSize}px` }}
        />
      </div>

      {/* Typography */}
      <div>
        <div className="flex items-center gap-1.5 leading-none">
          <span className={`font-black ${titleSize} tracking-tight text-slate-900 dark:text-white`}>
            Check<span className="bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 bg-clip-text text-transparent">Mate</span>
          </span>
          <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 tracking-wider">
            AI
          </span>
        </div>
        {showSubtitle && (
          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 hidden sm:block tracking-normal mt-0.5">
            AI Chess Match Analyzer & Coach
          </p>
        )}
      </div>
    </div>
  );
};

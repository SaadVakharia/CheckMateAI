import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, Sparkles, Crosshair } from 'lucide-react';

export interface MoveNotationDetails {
  pieceName: string;
  pieceSymbol: string;
  actionText: string;
  targetSquare: string;
  sourceSquare?: string;
  targetDesc: string;
  isCapture: boolean;
  isCheck: boolean;
  isCheckmate: boolean;
  isCastleKingside: boolean;
  isCastleQueenside: boolean;
  breakdown: { token: string; label: string; meaning: string }[];
  plainEnglish: string;
}

/**
 * Translates Standard Algebraic Notation (SAN) like 'Bxf3', 'Nxe5', 'O-O', 'Qh5#'
 * into a beginner-friendly plain English explanation with individual token breakdowns.
 */
export function parseSanToDetails(san: string, from?: string, to?: string): MoveNotationDetails {
  const clean = san.trim();

  // Castling
  if (clean === 'O-O' || clean === '0-0') {
    return {
      pieceName: 'King & Rook',
      pieceSymbol: '♔',
      actionText: 'Castles Kingside',
      targetSquare: 'g1/g8',
      sourceSquare: from,
      targetDesc: 'Kingside flank',
      isCapture: false,
      isCheck: false,
      isCheckmate: false,
      isCastleKingside: true,
      isCastleQueenside: false,
      breakdown: [
        { token: 'O-O', label: 'Kingside Castle', meaning: 'King moves 2 squares right; Rook hops over' },
      ],
      plainEnglish: 'Kingside Castling: King moves 2 squares to the right and the Rook hops over to protect the King.',
    };
  }

  if (clean === 'O-O-O' || clean === '0-0-0') {
    return {
      pieceName: 'King & Rook',
      pieceSymbol: '♔',
      actionText: 'Castles Queenside',
      targetSquare: 'c1/c8',
      sourceSquare: from,
      targetDesc: 'Queenside flank',
      isCapture: false,
      isCheck: false,
      isCheckmate: false,
      isCastleKingside: false,
      isCastleQueenside: true,
      breakdown: [
        { token: 'O-O-O', label: 'Queenside Castle', meaning: 'King moves 2 squares left; Rook hops over' },
      ],
      plainEnglish: 'Queenside Castling: King moves 2 squares to the left and the Rook hops over to the center.',
    };
  }

  const isCheckmate = clean.endsWith('#');
  const isCheck = clean.endsWith('+');
  const isCapture = clean.includes('x');

  // Identify piece letter
  const firstChar = clean[0];
  let pieceName = 'Pawn';
  let pieceSymbol = '♟';
  let tokenBreakdown: { token: string; label: string; meaning: string }[] = [];

  if (firstChar === 'K') {
    pieceName = 'King';
    pieceSymbol = '♚';
    tokenBreakdown.push({ token: 'K', label: 'King', meaning: 'The most important piece' });
  } else if (firstChar === 'Q') {
    pieceName = 'Queen';
    pieceSymbol = '♛';
    tokenBreakdown.push({ token: 'Q', label: 'Queen', meaning: 'Most powerful piece, moves in all directions' });
  } else if (firstChar === 'R') {
    pieceName = 'Rook';
    pieceSymbol = '♜';
    tokenBreakdown.push({ token: 'R', label: 'Rook', meaning: 'Moves straight along ranks and files' });
  } else if (firstChar === 'B') {
    pieceName = 'Bishop';
    pieceSymbol = '♝';
    tokenBreakdown.push({ token: 'B', label: 'Bishop', meaning: 'Moves diagonally on its square color' });
  } else if (firstChar === 'N') {
    pieceName = 'Knight';
    pieceSymbol = '♞';
    tokenBreakdown.push({ token: 'N', label: 'Knight', meaning: 'Moves in an L-shape and can jump over pieces' });
  } else {
    // Pawn
    pieceName = 'Pawn';
    pieceSymbol = '♟';
    if (isCapture) {
      tokenBreakdown.push({ token: firstChar, label: `${firstChar}-Pawn`, meaning: `Pawn on file ${firstChar}` });
    } else {
      tokenBreakdown.push({ token: '(Pawn)', label: 'Pawn', meaning: 'Pawns have no letter prefix in chess notation' });
    }
  }

  if (isCapture) {
    tokenBreakdown.push({ token: 'x', label: 'Captures', meaning: 'Takes the opposing piece on that square' });
  }

  // Extract destination square (last 2 letters/digits like e4, f3, d8)
  const squareMatch = clean.match(/([a-h][1-8])/);
  const targetSquare = to || (squareMatch ? squareMatch[1] : 'square');
  const file = targetSquare[0];
  const rank = targetSquare[1];
  const targetDesc = `Column ${file.toUpperCase()}, Row ${rank}`;

  tokenBreakdown.push({
    token: targetSquare,
    label: `Square ${targetSquare}`,
    meaning: `Coordinate: file ${file.toUpperCase()}, rank ${rank}`,
  });

  if (isCheckmate) {
    tokenBreakdown.push({ token: '#', label: 'Checkmate', meaning: 'The opposing King is attacked and cannot escape' });
  } else if (isCheck) {
    tokenBreakdown.push({ token: '+', label: 'Check', meaning: 'The opposing King is directly attacked' });
  }

  let plainEnglish = '';
  if (from && to) {
    plainEnglish = isCapture
      ? `${pieceName} on ${from} moves to ${to} and captures the enemy piece.`
      : `${pieceName} on ${from} advances to square ${to}.`;
  } else {
    plainEnglish = isCapture
      ? `${pieceName} captures the enemy piece on square ${targetSquare}.`
      : `${pieceName} moves to square ${targetSquare}.`;
  }

  if (isCheckmate) {
    plainEnglish += ' Delivers Checkmate!';
  } else if (isCheck) {
    plainEnglish += ' Attacks the King (Check)!';
  }

  return {
    pieceName,
    pieceSymbol,
    actionText: isCapture ? 'Captures on' : 'Moves to',
    targetSquare,
    sourceSquare: from,
    targetDesc,
    isCapture,
    isCheck,
    isCheckmate,
    isCastleKingside: false,
    isCastleQueenside: false,
    breakdown: tokenBreakdown,
    plainEnglish,
  };
}

interface MoveNotationTooltipProps {
  san: string;
  from?: string;
  to?: string;
  className?: string;
  variant?: 'blunder' | 'best' | 'normal';
  onHoverChange?: (isHovered: boolean, from?: string, to?: string) => void;
}

export const MoveNotationTooltip: React.FC<MoveNotationTooltipProps> = ({
  san,
  from,
  to,
  className = '',
  variant = 'normal',
  onHoverChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    placement: 'top' | 'bottom';
    arrowLeft: number;
  }>({
    top: 0,
    left: 0,
    placement: 'bottom',
    arrowLeft: 160,
  });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const details = parseSanToDetails(san, from, to);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipWidth = Math.min(320, window.innerWidth - 32);
    const tooltipHeight = 270;

    // Prefer opening below unless there is not enough room below AND plenty of room above
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let placement: 'top' | 'bottom' = 'bottom';
    let top = 0;

    // If space below is at least 220px or greater than space above, place below!
    if (spaceBelow >= 220 || spaceBelow >= spaceAbove) {
      placement = 'bottom';
      top = rect.bottom + 8;
    } else {
      placement = 'top';
      top = Math.max(16, rect.top - tooltipHeight - 8);
    }

    // Clamp horizontally to stay completely within screen viewport
    const triggerCenter = rect.left + rect.width / 2;
    let left = triggerCenter - tooltipWidth / 2;
    if (left < 16) left = 16;
    if (left + tooltipWidth > window.innerWidth - 16) {
      left = window.innerWidth - 16 - tooltipWidth;
    }

    const arrowLeft = Math.max(16, Math.min(triggerCenter - left, tooltipWidth - 16));

    setCoords({ top, left, placement, arrowLeft });
  };

  const handleMouseEnter = () => {
    updatePosition();
    setIsOpen(true);
    onHoverChange?.(true, from, to);
  };

  const handleMouseLeave = () => {
    setIsOpen(false);
    onHoverChange?.(false, from, to);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleScrollOrResize = () => updatePosition();
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  const badgeColorClass =
    variant === 'blunder'
      ? 'text-red-600 dark:text-red-400 border-b-2 border-red-400 border-dotted hover:bg-red-500/10'
      : variant === 'best'
      ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-400 border-dotted hover:bg-emerald-500/10'
      : 'text-sky-600 dark:text-sky-400 border-b-2 border-sky-400 border-dotted hover:bg-sky-500/10';

  return (
    <>
      <span
        ref={triggerRef}
        className="relative inline-block"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <span
          className={`font-mono font-bold px-1 py-0.5 rounded transition-all cursor-help inline-flex items-center gap-1 ${badgeColorClass} ${className}`}
        >
          <span>{san}</span>
          <HelpCircle className="w-3 h-3 opacity-60 hover:opacity-100 transition-opacity shrink-0" />
        </span>
      </span>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: '320px',
              maxWidth: 'calc(100vw - 32px)',
              zIndex: 99999,
            }}
            onMouseEnter={() => {
              setIsOpen(true);
              onHoverChange?.(true, from, to);
            }}
            onMouseLeave={handleMouseLeave}
            className="p-3.5 bg-slate-900/98 dark:bg-[#070c18]/98 backdrop-blur-2xl border border-sky-500/40 rounded-2xl shadow-2xl shadow-black/80 text-white text-left animate-in fade-in zoom-in-95 duration-150 select-none pointer-events-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-700/60 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xl leading-none">{details.pieceSymbol}</span>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{details.pieceName}</span>
                    <span className="text-[10px] font-mono text-sky-400">({san})</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">Chess Notation Guide</div>
                </div>
              </div>

              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                BEGINNER HINT
              </span>
            </div>

            {/* Plain English Translation */}
            <div className="p-2 bg-slate-800/60 dark:bg-slate-900/80 rounded-xl border border-slate-700/40 text-xs text-sky-200 leading-snug font-medium mb-2.5">
              "{details.plainEnglish}"
            </div>

            {/* Token Breakdown */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                How to read "{san}":
              </div>
              <div className="grid grid-cols-1 gap-1">
                {details.breakdown.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-2 py-1 rounded-lg bg-slate-800/40 border border-slate-700/30 text-[11px]"
                  >
                    <span className="font-mono font-bold text-amber-300 bg-amber-500/10 px-1.5 py-0.2 rounded">
                      {item.token}
                    </span>
                    <span className="text-slate-300 font-semibold">{item.label}</span>
                    <span className="text-slate-400 text-[10px] truncate max-w-[120px]">{item.meaning}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Source / Target Coordinate indicator */}
            {details.sourceSquare && details.targetSquare && (
              <div className="mt-2.5 pt-2 border-t border-slate-700/60 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Crosshair className="w-3 h-3 text-sky-400" />
                  From <strong className="text-white font-mono">{details.sourceSquare}</strong> ➔ To{' '}
                  <strong className="text-white font-mono">{details.targetSquare}</strong>
                </span>
                <span className="text-sky-400 font-bold">Highlighted on board</span>
              </div>
            )}

            {/* Tooltip caret */}
            {coords.placement === 'bottom' ? (
              <div
                style={{ left: `${coords.arrowLeft}px` }}
                className="absolute bottom-full -translate-x-1/2 -mb-1 border-4 border-transparent border-b-slate-900 dark:border-b-[#070c18]"
              />
            ) : (
              <div
                style={{ left: `${coords.arrowLeft}px` }}
                className="absolute top-full -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-[#070c18]"
              />
            )}
          </div>,
          document.body
        )}
    </>
  );
};

interface ChessGlossaryHintProps {
  term: 'blunder' | 'refutation' | 'centipawns' | 'acpl' | 'fork' | 'pin';
  children: React.ReactNode;
  className?: string;
}

const GLOSSARY_TERMS: Record<string, { title: string; desc: string; tip: string }> = {
  blunder: {
    title: 'Blunder (??)',
    desc: 'A game-changing tactical mistake that immediately hands the advantage or material to the opponent.',
    tip: 'Always look for undefended pieces and check threats before committing your move.',
  },
  refutation: {
    title: 'Tactical Refutation',
    desc: 'The best engine move that decisively punishes the opponent’s mistake or takes material.',
    tip: 'Look for forcing moves: checks, captures, and threats that opponent cannot counter.',
  },
  centipawns: {
    title: 'Centipawns (cp)',
    desc: 'The unit chess engines use to measure advantage. 100 centipawns = 1 full pawn.',
    tip: '+150 means White is up 1.5 pawns in advantage; -200 means Black has a 2-pawn advantage.',
  },
  acpl: {
    title: 'ACPL (Average Centipawn Loss)',
    desc: 'How much advantage a player lost per move compared to the perfect Stockfish engine.',
    tip: 'Grandmasters typically score 10-25 ACPL; club players average 35-70 ACPL.',
  },
  fork: {
    title: 'Fork',
    desc: 'A single piece attacks two or more enemy pieces simultaneously.',
    tip: 'Knights and pawns are notorious for devastating forks!',
  },
  pin: {
    title: 'Pin',
    desc: 'A piece cannot move because doing so would expose a more valuable piece (like King or Queen) behind it.',
    tip: 'An absolute pin on the King is illegal to break.',
  },
};

export const ChessGlossaryHint: React.FC<ChessGlossaryHintProps> = ({ term, children, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    placement: 'top' | 'bottom';
    arrowLeft: number;
  }>({
    top: 0,
    left: 0,
    placement: 'bottom',
    arrowLeft: 130,
  });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const info = GLOSSARY_TERMS[term] || {
    title: term,
    desc: 'Chess strategic term',
    tip: 'Practice tactical awareness.',
  };

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipWidth = 260;
    const tooltipHeight = 160;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let placement: 'top' | 'bottom' = 'bottom';
    let top = 0;

    if (spaceBelow >= tooltipHeight + 16 || spaceBelow >= spaceAbove) {
      placement = 'bottom';
      top = rect.bottom + 8;
    } else {
      placement = 'top';
      top = Math.max(16, rect.top - tooltipHeight - 8);
    }

    const triggerCenter = rect.left + rect.width / 2;
    let left = triggerCenter - tooltipWidth / 2;
    if (left < 16) left = 16;
    if (left + tooltipWidth > window.innerWidth - 16) {
      left = window.innerWidth - 16 - tooltipWidth;
    }

    const arrowLeft = Math.max(16, Math.min(triggerCenter - left, tooltipWidth - 16));

    setCoords({ top, left, placement, arrowLeft });
  };

  const handleMouseEnter = () => {
    updatePosition();
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleScrollOrResize = () => updatePosition();
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  return (
    <>
      <span
        ref={triggerRef}
        className="relative inline-block cursor-help"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setIsOpen(false)}
      >
        <span className={`border-b border-dotted border-slate-400 hover:text-sky-500 transition-colors ${className}`}>
          {children}
        </span>
      </span>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: '260px',
              maxWidth: 'calc(100vw - 32px)',
              zIndex: 99999,
            }}
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
            className="p-3 bg-slate-900/98 dark:bg-[#070c18]/98 backdrop-blur-2xl border border-sky-500/40 rounded-xl shadow-2xl text-white text-xs text-left animate-in fade-in duration-150 select-none pointer-events-auto"
          >
            <div className="font-bold text-sky-400 text-xs mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{info.title}</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed mb-1.5">{info.desc}</p>
            <div className="text-[10px] text-amber-300 bg-amber-500/10 p-1.5 rounded border border-amber-500/20 leading-tight">
              💡 {info.tip}
            </div>

            {coords.placement === 'bottom' ? (
              <div
                style={{ left: `${coords.arrowLeft}px` }}
                className="absolute bottom-full -translate-x-1/2 -mb-1 border-4 border-transparent border-b-slate-900 dark:border-b-[#070c18]"
              />
            ) : (
              <div
                style={{ left: `${coords.arrowLeft}px` }}
                className="absolute top-full -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-[#070c18]"
              />
            )}
          </div>,
          document.body
        )}
    </>
  );
};

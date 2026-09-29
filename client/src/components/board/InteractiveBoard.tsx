import React, { useState, useMemo } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import type { Square, PieceSymbol } from 'chess.js';
import { EvalBar } from './EvalBar';
import { CapturedPieces } from './CapturedPieces';
import { MoveControls } from './MoveControls';
import { CoachFeedbackBar } from './CoachFeedbackBar';
import { ClassificationBadge } from '../common/ClassificationBadge';
import { useTheme } from '../../context/ThemeContext';
import type { MoveAnalysis } from '../../types/chess';

interface InteractiveBoardProps {
  game: Chess;
  isFlipped: boolean;
  scoreCp: number;
  mate?: number;
  currentPly: number;
  totalPlies: number;
  isPlaying: boolean;
  isMuted: boolean;
  bestMove?: string; // e.g. "e2e4" or "Nf3"
  secondaryMoves?: string[];
  currentAnalysis?: MoveAnalysis;
  players?: {
    white: string;
    black: string;
    whiteElo?: string;
    blackElo?: string;
  };
  showCoachFeedbackBar?: boolean;
  onMakeMove: (sourceSquare: string, targetSquare: string) => boolean;
  onFirst: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLast: () => void;
  onTogglePlay: () => void;
  onFlipBoard: () => void;
  onToggleMute: () => void;
  onRetryMove?: () => void;
}

function resolveMoveToSquares(game: Chess, moveStr?: string): { startSquare: string; endSquare: string } | null {
  if (!moveStr) return null;

  try {
    const legalMoves = game.moves({ verbose: true });

    // 1. If it's SAN format like "Nf3", "exd5", "O-O", "Qxf7#"
    const foundSan = legalMoves.find((m) => m.san === moveStr);
    if (foundSan) {
      return {
        startSquare: foundSan.from,
        endSquare: foundSan.to,
      };
    }

    // 2. If it's UCI format like "e2e4" or "g1f3" or "e7e8q", ensure it is a legal move on this board
    if (/^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(moveStr)) {
      const from = moveStr.slice(0, 2).toLowerCase();
      const to = moveStr.slice(2, 4).toLowerCase();
      const foundUci = legalMoves.find((m) => m.from === from && m.to === to);
      if (foundUci) {
        return {
          startSquare: from,
          endSquare: to,
        };
      }
    }
  } catch {
    // ignore
  }

  return null;
}

export const InteractiveBoard: React.FC<InteractiveBoardProps> = ({
  game,
  isFlipped,
  scoreCp,
  mate,
  currentPly,
  totalPlies,
  isPlaying,
  isMuted,
  bestMove,
  secondaryMoves,
  currentAnalysis,
  players,
  showCoachFeedbackBar = false,
  onMakeMove,
  onFirst,
  onPrev,
  onNext,
  onLast,
  onTogglePlay,
  onFlipBoard,
  onToggleMute,
  onRetryMove,
}) => {
  const { isDark } = useTheme();
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);
  const [showBestMoveArrow, setShowBestMoveArrow] = useState<boolean>(true);

  // Player orientation and names
  const topIsWhite = isFlipped;
  const topPlayerName = topIsWhite ? (players?.white || 'White') : (players?.black || 'Black');
  const topPlayerElo = topIsWhite ? players?.whiteElo : players?.blackElo;
  const isTopTurn = (topIsWhite && game.turn() === 'w') || (!topIsWhite && game.turn() === 'b');

  const bottomIsWhite = !isFlipped;
  const bottomPlayerName = bottomIsWhite ? (players?.white || 'White') : (players?.black || 'Black');
  const bottomPlayerElo = bottomIsWhite ? players?.whiteElo : players?.blackElo;
  const isBottomTurn = (bottomIsWhite && game.turn() === 'w') || (!bottomIsWhite && game.turn() === 'b');

  // Calculate captured pieces
  const capturedWhite: PieceSymbol[] = [];
  const capturedBlack: PieceSymbol[] = [];

  const history = game.history({ verbose: true });
  history.forEach((m) => {
    if (m.captured) {
      if (m.color === 'w') {
        capturedBlack.push(m.captured);
      } else {
        capturedWhite.push(m.captured);
      }
    }
  });

  // Calculate material difference
  const pieceWeights: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  const whiteLost = capturedWhite.reduce((sum, p) => sum + pieceWeights[p], 0);
  const blackLost = capturedBlack.reduce((sum, p) => sum + pieceWeights[p], 0);

  const whiteAdvantage = Math.max(0, blackLost - whiteLost);
  const blackAdvantage = Math.max(0, whiteLost - blackLost);

  // Locate the King square under check
  const kingInCheckSquare = useMemo(() => {
    if (!game.inCheck()) return null;
    const board = game.board();
    const turn = game.turn();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === 'k' && p.color === turn) {
          return (String.fromCharCode(97 + c) + (8 - r)) as Square;
        }
      }
    }
    return null;
  }, [game]);

  // Generate arrows for best move and secondary MultiPV moves
  const arrows = [];
  if (showBestMoveArrow) {
    const primaryResolved = resolveMoveToSquares(game, bestMove);
    if (primaryResolved) {
      arrows.push({
        startSquare: primaryResolved.startSquare,
        endSquare: primaryResolved.endSquare,
        color: isDark ? '#10b981' : '#059669',
      });
    }

    if (secondaryMoves && secondaryMoves.length > 0) {
      const secondaryColors = isDark ? ['#38bdf8', '#f59e0b'] : ['#0284c7', '#d97706'];
      secondaryMoves.forEach((sm, idx) => {
        const resolved = resolveMoveToSquares(game, sm);
        if (
          resolved &&
          (resolved.startSquare !== primaryResolved?.startSquare ||
            resolved.endSquare !== primaryResolved?.endSquare)
        ) {
          arrows.push({
            startSquare: resolved.startSquare,
            endSquare: resolved.endSquare,
            color: secondaryColors[idx % secondaryColors.length],
          });
        }
      });
    }
  }

  // Handle click to move
  const handleSquareClick = (square: Square) => {
    if (!selectedSquare) {
      const piece = game.get(square);
      if (piece && piece.color === game.turn()) {
        setSelectedSquare(square);
        const moves = game.moves({ square, verbose: true });
        setLegalMoves(moves.map((m) => m.to as Square));
      }
    } else {
      if (legalMoves.includes(square)) {
        onMakeMove(selectedSquare, square);
      }
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  };

  // Custom square styles for legal targets and selected piece
  const customSquareStyles: Record<string, React.CSSProperties> = {};
  if (selectedSquare) {
    customSquareStyles[selectedSquare] = {
      backgroundColor: isDark ? 'rgba(2, 132, 199, 0.45)' : 'rgba(2, 132, 199, 0.3)'
    };
  }
  legalMoves.forEach((sq) => {
    const piece = game.get(sq);
    customSquareStyles[sq] = {
      background: piece
        ? 'radial-gradient(circle, rgba(239, 68, 68, 0.7) 85%, transparent 85%)'
        : isDark
        ? 'radial-gradient(circle, rgba(56, 189, 248, 0.7) 25%, transparent 25%)'
        : 'radial-gradient(circle, rgba(2, 132, 199, 0.8) 25%, transparent 25%)',
      borderRadius: '50%',
      cursor: 'pointer',
    };
  });

  return (
    <div className="flex flex-col h-full justify-between select-none min-h-0 gap-1.5">
      {/* Top Player & Captured pieces */}
      <div className="flex items-center justify-between px-1 text-xs py-0.5 shrink-0">
        <div className="flex items-center space-x-2 min-w-0">
          <div
            className={`w-3 h-3 rounded-full shrink-0 shadow-2xs transition-all ${
              topIsWhite
                ? 'bg-slate-100 border border-slate-300'
                : 'bg-slate-800 dark:bg-slate-900 border border-slate-600'
            } ${isTopTurn ? 'ring-2 ring-sky-400 ring-offset-1 ring-offset-transparent' : ''}`}
            title={`${topIsWhite ? 'White' : 'Black'}${isTopTurn ? ' (To move)' : ''}`}
          />
          <div className="flex items-center gap-1.5 truncate">
            <span className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate max-w-[140px] sm:max-w-[200px]">
              {topPlayerName}
            </span>
            {topPlayerElo && (
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-200/70 dark:bg-slate-800 px-1.5 py-0.2 rounded font-semibold shrink-0">
                {topPlayerElo}
              </span>
            )}
          </div>
          <CapturedPieces
            captured={isFlipped ? capturedWhite : capturedBlack}
            advantage={isFlipped ? whiteAdvantage : blackAdvantage}
            color={isFlipped ? 'w' : 'b'}
          />
        </div>
        {game.inCheck() && game.turn() === (isFlipped ? 'w' : 'b') && (
          <span className="text-red-600 dark:text-red-400 font-bold px-2 py-0.5 rounded bg-red-100 dark:bg-red-950/40 border border-red-300 dark:border-red-800 animate-pulse text-[10px] shrink-0">
            CHECK
          </span>
        )}
      </div>

      {/* Main Board + Eval Bar row */}
      <div className="flex items-center justify-center gap-2 flex-1 min-h-0 py-0.5 overflow-hidden">
        {/* Real-time Eval Bar */}
        <div className={`h-full flex items-center justify-center ${
          showCoachFeedbackBar
            ? 'max-h-[min(480px,calc(100vh-270px))]'
            : 'max-h-[min(560px,calc(100vh-210px))]'
        }`}>
          <EvalBar scoreCp={scoreCp} mate={mate} isFlipped={isFlipped} />
        </div>

        {/* The Chessboard with Chess.com Badge Overlay */}
        <div className={`relative aspect-square h-full rounded-xl overflow-hidden shadow-xl border border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 transition-colors ${
          showCoachFeedbackBar
            ? 'max-h-[min(480px,calc(100vh-270px))]'
            : 'max-h-[min(560px,calc(100vh-210px))]'
        }`}>
          <Chessboard
            options={{
              position: game.fen(),
              boardOrientation: isFlipped ? 'black' : 'white',
              arrows,
              squareStyles: customSquareStyles,
              darkSquareStyle: { backgroundColor: isDark ? '#1e324d' : '#3e628d' },
              lightSquareStyle: { backgroundColor: isDark ? '#d8e4f2' : '#e8f1fa' },
              animationDurationInMs: 200,
              allowDragging: true,
              squareRenderer: ({ square, children }) => {
                const isTarget = currentAnalysis && currentAnalysis.to === square;
                const isSource = currentAnalysis && currentAnalysis.from === square;
                const isKingDanger = kingInCheckSquare === square;

                return (
                  <div className="relative w-full h-full flex items-center justify-center">
                    {/* King In Check danger glow */}
                    {isKingDanger && (
                      <div className="absolute inset-0 bg-red-600/35 dark:bg-red-600/45 animate-pulse rounded-sm pointer-events-none" />
                    )}

                    {/* Last Move Soft Highlight */}
                    {(isTarget || isSource) && (
                      <div className="absolute inset-0 bg-yellow-400/25 dark:bg-yellow-400/20 pointer-events-none" />
                    )}

                    {/* Piece element */}
                    {children}

                    {/* Chess.com floating classification badge on target square */}
                    {isTarget && currentAnalysis.classification && (
                      <div className="absolute top-0.5 right-0.5 z-20 pointer-events-none drop-shadow-md transform scale-75 sm:scale-85 origin-top-right">
                        <ClassificationBadge classification={currentAnalysis.classification} size="xs" />
                      </div>
                    )}
                  </div>
                );
              },
              onPieceDrop: ({ sourceSquare, targetSquare }) => {
                if (!sourceSquare || !targetSquare) return false;
                const res = onMakeMove(sourceSquare, targetSquare);
                setSelectedSquare(null);
                setLegalMoves([]);
                return res;
              },
              onSquareClick: ({ square }) => handleSquareClick(square as Square),
            }}
          />
        </div>
      </div>

      {/* Bottom Player & Captured pieces */}
      <div className="flex items-center justify-between px-1 text-xs py-0.5 shrink-0">
        <div className="flex items-center space-x-2 min-w-0">
          <div
            className={`w-3 h-3 rounded-full shrink-0 shadow-2xs transition-all ${
              bottomIsWhite
                ? 'bg-slate-100 border border-slate-300'
                : 'bg-slate-800 dark:bg-slate-900 border border-slate-600'
            } ${isBottomTurn ? 'ring-2 ring-sky-400 ring-offset-1 ring-offset-transparent' : ''}`}
            title={`${bottomIsWhite ? 'White' : 'Black'}${isBottomTurn ? ' (To move)' : ''}`}
          />
          <div className="flex items-center gap-1.5 truncate">
            <span className="font-bold text-slate-900 dark:text-white text-xs truncate max-w-[140px] sm:max-w-[200px]">
              {bottomPlayerName}
            </span>
            {bottomPlayerElo && (
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-200/70 dark:bg-slate-800 px-1.5 py-0.2 rounded font-semibold shrink-0">
                {bottomPlayerElo}
              </span>
            )}
          </div>
          <CapturedPieces
            captured={isFlipped ? capturedBlack : capturedWhite}
            advantage={isFlipped ? blackAdvantage : whiteAdvantage}
            color={isFlipped ? 'b' : 'w'}
          />
        </div>
        {game.inCheck() && game.turn() === (isFlipped ? 'b' : 'w') && (
          <span className="text-red-600 dark:text-red-400 font-bold px-2 py-0.5 rounded bg-red-100 dark:bg-red-950/40 border border-red-300 dark:border-red-800 animate-pulse text-[10px] shrink-0">
            CHECK
          </span>
        )}
      </div>

      {/* Signature Chess.com Coach Feedback Bar */}
      {showCoachFeedbackBar && (
        <CoachFeedbackBar
          currentAnalysis={currentAnalysis}
          showBestMoveArrow={showBestMoveArrow}
          onToggleBestMoveArrow={() => setShowBestMoveArrow(!showBestMoveArrow)}
          onRetryMove={onRetryMove}
        />
      )}

      {/* Navigation Controls */}
      <div className="shrink-0">
        <MoveControls
          currentPly={currentPly}
          totalPlies={totalPlies}
          isPlaying={isPlaying}
          isMuted={isMuted}
          onFirst={onFirst}
          onPrev={onPrev}
          onNext={onNext}
          onLast={onLast}
          onTogglePlay={onTogglePlay}
          onFlipBoard={onFlipBoard}
          onToggleMute={onToggleMute}
        />
      </div>
    </div>
  );
};

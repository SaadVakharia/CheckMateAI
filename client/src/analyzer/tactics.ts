import { Chess } from 'chess.js';
import type { Square, PieceSymbol } from 'chess.js';
import type { TacticalMotif } from '../types/chess';

const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 100,
};

/**
 * Detects tactical patterns in a move and infers the human player's psychological intent.
 */
export function analyzeTactics(
  fenBefore: string,
  fenAfter: string,
  moveSan?: string
): { motifs: TacticalMotif[]; intentExplanation: string; isSacrifice: boolean; hungValue: number } {
  const motifs: TacticalMotif[] = [];
  let isSacrifice = false;
  let intentExplanation = '';
  let hungValue = 0;

  try {
    const chessBefore = new Chess(fenBefore);
    const chessAfter = new Chess(fenAfter);
    let lastMove: any = null;

    if (moveSan) {
      try {
        lastMove = chessBefore.move(moveSan);
      } catch {
        // fallback
      }
    }

    if (!lastMove) {
      const candidates = chessBefore.moves({ verbose: true });
      lastMove = candidates.find((m) => {
        const test = new Chess(fenBefore);
        test.move(m);
        return test.fen() === fenAfter;
      });
    }

    if (!lastMove) {
      return { motifs, intentExplanation, isSacrifice, hungValue };
    }

    const movingPiece = lastMove.piece as PieceSymbol;
    const movingValue = PIECE_VALUES[movingPiece] || 1;
    const targetSquare = lastMove.to as Square;

    // 1. Direct check against the King
    if (chessAfter.inCheck()) {
      motifs.push('checkmate_threat');
      intentExplanation = `Direct check against the enemy King.`;
    }

    // 2. Fork / Double Attack: Moving piece attacks 2 or more enemy pieces of value >= 3
    const attackedSquares: Square[] = [];
    const board = chessAfter.board();

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.color !== lastMove.color && piece.type !== 'p') {
          const sq = (String.fromCharCode(97 + c) + (8 - r)) as Square;
          if (isSquareAttackedBy(chessAfter, targetSquare, sq)) {
            attackedSquares.push(sq);
          }
        }
      }
    }

    if (attackedSquares.length >= 2) {
      motifs.push('fork');
      intentExplanation = intentExplanation || `Forking multiple enemy pieces simultaneously.`;
    }

    // 3. Hanging Piece (Direct): Moving a piece to a square attacked by enemy without equal protection
    const isAttackedByEnemy = isSquareDefendedByEnemy(chessAfter, targetSquare, lastMove.color);
    const isProtectedByFriendly = isSquareDefendedByFriendly(chessAfter, targetSquare, lastMove.color);

    if (isAttackedByEnemy && !isProtectedByFriendly && movingValue >= 3) {
      motifs.push('hanging_piece');
      isSacrifice = true;
      hungValue = movingValue * 100;
      intentExplanation = `Blunders ${lastMove.san} directly into enemy crosshairs!`;
    }

    // 4. Leaving an existing major/minor piece hanging (Indirect Blunder)
    if (!motifs.includes('hanging_piece')) {
      const enemyMoves = chessAfter.moves({ verbose: true });
      for (const em of enemyMoves) {
        if (em.captured) {
          const capVal = PIECE_VALUES[em.captured as PieceSymbol] || 1;
          const attackerVal = PIECE_VALUES[em.piece as PieceSymbol] || 1;
          const capturedSq = em.to as Square;
          const isFriendlyDefended = isSquareDefendedByFriendly(chessAfter, capturedSq, lastMove.color);

          if (capVal >= 3 && (!isFriendlyDefended || capVal > attackerVal)) {
            motifs.push('hanging_piece');
            hungValue = Math.max(hungValue, capVal * 100);
            intentExplanation = `Leaves the ${em.captured?.toUpperCase()} on ${capturedSq} exposed to capture!`;
            break;
          }
        }
      }
    }

    // 5. Back-rank infiltration
    const enemyKingRank = lastMove.color === 'w' ? '8' : '1';
    if (lastMove.to.endsWith(enemyKingRank) && (movingPiece === 'r' || movingPiece === 'q')) {
      motifs.push('back_rank');
      intentExplanation = intentExplanation || `Infiltrating the back rank to exploit trapped King defense.`;
    }

    if (!intentExplanation) {
      if (lastMove.captured) {
        intentExplanation = `Capturing the piece on ${lastMove.to} to win material.`;
      } else if (movingPiece === 'p') {
        intentExplanation = `Advancing pawn to gain space and challenge central squares.`;
      } else {
        intentExplanation = `Repositioning ${lastMove.piece.toUpperCase()} to ${lastMove.to} to improve piece activity.`;
      }
    }
  } catch (err) {
    console.error('Error analyzing tactics', err);
  }

  return { motifs, intentExplanation, isSacrifice, hungValue };
}

function isSquareAttackedBy(chess: Chess, from: Square, to: Square): boolean {
  try {
    const moves = chess.moves({ square: from, verbose: true });
    return moves.some((m) => m.to === to);
  } catch {
    return false;
  }
}

function isSquareDefendedByEnemy(chess: Chess, sq: Square, friendlyColor: 'w' | 'b'): boolean {
  // It is now the opponent's turn in chessAfter
  const moves = chess.moves({ verbose: true });
  return moves.some((m) => m.to === sq && m.color !== friendlyColor);
}

function isSquareDefendedByFriendly(chess: Chess, sq: Square, friendlyColor: 'w' | 'b'): boolean {
  // Switch turn to check if friendly pieces can move to this square
  const fen = chess.fen();
  const tokens = fen.split(' ');
  tokens[1] = friendlyColor; // force friendly turn
  try {
    const testChess = new Chess(tokens.join(' '));
    const moves = testChess.moves({ verbose: true });
    return moves.some((m) => m.to === sq);
  } catch {
    return false;
  }
}

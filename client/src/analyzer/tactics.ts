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
      if (lastMove.flags.includes('k') || lastMove.flags.includes('q')) {
        intentExplanation = `Castles to tuck the King into safety and activate the rook toward central open files.`;
      } else if (lastMove.captured) {
        const capName = lastMove.captured === 'p' ? 'pawn' : lastMove.captured === 'n' ? 'knight' : lastMove.captured === 'b' ? 'bishop' : lastMove.captured === 'r' ? 'rook' : lastMove.captured === 'q' ? 'queen' : 'piece';
        intentExplanation = `Captures the ${capName} on ${lastMove.to} to contest material and remove a key defender.`;
      } else if (movingPiece === 'p') {
        if (['d4', 'd5', 'e4', 'e5'].includes(lastMove.to)) {
          intentExplanation = `Claims vital central territory and opens crucial diagonal pathways for piece development.`;
        } else if (['c4', 'c5', 'f4', 'f5'].includes(lastMove.to)) {
          intentExplanation = `Challenges the opponent's pawn structure and fights for central flank control.`;
        } else {
          intentExplanation = `Solidifies the pawn structure and reinforces nearby outpost squares.`;
        }
      } else if (movingPiece === 'n') {
        if (['f3', 'c3', 'f6', 'c6'].includes(lastMove.to)) {
          intentExplanation = `Develops the knight toward the active center, supporting key central squares.`;
        } else if (['d5', 'e5', 'd4', 'e4'].includes(lastMove.to)) {
          intentExplanation = `Anchors the knight onto a commanding central outpost, radiating influence across both flanks.`;
        } else {
          intentExplanation = `Repositioning the Knight to ${lastMove.to} to improve piece activity and coordination.`;
        }
      } else if (movingPiece === 'b') {
        if (['c4', 'c5', 'b5', 'b4', 'e7', 'e2', 'd3', 'd6', 'g4', 'g5', 'f4', 'f5'].includes(lastMove.to)) {
          intentExplanation = `Develops the bishop along an active diagonal to pressure opponent targets and prepare castling.`;
        } else {
          intentExplanation = `Fianchettoes or repositions the bishop to seize long diagonal influence.`;
        }
      } else if (movingPiece === 'r') {
        intentExplanation = `Slides the rook onto an active file to dominate file pressure and prepare battery infiltration.`;
      } else if (movingPiece === 'q') {
        intentExplanation = `Centralizes the Queen to coordinate attacks and exert multi-directional tactical pressure.`;
      } else if (movingPiece === 'k') {
        intentExplanation = `Steps the King to ${lastMove.to} to evade pins, improve endgame activity, or find safety.`;
      } else {
        intentExplanation = `Plays ${lastMove.san} to optimize piece coordination.`;
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

// ECO Opening Book and theory recognizer for Milestone 3

export interface OpeningEntry {
  eco: string;
  name: string;
  moves: string[]; // sequence of SAN moves
}

export const OPENING_BOOK: OpeningEntry[] = [
  // E4 Openings
  { eco: 'C50', name: 'Italian Game: Giuoco Piano', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'] },
  { eco: 'C55', name: 'Two Knights Defense', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6'] },
  { eco: 'C60', name: 'Ruy Lopez (Spanish Opening)', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'] },
  { eco: 'C65', name: 'Ruy Lopez: Berlin Defense', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6'] },
  { eco: 'C88', name: 'Ruy Lopez: Closed', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7'] },
  { eco: 'C42', name: "Petrov's Defense", moves: ['e4', 'e5', 'Nf3', 'Nf6'] },
  { eco: 'C44', name: 'Scotch Game', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4'] },
  { eco: 'C20', name: "King's Pawn Game", moves: ['e4', 'e5'] },
  { eco: 'C23', name: "Bishop's Opening", moves: ['e4', 'e5', 'Bc4'] },
  { eco: 'C25', name: 'Vienna Game', moves: ['e4', 'e5', 'Nc3'] },
  { eco: 'C30', name: "King's Gambit", moves: ['e4', 'e5', 'f4'] },

  // Semi-Open E4
  { eco: 'B90', name: 'Sicilian Defense: Najdorf Variation', moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'] },
  { eco: 'B70', name: 'Sicilian Defense: Dragon Variation', moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6'] },
  { eco: 'B20', name: 'Sicilian Defense', moves: ['e4', 'c5'] },
  { eco: 'B22', name: 'Sicilian Defense: Alapin Variation', moves: ['e4', 'c5', 'c3'] },
  { eco: 'C00', name: 'French Defense', moves: ['e4', 'e6'] },
  { eco: 'C10', name: 'French Defense: Paulsen Variation', moves: ['e4', 'e6', 'd4', 'd5', 'Nc3'] },
  { eco: 'C02', name: 'French Defense: Advance Variation', moves: ['e4', 'e6', 'd4', 'd5', 'e5'] },
  { eco: 'B10', name: 'Caro-Kann Defense', moves: ['e4', 'c6'] },
  { eco: 'B12', name: 'Caro-Kann Defense: Advance Variation', moves: ['e4', 'c6', 'd4', 'd5', 'e5'] },
  { eco: 'B01', name: 'Scandinavian Defense', moves: ['e4', 'd5'] },
  { eco: 'B07', name: 'Pirc Defense', moves: ['e4', 'd6', 'd4', 'Nf6'] },
  { eco: 'B02', name: "Alekhine's Defense", moves: ['e4', 'Nf6'] },

  // D4 Openings
  { eco: 'D06', name: "Queen's Gambit", moves: ['d4', 'd5', 'c4'] },
  { eco: 'D20', name: "Queen's Gambit Accepted", moves: ['d4', 'd5', 'c4', 'dxc4'] },
  { eco: 'D30', name: "Queen's Gambit Declined", moves: ['d4', 'd5', 'c4', 'e6'] },
  { eco: 'D10', name: 'Slav Defense', moves: ['d4', 'd5', 'c4', 'c6'] },
  { eco: 'D02', name: 'London System', moves: ['d4', 'd5', 'Bf4'] },
  { eco: 'D00', name: "Queen's Pawn Game", moves: ['d4', 'd5'] },
  { eco: 'E60', name: "King's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'g6'] },
  { eco: 'E20', name: 'Nimzo-Indian Defense', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4'] },
  { eco: 'E12', name: "Queen's Indian Defense", moves: ['d4', 'Nf6', 'c4', 'e6', 'Nf3', 'b6'] },
  { eco: 'A80', name: 'Dutch Defense', moves: ['d4', 'f5'] },
  { eco: 'A57', name: 'Benko Gambit', moves: ['d4', 'Nf6', 'c4', 'c5', 'd5', 'b5'] },
  { eco: 'A43', name: 'Old Benoni Defense', moves: ['d4', 'c5'] },

  // Flank Openings
  { eco: 'A10', name: 'English Opening', moves: ['c4'] },
  { eco: 'A04', name: 'Reti Opening', moves: ['Nf3'] },
  { eco: 'A00', name: "King's Indian Attack", moves: ['Nf3', 'd5', 'g3'] },
];

/**
 * Identifies the closest opening for a given move sequence
 */
export function identifyOpening(sanMoves: string[]): { eco: string; name: string } {
  let bestMatch: OpeningEntry = { eco: 'A00', name: 'Uncommon Opening', moves: [] };
  let maxMatchedMoves = 0;

  for (const entry of OPENING_BOOK) {
    if (entry.moves.length > sanMoves.length) {
      // Check partial match
      const isSubMatch = entry.moves.slice(0, sanMoves.length).every((m, idx) => m === sanMoves[idx]);
      if (isSubMatch && sanMoves.length > maxMatchedMoves) {
        maxMatchedMoves = sanMoves.length;
        bestMatch = entry;
      }
      continue;
    }

    const matches = entry.moves.every((m, idx) => m === sanMoves[idx]);
    if (matches && entry.moves.length > maxMatchedMoves) {
      maxMatchedMoves = entry.moves.length;
      bestMatch = entry;
    }
  }

  return { eco: bestMatch.eco, name: bestMatch.name };
}

/**
 * Checks if a specific move ply was part of recognized opening theory
 */
export function isTheoryMove(sanMovesSoFar: string[]): boolean {
  if (sanMovesSoFar.length === 0 || sanMovesSoFar.length > 16) return false;

  return OPENING_BOOK.some((entry) => {
    return sanMovesSoFar.every((m, idx) => m === entry.moves[idx]);
  });
}

/**
 * Finds the theoretical book reply for a given sequence of SAN moves
 */
export function getBookMove(sanMovesSoFar: string[]): string | undefined {
  if (sanMovesSoFar.length > 16) return undefined;
  const match = OPENING_BOOK.find((op) => {
    if (op.moves.length <= sanMovesSoFar.length) return false;
    for (let i = 0; i < sanMovesSoFar.length; i++) {
      if (op.moves[i] !== sanMovesSoFar[i]) return false;
    }
    return true;
  });
  return match ? match.moves[sanMovesSoFar.length] : undefined;
}

import type { MoveClassification, MoveAnalysis } from '../types/chess';

/**
 * Converts Centipawn evaluation to expected winning percentage (0% - 100%).
 * Uses the standard sigmoid logistic model adopted by Lichess and Chess.com:
 * P(win) = 100 / (1 + 10^(-cp / 400))
 */
export function centipawnsToWinPercent(cp: number): number {
  if (cp > 3000) return 99.9;
  if (cp < -3000) return 0.1;
  const winRate = 100 / (1 + Math.pow(10, -cp / 400));
  return Math.round(winRate * 10) / 10;
}

/**
 * Classifies a move based on the delta in winning percentage from the moving player's perspective.
 */
export function classifyMove(
  winPercentBefore: number,
  winPercentAfter: number,
  isBestMove: boolean = false,
  isSacrifice: boolean = false,
  isTheory: boolean = false
): MoveClassification {
  // Opening theory book move
  if (isTheory) {
    return 'book';
  }

  const delta = winPercentAfter - winPercentBefore; // delta for the player who just moved

  // Missed Win: player was in a completely winning position (> 80%) and dropped significantly
  if (winPercentBefore >= 80 && winPercentAfter <= 55) {
    return 'missed_win';
  }

  // Brilliant: Piece sacrificed, move is the top engine move, and position remains winning or held
  if (isSacrifice && isBestMove && delta >= -2.0 && winPercentAfter >= 45) {
    return 'brilliant';
  }

  // Great Move: High precision move preserving advantage in sharp positions
  if (isBestMove && winPercentBefore >= 60 && delta >= 0) {
    return 'great';
  }

  if (isBestMove || delta >= -1.0) {
    return 'best';
  }

  if (delta >= -3.5) {
    return 'excellent';
  }

  if (delta >= -7.0) {
    return 'good';
  }

  if (delta >= -15.0) {
    return 'inaccuracy';
  }

  if (delta >= -25.0) {
    return 'mistake';
  }

  return 'blunder';
}

export interface ClassificationMeta {
  label: string;
  badge: string;
  symbol: string;
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  description: string;
}

export const CLASSIFICATION_CONFIG: Record<MoveClassification, ClassificationMeta> = {
  brilliant: {
    label: 'Brilliant',
    badge: '!!',
    symbol: '!!',
    color: '#06b6d4',
    bgColor: 'bg-cyan-500/20',
    textColor: 'text-cyan-400',
    borderColor: 'border-cyan-500/40',
    description: 'A spectacular sacrifice that finds the best continuation.',
  },
  great: {
    label: 'Great',
    badge: '!',
    symbol: '!',
    color: '#3b82f6',
    bgColor: 'bg-blue-500/20',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-500/40',
    description: 'The only move that maintains the advantage in a sharp position.',
  },
  book: {
    label: 'Book',
    badge: '📖',
    symbol: '📖',
    color: '#a06a42',
    bgColor: 'bg-[#a06a42]/20',
    textColor: 'text-[#d4976a]',
    borderColor: 'border-[#a06a42]/40',
    description: 'Standard opening master theory.',
  },
  best: {
    label: 'Best',
    badge: '★',
    symbol: '★',
    color: '#81b64c',
    bgColor: 'bg-[#81b64c]/20',
    textColor: 'text-[#81b64c]',
    borderColor: 'border-[#81b64c]/40',
    description: 'The engine top choice.',
  },
  excellent: {
    label: 'Excellent',
    badge: '👍',
    symbol: '👍',
    color: '#22c55e',
    bgColor: 'bg-emerald-500/20',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/40',
    description: 'Almost as good as the best move.',
  },
  good: {
    label: 'Good',
    badge: '✔',
    symbol: '✔',
    color: '#16a34a',
    bgColor: 'bg-green-600/20',
    textColor: 'text-green-500',
    borderColor: 'border-green-600/40',
    description: 'A solid, playable move.',
  },
  inaccuracy: {
    label: 'Inaccuracy',
    badge: '?!',
    symbol: '?!',
    color: '#eab308',
    bgColor: 'bg-yellow-500/20',
    textColor: 'text-yellow-400',
    borderColor: 'border-yellow-500/40',
    description: 'A weak move that gives away a small part of your advantage.',
  },
  mistake: {
    label: 'Mistake',
    badge: '?',
    symbol: '?',
    color: '#f97316',
    bgColor: 'bg-orange-500/20',
    textColor: 'text-orange-400',
    borderColor: 'border-orange-500/40',
    description: 'A bad move that visibly worsens your position.',
  },
  missed_win: {
    label: 'Miss',
    badge: '✕',
    symbol: '✕',
    color: '#ef4444',
    bgColor: 'bg-red-500/20',
    textColor: 'text-red-400',
    borderColor: 'border-red-500/40',
    description: 'Overlooked a clear winning continuation or checkmate.',
  },
  blunder: {
    label: 'Blunder',
    badge: '??',
    symbol: '??',
    color: '#dc2626',
    bgColor: 'bg-red-600/20',
    textColor: 'text-red-500',
    borderColor: 'border-red-600/40',
    description: 'A critical mistake that throws away the game or loses material.',
  },
};

/**
 * Calculates player accuracy (0-100%) based on harmonic mean of win% preserved.
 */
export function calculateAccuracy(moves: { deltaWinPercent: number }[]): number {
  if (moves.length === 0) return 100;
  let totalScore = 0;
  for (const m of moves) {
    // Loss is non-positive; if delta is 0 or positive, score is 100
    const loss = Math.max(0, -m.deltaWinPercent);
    // Exponential decay curve for accuracy
    const score = 100 * Math.exp(-0.06 * loss);
    totalScore += score;
  }
  return Math.round((totalScore / moves.length) * 10) / 10;
}

/**
 * Calculates Average Centipawn Loss (ACPL) for White or Black.
 */
export function calculateACPL(moves: MoveAnalysis[]): number {
  if (moves.length === 0) return 0;
  let totalLoss = 0;

  for (const m of moves) {
    const isWhite = m.ply % 2 !== 0;
    // Perspective centipawn evaluation: White wants positive, Black wants negative
    const playerBefore = isWhite ? m.evalBefore : -m.evalBefore;
    const playerAfter = isWhite ? m.evalAfter : -m.evalAfter;
    const loss = Math.max(0, playerBefore - playerAfter);
    // Cap single move loss at 500 cp to avoid skewing by resigning or late blunder
    totalLoss += Math.min(500, loss);
  }

  return Math.round(totalLoss / moves.length);
}

/**
 * Estimates rating performance based on Accuracy % and ACPL
 */
export function estimatePerformanceRating(accuracy: number, acpl: number): number {
  if (accuracy >= 95 || acpl <= 15) return 2650;
  if (accuracy >= 90 || acpl <= 25) return 2350;
  if (accuracy >= 85 || acpl <= 35) return 2100;
  if (accuracy >= 80 || acpl <= 50) return 1850;
  if (accuracy >= 75 || acpl <= 65) return 1600;
  if (accuracy >= 65 || acpl <= 85) return 1350;
  if (accuracy >= 55 || acpl <= 110) return 1100;
  return 900;
}


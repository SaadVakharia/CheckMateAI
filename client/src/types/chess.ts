export type MoveClassification =
  | 'brilliant'
  | 'great'
  | 'best'
  | 'excellent'
  | 'good'
  | 'book'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder'
  | 'missed_win';

export type TacticalMotif =
  | 'hanging_piece'
  | 'fork'
  | 'pin'
  | 'skewer'
  | 'back_rank'
  | 'discovered_attack'
  | 'overloaded_piece'
  | 'sacrifice'
  | 'checkmate_threat';

export interface MoveAnalysis {
  ply: number;
  san: string;
  from: string;
  to: string;
  promotion?: string;
  fenBefore: string;
  fenAfter: string;
  evalBefore: number; // Centipawns (from perspective of side to move)
  evalAfter: number;  // Centipawns
  winPercentBefore: number; // 0 to 100
  winPercentAfter: number;
  deltaWinPercent: number; // change for the player who made the move
  classification: MoveClassification;
  bestMove?: string;
  bestMoveUci?: string;
  bestLine?: string[];
  tacticalMotifs?: TacticalMotif[];
  coachCommentary?: string;
  playerIntent?: string;
  timeSpentSeconds?: number;
}

export interface PlayerInfo {
  username: string;
  rating?: number;
  title?: string;
  avatar?: string;
  platform?: 'chess.com' | 'lichess' | 'local';
}

export interface GameSummary {
  id: string;
  white: PlayerInfo;
  black: PlayerInfo;
  result: '1-0' | '0-1' | '1/2-1/2' | '*';
  date: string;
  event?: string;
  timeControl?: string;
  pgn: string;
  whiteAccuracy?: number;
  blackAccuracy?: number;
  whiteBlunders?: number;
  blackBlunders?: number;
  eco?: string;
  openingName?: string;
}

export interface PlatformGameItem {
  id: string;
  url: string;
  pgn: string;
  timeControl: string;
  timeClass: 'bullet' | 'blitz' | 'rapid' | 'daily';
  white: {
    username: string;
    rating: number;
    result: string;
  };
  black: {
    username: string;
    rating: number;
    result: string;
  };
  endTime: number;
  eco?: string;
}

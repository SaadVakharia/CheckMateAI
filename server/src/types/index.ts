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

export interface ExplainMoveRequest {
  fenBefore: string;
  fenAfter: string;
  moveSan: string;
  classification: MoveClassification;
  evalBefore: number;
  evalAfter: number;
  bestMove?: string;
  bestLine?: string[];
  tacticalMotifs?: TacticalMotif[];
  playerIntent?: string;
}

export interface ExplainMoveResponse {
  commentary: string;
  keyTacticalIdea: string;
  betterPlan?: string;
  source: 'gemini' | 'heuristic';
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface CoachChatRequest {
  fen: string;
  history?: string[];
  question: string;
  playerSide?: 'w' | 'b';
  chatHistory?: ChatMessage[];
  currentMoveSan?: string;
  classification?: MoveClassification;
  bestMove?: string;
}

export interface CoachChatResponse {
  answer: string;
  suggestedQuestions?: string[];
  source: 'gemini' | 'heuristic';
}

export interface GameSummaryRequest {
  title?: string;
  whiteAccuracy: number;
  blackAccuracy: number;
  whiteAcpl: number;
  blackAcpl: number;
  openingName?: string;
  openingEco?: string;
  blundersCount: number;
  moves: Array<{
    ply: number;
    san: string;
    classification: MoveClassification;
    deltaWinPercent: number;
  }>;
}

export interface GameSummaryResponse {
  narrative: string;
  whiteHighlights: string[];
  blackHighlights: string[];
  criticalTurningPoint: string;
  keyLesson: string;
  source: 'gemini' | 'heuristic';
}

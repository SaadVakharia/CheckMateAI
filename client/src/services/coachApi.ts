import type { MoveAnalysis } from '../types/chess';

const API_BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api/coach`
  : 'http://localhost:3001/api/coach';

export interface CoachExplanation {
  commentary: string;
  keyTacticalIdea: string;
  betterPlan?: string;
  source: 'gemini' | 'heuristic';
}

export interface CoachAnswer {
  answer: string;
  suggestedQuestions?: string[];
  source: 'gemini' | 'heuristic';
}

export interface GameSummaryNarrative {
  narrative: string;
  whiteHighlights: string[];
  blackHighlights: string[];
  criticalTurningPoint: string;
  keyLesson: string;
  source: 'gemini' | 'heuristic';
}

export async function fetchCoachStatus(): Promise<{ status: string; hasApiKey: boolean; coachPersona: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/status`);
    if (!res.ok) throw new Error('Status check failed');
    return await res.json();
  } catch {
    return {
      status: 'offline',
      hasApiKey: false,
      coachPersona: 'Grandmaster Alex (Client Fallback)',
    };
  }
}

export async function explainMoveWithCoach(analysis: MoveAnalysis): Promise<CoachExplanation> {
  try {
    const res = await fetch(`${API_BASE_URL}/explain-move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fenBefore: analysis.fenBefore,
        fenAfter: analysis.fenAfter,
        moveSan: analysis.san,
        classification: analysis.classification,
        evalBefore: analysis.evalBefore,
        evalAfter: analysis.evalAfter,
        bestMove: analysis.bestMove,
        bestLine: analysis.bestLine,
        tacticalMotifs: analysis.tacticalMotifs,
        playerIntent: analysis.playerIntent,
      }),
    });

    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch {
    // Offline / Network fallback
    return {
      commentary: `${analysis.san} is played with strategic intent. Notice the impact on piece coordination and king security.`,
      keyTacticalIdea: `Focus on active centralization and piece harmony.`,
      betterPlan: analysis.bestMove ? `Consider ${analysis.bestMove} to maintain maximum advantage.` : undefined,
      source: 'heuristic',
    };
  }
}

export interface PuzzleHintsData {
  hint1: string;
  hint2: string;
  hint3: string;
  source: 'gemini' | 'heuristic';
}

export interface PuzzleContextParam {
  isPuzzleWorkout?: boolean;
  blunderSan?: string;
  blunderFrom?: string;
  blunderTo?: string;
  bestMove?: string;
  tacticalMotifs?: string[];
  hintLevel?: number;
  hintsGiven?: string[];
  lastUserAttempt?: string;
  solved?: boolean;
}

export async function askCoachChat(
  fen: string,
  question: string,
  playerSide: 'w' | 'b' = 'w',
  currentAnalysis?: MoveAnalysis,
  chatHistory?: { role: 'user' | 'assistant'; content: string }[],
  puzzleContext?: PuzzleContextParam
): Promise<CoachAnswer> {
  try {
    const res = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fen,
        question,
        playerSide,
        currentMoveSan: currentAnalysis?.san,
        classification: currentAnalysis?.classification,
        bestMove: currentAnalysis?.bestMove,
        chatHistory: chatHistory?.slice(-4),
        puzzleContext,
      }),
    });

    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch {
    // Offline / fallback
    const lower = question.toLowerCase();
    let answer = `In this position, coordinate your minor pieces towards the center and safeguard your King before opening lines.`;
    if (lower.includes('why') || lower.includes('mistake') || lower.includes('bad')) {
      answer = currentAnalysis?.bestMove
        ? `The move gives away dynamic control. Top play was ${currentAnalysis.bestMove} to keep active pressure.`
        : `Leaving piece coordination loose allows the opponent tactical resources.`;
    }

    return {
      answer,
      suggestedQuestions: [
        'What is my opponent planning next?',
        'Which piece should I improve?',
      ],
      source: 'heuristic',
    };
  }
}

export async function fetchPuzzleHints(params: {
  fen: string;
  playerSide?: 'w' | 'b';
  blunderSan: string;
  blunderFrom?: string;
  blunderTo?: string;
  bestMove?: string;
  bestMoveUci?: string;
  tacticalMotifs?: string[];
  playerIntent?: string;
}): Promise<PuzzleHintsData> {
  try {
    const res = await fetch(`${API_BASE_URL}/puzzle-hints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch {
    const opponentColor = params.playerSide === 'w' ? 'Black' : 'White';
    return {
      hint1: `Examine ${opponentColor}'s blunder (${params.blunderSan}). Notice which square or piece was left unguarded. Look for active piece coordination.`,
      hint2:
        params.tacticalMotifs && params.tacticalMotifs.length > 0
          ? `Tactical Theme: ${params.tacticalMotifs.map((m) => m.replace(/_/g, ' ')).join(', ')}. Look for an unparryable forcing sequence.`
          : `Tactical Theme: Exploiting loose pieces and king exposure.`,
      hint3: params.bestMove
        ? `The winning tactical refutation is **${params.bestMove}**!`
        : `Look for the most forcing check or capture available.`,
      source: 'heuristic',
    };
  }
}

export async function fetchGameReviewSummary(stats: {
  title?: string;
  whiteAccuracy: number;
  blackAccuracy: number;
  whiteAcpl: number;
  blackAcpl: number;
  openingName?: string;
  openingEco?: string;
  blundersCount: number;
  moves: Array<{ ply: number; san: string; classification: string; deltaWinPercent: number }>;
}): Promise<GameSummaryNarrative> {
  try {
    const res = await fetch(`${API_BASE_URL}/game-summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stats),
    });

    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch {
    return {
      narrative: `An intense battle featuring the ${stats.openingName || 'Opening'}. Both players contested central dominance, with tactical swings deciding the outcome.`,
      whiteHighlights: [`Played with ${stats.whiteAccuracy}% accuracy across all phases.`],
      blackHighlights: [`Maintained ${stats.blackAccuracy}% precision throughout the contest.`],
      criticalTurningPoint: `The outcome hung on tactical awareness during dynamic middle-game transitions.`,
      keyLesson: `Always evaluate your opponent's threats before pushing forward!`,
      source: 'heuristic',
    };
  }
}

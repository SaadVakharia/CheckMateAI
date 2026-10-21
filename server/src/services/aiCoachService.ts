import { GoogleGenerativeAI } from '@google/generative-ai';
import { PedagogyHeuristics } from './pedagogyHeuristics';
import type {
  ExplainMoveRequest,
  ExplainMoveResponse,
  CoachChatRequest,
  CoachChatResponse,
  GameSummaryRequest,
  GameSummaryResponse,
  PuzzleHintsRequest,
  PuzzleHintsResponse,
} from '../types';

function extractAndParseJson<T>(rawText: string): T {
  const trimmed = rawText.trim();
  // Strip code block wrappers if present
  const unblocked = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    return JSON.parse(unblocked) as T;
  } catch {
    // Attempt extracting the first JSON object {}
    const match = unblocked.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]) as T;
    }
    throw new Error(`Failed to parse JSON from AI response: ${rawText.slice(0, 100)}...`);
  }
}

export class AiCoachService {
  private genAI: GoogleGenerativeAI | null = null;
  private modelName: string = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

  public getModelName(): string {
    return this.modelName;
  }

  public getGenAI(): GoogleGenerativeAI | null {
    const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
    if (!apiKey) return null;
    if (!this.genAI) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
    return this.genAI;
  }

  public hasApiKey(): boolean {
    return !!this.getGenAI();
  }

  /**
   * Explains a specific move with grandmaster pedagogy
   */
  public async explainMove(req: ExplainMoveRequest): Promise<ExplainMoveResponse> {
    const client = this.getGenAI();
    if (!client) {
      return PedagogyHeuristics.explainMove(req);
    }

    try {
      const model = client.getGenerativeModel({ model: this.modelName });

      const prompt = `
You are Grandmaster Alex, an encouraging, elite chess coach and master pedagogue.
Explain this chess move to a club player with enthusiasm, tactical depth, and clarity.
Never just quote engine evaluations; explain the WHY (piece coordination, king safety, open files, outpost control, tactical motifs).

Match Context:
- Position FEN Before: "${req.fenBefore}"
- Position FEN After: "${req.fenAfter}"
- Move Played: "${req.moveSan}"
- Move Classification: "${req.classification.toUpperCase()}"
- Centipawn Eval Before: ${req.evalBefore}
- Centipawn Eval After: ${req.evalAfter}
- Best Engine Move: "${req.bestMove || 'N/A'}"
- Tactical Motifs: ${req.tacticalMotifs?.join(', ') || 'Positional'}
- Player Intent: ${req.playerIntent || 'Developing pieces'}

Return a JSON object strictly matching this schema:
{
  "commentary": "2-3 sentences explaining the move, why it succeeded or failed, and the key ideas.",
  "keyTacticalIdea": "A short, memorable 1-sentence tactical or strategic takeaway.",
  "betterPlan": "If the move was an inaccuracy, mistake, or blunder, describe the better continuation in 1 sentence; otherwise empty string."
}
Do NOT wrap in markdown fences or triple backticks if possible, just raw JSON.
`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const parsed = extractAndParseJson<{
        commentary?: string;
        keyTacticalIdea?: string;
        betterPlan?: string;
      }>(text);

      return {
        commentary: parsed.commentary || '',
        keyTacticalIdea: parsed.keyTacticalIdea || '',
        betterPlan: parsed.betterPlan || undefined,
        source: 'gemini',
      };
    } catch (err) {
      console.warn('Gemini API call failed, falling back to heuristics:', err);
      return PedagogyHeuristics.explainMove(req);
    }
  }

  /**
   * Conversational live Q&A about current position on the board
   */
  public async chatWithCoach(req: CoachChatRequest): Promise<CoachChatResponse> {
    const client = this.getGenAI();
    if (!client) {
      return PedagogyHeuristics.answerQuestion(req);
    }

    try {
      const model = client.getGenerativeModel({ model: this.modelName });

      const conversationHistory = req.chatHistory
        ? req.chatHistory.map((m) => `${m.role === 'user' ? 'Student' : 'GM Alex'}: ${m.content}`).join('\n')
        : '';

      const isPuzzleMode = req.puzzleContext?.isPuzzleWorkout;
      const puzzleSection = isPuzzleMode
        ? `
SPECIAL MODE: MISTAKE PUZZLE WORKOUT
The student is actively solving a tactical puzzle derived from a real blunder!
- Opponent's Blunder: ${req.puzzleContext?.blunderSan || req.currentMoveSan || 'N/A'}
- Winning Refutation (Target Move): ${req.puzzleContext?.bestMove || req.bestMove || 'N/A'}
- Tactical Motifs: ${req.puzzleContext?.tacticalMotifs?.join(', ') || 'N/A'}
- Hints Revealed So Far: ${req.puzzleContext?.hintsGiven?.join(' | ') || 'None yet'}
- Student's Last Attempted Move: ${req.puzzleContext?.lastUserAttempt || 'None'}
- Puzzle Solved Status: ${req.puzzleContext?.solved ? 'SOLVED' : 'IN PROGRESS'}

Puzzle Directives:
- If the puzzle is IN PROGRESS: Guide the student with Socratic clues, tactical motifs, and questions. Do NOT reveal the exact move unless they explicitly ask for the final answer!
- If they ask why an attempted move failed, explain the tactical refutation against it.
- Keep the response encouraging, concise (2-4 sentences), and pedagogically focused.
`
        : '';

      const prompt = `
You are Grandmaster Alex, a friendly, insightful chess coach having a live session with a student.
Answer the student's question directly, clearly, and concisely (2-4 sentences max).
Highlight strategic themes, piece coordination, and concrete tactical reasons.
${puzzleSection}
Board Context:
- Active FEN: "${req.fen}"
- Side to Move: ${req.playerSide === 'w' ? 'White' : 'Black'}
- Recent Move: ${req.currentMoveSan || 'N/A'} (Classified as: ${req.classification || 'normal'})
- Top Engine Move: ${req.bestMove || 'N/A'}

Recent Conversation:
${conversationHistory}

Student's Question:
"${req.question}"

Return JSON strictly matching:
{
  "answer": "Your direct, engaging grandmaster answer.",
  "suggestedQuestions": ["Follow-up question 1?", "Follow-up question 2?"]
}
`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const parsed = extractAndParseJson<{
        answer?: string;
        suggestedQuestions?: string[];
      }>(text);

      return {
        answer: parsed.answer || 'Keep tactical vigilance and control the center.',
        suggestedQuestions: Array.isArray(parsed.suggestedQuestions) ? parsed.suggestedQuestions.slice(0, 3) : [],
        source: 'gemini',
      };
    } catch (err) {
      console.warn('Gemini chat failed, falling back to heuristics:', err);
      return PedagogyHeuristics.answerQuestion(req);
    }
  }

  /**
   * Generates 3 progressive pedagogical hints tailored for a blunder puzzle.
   */
  public async generatePuzzleHints(req: PuzzleHintsRequest): Promise<PuzzleHintsResponse> {
    const client = this.getGenAI();
    if (!client) {
      return PedagogyHeuristics.generatePuzzleHints(req);
    }

    try {
      const model = client.getGenerativeModel({ model: this.modelName });
      const playerColor = req.playerSide === 'w' ? 'White' : 'Black';

      const prompt = `
You are Grandmaster Alex, an expert chess coach helping a student solve a puzzle based on an actual blunder.
Context:
- Board FEN: "${req.fen}"
- Student plays as: ${playerColor}
- Opponent's Blunder: ${req.blunderSan}
- Target Winning Refutation (Best Move): ${req.bestMove || 'N/A'}
- Tactical Motifs: ${req.tacticalMotifs?.join(', ') || 'hanging piece / double attack'}
- Opponent's Intent: ${req.playerIntent || 'overlooked tactical defense'}

Formulate 3 progressive hints for this blunder refutation:
- "hint1": A directional clue. Gently point the student's attention to the crucial piece, board sector, or undefended element WITHOUT naming the piece or move. (1-2 sentences).
- "hint2": A tactical theme clue. Explicitly name the tactical motif (e.g. pin, fork, overloaded defender, back-rank) and explain what mechanical weakness can be exploited. (1-2 sentences).
- "hint3": The full refutation solution. Reveal the winning move "${req.bestMove || ''}" and clearly explain the tactical sequence that wins material or delivers mate. (1-2 sentences).

Return JSON strictly matching:
{
  "hint1": "...",
  "hint2": "...",
  "hint3": "..."
}
`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const parsed = extractAndParseJson<{
        hint1?: string;
        hint2?: string;
        hint3?: string;
      }>(text);

      if (parsed.hint1 && parsed.hint2 && parsed.hint3) {
        return {
          hint1: parsed.hint1,
          hint2: parsed.hint2,
          hint3: parsed.hint3,
          source: 'gemini',
        };
      }
      return PedagogyHeuristics.generatePuzzleHints(req);
    } catch (err) {
      console.warn('Gemini puzzle hints generation failed, falling back to heuristics:', err);
      return PedagogyHeuristics.generatePuzzleHints(req);
    }
  }

  /**
   * Generates full game narrative review summary
   */
  public async generateGameSummary(req: GameSummaryRequest): Promise<GameSummaryResponse> {
    const client = this.getGenAI();
    if (!client) {
      return PedagogyHeuristics.generateGameSummary(req);
    }

    try {
      const model = client.getGenerativeModel({ model: this.modelName });

      const prompt = `
You are Grandmaster Alex. Provide a rich post-game match review narrative for this chess match.
Match Stats:
- Title: ${req.title || 'Casual Match'}
- Opening: ${req.openingName || 'Standard Opening'} (${req.openingEco || 'Theory'})
- White Accuracy: ${req.whiteAccuracy}% (ACPL: ${req.whiteAcpl} cp)
- Black Accuracy: ${req.blackAccuracy}% (ACPL: ${req.blackAcpl} cp)
- Critical Mistakes / Blunders Count: ${req.blundersCount}

Return JSON strictly matching:
{
  "narrative": "A gripping 3-4 sentence storytelling summary of the match flow from opening to climax.",
  "whiteHighlights": ["Highlight 1", "Highlight 2"],
  "blackHighlights": ["Highlight 1", "Highlight 2"],
  "criticalTurningPoint": "1-2 sentences on where the game was won or lost.",
  "keyLesson": "The single most valuable chess improvement lesson to take away from this match."
}
`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const parsed = extractAndParseJson<{
        narrative?: string;
        whiteHighlights?: string[];
        blackHighlights?: string[];
        criticalTurningPoint?: string;
        keyLesson?: string;
      }>(text);

      return {
        narrative: parsed.narrative || 'An exciting chess match with rich tactical opportunities.',
        whiteHighlights: parsed.whiteHighlights || [],
        blackHighlights: parsed.blackHighlights || [],
        criticalTurningPoint: parsed.criticalTurningPoint || 'The dynamic middle-game struggle.',
        keyLesson: parsed.keyLesson || 'Always calculate forcing tactical moves carefully.',
        source: 'gemini',
      };
    } catch (err) {
      console.warn('Gemini game summary failed, falling back to heuristics:', err);
      return PedagogyHeuristics.generateGameSummary(req);
    }
  }
}

export const aiCoachService = new AiCoachService();

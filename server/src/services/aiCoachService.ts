import { GoogleGenerativeAI } from '@google/generative-ai';
import { PedagogyHeuristics } from './pedagogyHeuristics';
import type {
  ExplainMoveRequest,
  ExplainMoveResponse,
  CoachChatRequest,
  CoachChatResponse,
  GameSummaryRequest,
  GameSummaryResponse,
} from '../types';

export class AiCoachService {
  private genAI: GoogleGenerativeAI | null = null;
  private modelName: string = 'gemini-3.5-flash-lite';

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
      const text = result.response.text().trim();
      const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();

      const parsed = JSON.parse(cleaned);
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

      const prompt = `
You are Grandmaster Alex, a friendly, insightful chess coach having a live pair-programming analysis session with a student.
Answer the student's question directly, clearly, and concisely (2-4 sentences max).
Highlight strategic themes, piece coordination, and concrete tactical reasons.

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
      const text = result.response.text().trim();
      const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();

      const parsed = JSON.parse(cleaned);
      return {
        answer: parsed.answer,
        suggestedQuestions: Array.isArray(parsed.suggestedQuestions) ? parsed.suggestedQuestions.slice(0, 3) : [],
        source: 'gemini',
      };
    } catch (err) {
      console.warn('Gemini chat failed, falling back to heuristics:', err);
      return PedagogyHeuristics.answerQuestion(req);
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
      const text = result.response.text().trim();
      const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();

      const parsed = JSON.parse(cleaned);
      return {
        narrative: parsed.narrative,
        whiteHighlights: parsed.whiteHighlights || [],
        blackHighlights: parsed.blackHighlights || [],
        criticalTurningPoint: parsed.criticalTurningPoint,
        keyLesson: parsed.keyLesson,
        source: 'gemini',
      };
    } catch (err) {
      console.warn('Gemini game summary failed, falling back to heuristics:', err);
      return PedagogyHeuristics.generateGameSummary(req);
    }
  }
}

export const aiCoachService = new AiCoachService();

import { Request, Response } from 'express';
import { aiCoachService } from '../services/aiCoachService';
import type { ExplainMoveRequest, CoachChatRequest, GameSummaryRequest } from '../types';

export class CoachController {
  public static async explainMove(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body as ExplainMoveRequest;
      if (!body.fenAfter || !body.moveSan || !body.classification) {
        res.status(400).json({ error: 'Missing required fields: fenAfter, moveSan, classification' });
        return;
      }

      const result = await aiCoachService.explainMove(body);
      res.json(result);
    } catch (err: any) {
      console.error('Error in explainMove controller:', err);
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  public static async chatWithCoach(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body as CoachChatRequest;
      if (!body.fen || !body.question) {
        res.status(400).json({ error: 'Missing required fields: fen, question' });
        return;
      }

      const result = await aiCoachService.chatWithCoach(body);
      res.json(result);
    } catch (err: any) {
      console.error('Error in chatWithCoach controller:', err);
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  public static async generateGameSummary(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body as GameSummaryRequest;
      const result = await aiCoachService.generateGameSummary(body);
      res.json(result);
    } catch (err: any) {
      console.error('Error in generateGameSummary controller:', err);
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  public static getStatus(req: Request, res: Response): void {
    res.json({
      status: 'online',
      hasApiKey: aiCoachService.hasApiKey(),
      coachPersona: 'Grandmaster Alex',
      model: 'gemini-1.5-flash',
    });
  }
}

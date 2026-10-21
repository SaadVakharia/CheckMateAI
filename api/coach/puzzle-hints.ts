import { aiCoachService } from '../services/aiCoachService';
import type { PuzzleHintsRequest } from '../types';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body as PuzzleHintsRequest;
    if (!body || !body.fen || !body.blunderSan) {
      return res.status(400).json({ error: 'Missing required fields: fen, blunderSan' });
    }

    const result = await aiCoachService.generatePuzzleHints(body);
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('Error in puzzle-hints handler:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

import { aiCoachService } from '../services/aiCoachService';
import type { CoachChatRequest } from '../types';

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
    const body = req.body as CoachChatRequest;
    if (!body || !body.fen || !body.question) {
      return res.status(400).json({ error: 'Missing required fields: fen, question' });
    }

    const result = await aiCoachService.chatWithCoach(body);
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('Error in chat handler:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

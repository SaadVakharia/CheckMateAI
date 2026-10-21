import { aiCoachService } from '../services/aiCoachService';
import type { ExplainMoveRequest } from '../types';

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
    const body = req.body as ExplainMoveRequest;
    if (!body || !body.fenAfter || !body.moveSan || !body.classification) {
      return res.status(400).json({ error: 'Missing required fields: fenAfter, moveSan, classification' });
    }

    const result = await aiCoachService.explainMove(body);
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('Error in explain-move handler:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

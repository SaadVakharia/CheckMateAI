import { aiCoachService } from '../services/aiCoachService';

export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  res.status(200).json({
    status: 'online',
    hasApiKey: aiCoachService.hasApiKey(),
    coachPersona: 'Grandmaster Alex',
    model: aiCoachService.getModelName(),
  });
}

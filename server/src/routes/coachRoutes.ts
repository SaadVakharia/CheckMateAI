import { Router } from 'express';
import { CoachController } from '../controllers/coachController';

const router = Router();

router.get('/status', CoachController.getStatus);
router.post('/explain-move', CoachController.explainMove);
router.post('/chat', CoachController.chatWithCoach);
router.post('/game-summary', CoachController.generateGameSummary);

export default router;

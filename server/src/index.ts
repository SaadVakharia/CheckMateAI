import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import coachRoutes from './routes/coachRoutes';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/coach', coachRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({
    app: 'CheckMate AI API',
    version: '1.0.0',
    status: 'running',
    endpoints: [
      'GET  /api/coach/status',
      'POST /api/coach/explain-move',
      'POST /api/coach/chat',
      'POST /api/coach/game-summary',
    ],
  });
});

app.listen(PORT, () => {
  console.log(`[CheckMate AI] Server running on http://localhost:${PORT}`);
});

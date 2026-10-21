import express from 'express';
import cors from 'cors';
import coachRoutes from './coachRoutes';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/coach', coachRoutes);
app.use('/coach', coachRoutes);

export default app;

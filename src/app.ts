import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './modules/auth/auth.routes';
import chatRoutes from './modules/chats/chat.routes';
import userRoutes from './modules/users/user.routes';
import { errorMiddleware } from './middleware/error.middleware';

export const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }));
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));

app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
app.use('/auth', authRoutes);
app.use('/chat', chatRoutes);
app.use('/user', userRoutes);
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));
app.use(errorMiddleware);

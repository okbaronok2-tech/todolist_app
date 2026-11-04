import express from 'express';
import cookieParser from 'cookie-parser';
import { ping } from './db/pool.js';
import { HTTP } from './errors/codes.js';
import { errorHandler, notFound } from './middlewares/error-handler.js';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import categoriesRouter from './routes/categories.js';
import todosRouter from './routes/todos.js';

export const app = express();

app.use(express.json());
app.use(cookieParser());

// 원칙 6.3 헬스체크. 인증 없음
app.get('/api/health', async (req, res) => {
  try {
    await ping();
    res.json({ ok: true });
  } catch {
    res.status(HTTP.SERVICE_UNAVAILABLE).json({ ok: false });
  }
});

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/todos', todosRouter);

app.use(notFound);
app.use(errorHandler);

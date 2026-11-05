import express from 'express';
import { readFileSync } from 'node:fs';
import cookieParser from 'cookie-parser';
import { ping } from './db/pool.js';
import { HTTP } from './errors/codes.js';
import { errorHandler, notFound } from './middlewares/error-handler.js';
import { cors } from './middlewares/cors.js';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import categoriesRouter from './routes/categories.js';
import todosRouter from './routes/todos.js';

export const app = express();

app.use(cors); // 프리플라이트는 본문 파싱 전에 끝낸다
app.use(express.json());
app.use(cookieParser());

// 원칙 6.3 헬스체크. 인증 없음
app.get('/api/health', async (req, res) => {
  try {
    await ping();
    res.json({ ok: true, db: 'up' });
  } catch {
    res.status(HTTP.SERVICE_UNAVAILABLE).json({ ok: false, db: 'down' });
  }
});

// API 콘솔. 개발 모드만. swagger/swagger.json은 `npm run swagger:json`으로 backend/swagger.yaml에서 생성
if (process.env.NODE_ENV !== 'production') {
  const specPath = new URL('../../swagger/swagger.json', import.meta.url);
  const docsHtml = `<!doctype html><html><head><meta charset="utf-8"><title>todolist API</title>
<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css"></head>
<body><div id="ui"></div><script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"></script>
<script>SwaggerUIBundle({ url: '/api/docs.json', dom_id: '#ui', withCredentials: true })</script></body></html>`;
  app.get('/api/docs', (req, res) => res.type('html').send(docsHtml));
  app.get('/api/docs.json', (req, res) => res.type('json').send(readFileSync(specPath, 'utf8')));
}

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/todos', todosRouter);

app.use(notFound);
app.use(errorHandler);

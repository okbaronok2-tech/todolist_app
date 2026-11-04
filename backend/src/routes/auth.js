import { Router } from 'express';
import * as v from './validate.js';
import * as auth from '../services/auth-service.js';
import { clearAuthCookies, setAuthCookies } from '../middlewares/auth.js';
import { AppError } from '../errors/app-error.js';
import { HTTP } from '../errors/codes.js';

const router = Router();

// UC-01. 검증 순서 BR-43 → 44 → 45 → 중복(BR-04)
router.post('/signup', async (req, res) => {
  const body = req.body ?? {};
  const input = { email: v.email(body.email), password: v.password(body.password), name: v.name(body.name) };
  const { user, refreshToken } = await auth.signup(input);
  setAuthCookies(res, user.id, refreshToken);
  res.status(HTTP.CREATED).json({ user });
});

// UC-02. 형식 위반은 VALIDATION_ERROR (AD-C5)
router.post('/login', async (req, res) => {
  const body = req.body ?? {};
  const input = { email: v.email(body.email), password: v.password(body.password) };
  const { user, refreshToken } = await auth.login(input);
  setAuthCookies(res, user.id, refreshToken);
  res.json({ user });
});

// PRD 6.4. 인증 미들웨어 없음. 실패 시 401 + 두 쿠키 삭제
router.post('/refresh', async (req, res) => {
  try {
    const { user, refreshToken } = await auth.refresh(req.cookies?.refresh_token);
    setAuthCookies(res, user.id, refreshToken);
    res.json({ user });
  } catch (err) {
    if (err instanceof AppError && err.code === 'UNAUTHORIZED') clearAuthCookies(res);
    throw err;
  }
});

// UC-03. 인증 미들웨어 없음, 항상 204
router.post('/logout', async (req, res) => {
  await auth.logout(req.cookies?.refresh_token);
  clearAuthCookies(res);
  res.status(HTTP.NO_CONTENT).end();
});

export default router;

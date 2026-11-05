import { Router } from 'express';
import * as v from './validate.js';
import * as userService from '../services/user-service.js';
import { requireAuth, setAuthCookies } from '../middlewares/auth.js';
import { AppError } from '../errors/app-error.js';

const router = Router();
router.use(requireAuth);

// UC-04 (P1). 경로·본문의 사용자 ID는 받지 않는다 (BR-03)
router.get('/me', async (req, res) => {
  res.json(await userService.getMe(req.userId));
});

router.patch('/me', async (req, res) => {
  const body = req.body ?? {};
  const input = {};
  if (body.name !== undefined) input.name = v.name(body.name);
  const hasCurrent = body.currentPassword !== undefined;
  const hasNew = body.newPassword !== undefined;
  if (hasCurrent !== hasNew) throw new AppError('VALIDATION_ERROR', 'currentPassword and newPassword must be given together');
  if (hasNew) {
    if (typeof body.currentPassword !== 'string') throw new AppError('VALIDATION_ERROR', 'currentPassword must be a string');
    input.currentPassword = body.currentPassword;
    input.newPassword = v.password(body.newPassword, 'newPassword');
  }
  if (input.name === undefined && !hasNew) throw new AppError('VALIDATION_ERROR', 'nothing to update');
  const { user, refreshToken } = await userService.updateMe(req.userId, input);
  if (refreshToken) setAuthCookies(res, user.id, refreshToken); // 비밀번호 변경: 기존 리프레시 전부 폐기 후 새 쿠키 2개 (S-01)
  res.json(user);
});

export default router;

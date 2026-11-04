import { Router } from 'express';
import * as v from './validate.js';
import * as userService from '../services/user-service.js';
import { requireAuth } from '../middlewares/auth.js';
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
    input.currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
    input.newPassword = v.password(body.newPassword, 'newPassword');
  }
  if (input.name === undefined && !hasNew) throw new AppError('VALIDATION_ERROR', 'nothing to update');
  res.json(await userService.updateMe(req.userId, input));
});

export default router;

import { Router } from 'express';
import * as v from './validate.js';
import * as categories from '../services/category-service.js';
import { requireAuth } from '../middlewares/auth.js';
import { HTTP } from '../errors/codes.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  res.json(await categories.list(req.userId));
});

router.post('/', async (req, res) => {
  const name = v.categoryName(req.body?.name);
  res.status(HTTP.CREATED).json(await categories.create(req.userId, name));
});

// BR-52: 형식·길이 → id 형식 → 존재·소유 → 보호 → 중복
router.patch('/:id', async (req, res) => {
  const name = v.categoryName(req.body?.name);
  const id = v.id(req.params.id);
  res.json(await categories.rename(req.userId, id, name));
});

router.delete('/:id', async (req, res) => {
  const id = v.id(req.params.id);
  await categories.remove(req.userId, id);
  res.status(HTTP.NO_CONTENT).end();
});

export default router;

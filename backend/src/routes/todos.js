import { Router } from 'express';
import * as v from './validate.js';
import * as todos from '../services/todo-service.js';
import { requireAuth } from '../middlewares/auth.js';
import { HTTP } from '../errors/codes.js';

const router = Router();
router.use(requireAuth);

// UC-09 목록 / UC-10 캘린더. BR-52: 형식(today, from/to, status) → categoryId 형식 → 존재·소유
router.get('/', async (req, res) => {
  const today = v.today(req.query.today);
  const range = v.dateRangeQuery(req.query);
  const status = v.statusFilter(req.query.status);
  const categoryId = v.optionalCategoryId(req.query.categoryId);
  res.json(await todos.list(req.userId, { categoryId, status, range }, today));
});

// UC-05. BR-52: 형식·길이 → 날짜 범위 → categoryId 형식 → 존재·소유
function todoInput(req) {
  const today = v.today(req.query.today);
  const body = v.todoBody(req.body);
  v.dateRange(body);
  return { today, input: { ...body, categoryId: v.optionalCategoryId(req.body?.categoryId) } };
}

router.post('/', async (req, res) => {
  const { today, input } = todoInput(req);
  res.status(HTTP.CREATED).json(await todos.create(req.userId, input, today));
});

// AD-C3 편집 진입용 단건 조회
router.get('/:id', async (req, res) => {
  const today = v.today(req.query.today);
  const id = v.id(req.params.id);
  res.json(await todos.get(req.userId, id, today));
});

// UC-06
router.patch('/:id', async (req, res) => {
  const { today, input } = todoInput(req);
  const id = v.id(req.params.id);
  res.json(await todos.update(req.userId, id, input, today));
});

// UC-07, D-10 명시 지정
router.patch('/:id/completed', async (req, res) => {
  const today = v.today(req.query.today);
  const isCompleted = v.isCompleted(req.body?.isCompleted);
  const id = v.id(req.params.id);
  res.json(await todos.setCompleted(req.userId, id, isCompleted, today));
});

// UC-08
router.delete('/:id', async (req, res) => {
  const id = v.id(req.params.id);
  await todos.remove(req.userId, id);
  res.status(HTTP.NO_CONTENT).end();
});

export default router;

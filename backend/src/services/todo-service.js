import { AppError } from '../errors/app-error.js';
import * as repo from '../repositories/todo-repo.js';
import * as categories from '../repositories/category-repo.js';
import { todoStatus } from './todo-status.js';

const notFound = () => new AppError('NOT_FOUND', 'resource not found');

// AD-A7: 응답마다 today로 status 계산 (BR-26)
const withStatus = (todo, today) => ({ ...todo, status: todoStatus(todo, today) });

// BR-12 없음·null → 기본 카테고리. BR-16 타인·미존재 → NOT_FOUND
async function resolveCategoryId(userId, categoryId) {
  if (categoryId == null) return (await categories.findDefault(userId)).id;
  const category = await categories.findOne(userId, categoryId);
  if (!category) throw notFound();
  return category.id;
}

export async function create(userId, input, today) {
  const categoryId = await resolveCategoryId(userId, input.categoryId);
  return withStatus(await repo.create(userId, { ...input, categoryId }), today);
}

export async function get(userId, id, today) {
  const todo = await repo.findOne(userId, id);
  if (!todo) throw notFound();
  return withStatus(todo, today);
}

// BR-52: 할일 존재·소유 → 카테고리 존재·소유
export async function update(userId, id, input, today) {
  if (!(await repo.findOne(userId, id))) throw notFound();
  const categoryId = await resolveCategoryId(userId, input.categoryId);
  return withStatus(await repo.update(userId, id, { ...input, categoryId }), today);
}

export async function setCompleted(userId, id, isCompleted, today) {
  const todo = await repo.setCompleted(userId, id, isCompleted);
  if (!todo) throw notFound();
  return withStatus(todo, today);
}

export async function remove(userId, id) {
  if ((await repo.remove(userId, id)) === 0) throw notFound();
}

export async function list(userId, { categoryId, status, range }, today) {
  if (categoryId != null && !(await categories.findOne(userId, categoryId))) throw notFound();
  const rows = await repo.list(userId, { today, categoryId, status, range });
  return rows.map((t) => withStatus(t, today));
}

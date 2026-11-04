import { isUniqueViolation, withTransaction } from '../db/pool.js';
import { AppError } from '../errors/app-error.js';
import * as repo from '../repositories/category-repo.js';
import * as users from '../repositories/user-repo.js';

const MAX_PER_USER = 20; // BR-46
const DEFAULT_NAME = '기본'; // BR-17

const notFound = () => new AppError('NOT_FOUND', 'resource not found');
const duplicate = () => new AppError('DUPLICATE_CATEGORY_NAME', 'category name already exists');

// BR-14, BR-17 (API-04: 중복이 개수 제한보다 먼저)
async function assertNameFree(userId, name, excludeId, db) {
  if (name.trim().toLowerCase() === DEFAULT_NAME || (await repo.existsName(userId, name, excludeId, db))) throw duplicate();
}

// 검사와 INSERT/UPDATE 사이 경합으로 unique 위반이 나면 같은 코드로
function mapUnique(err) {
  if (isUniqueViolation(err, 'categories_user_name_uk')) throw duplicate();
  throw err;
}

export function list(userId) {
  return repo.listByUser(userId);
}

// 사용자 행을 잠가 개수 상한(BR-46) 검사와 INSERT를 직렬화한다
export async function create(userId, name) {
  return withTransaction(async (db) => {
    await users.lock(userId, db);
    await assertNameFree(userId, name, null, db);
    if ((await repo.countByUser(userId, db)) >= MAX_PER_USER) {
      throw new AppError('CATEGORY_LIMIT_EXCEEDED', `at most ${MAX_PER_USER} categories per user`);
    }
    return repo.create(userId, name, false, db);
  }).catch(mapUnique);
}

// BR-52: 존재·소유 → 보호 대상 → 중복
export async function rename(userId, id, name) {
  const category = await repo.findOne(userId, id);
  if (!category) throw notFound();
  if (category.isDefault) throw new AppError('DEFAULT_CATEGORY_PROTECTED', 'default category cannot be renamed');
  await assertNameFree(userId, name, id);
  return repo.rename(userId, id, name).catch(mapUnique);
}

// BR-13, BR-15: 이동 + 삭제 한 트랜잭션
export async function remove(userId, id) {
  const category = await repo.findOne(userId, id);
  if (!category) throw notFound();
  if (category.isDefault) throw new AppError('DEFAULT_CATEGORY_PROTECTED', 'default category cannot be deleted');
  const fallback = await repo.findDefault(userId);
  await withTransaction(async (db) => {
    await repo.moveTodos(userId, id, fallback.id, db);
    await repo.remove(userId, id, db);
  });
}

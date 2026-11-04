import { pool } from '../db/pool.js';

// 모든 쿼리에 user_id 조건 (NFR-10, PR-07). 마지막 인자 db(pool 또는 트랜잭션 client)
const COLS = 'id, name, is_default AS "isDefault"';

export async function listByUser(userId, db = pool) {
  const { rows } = await db.query(`SELECT ${COLS} FROM categories WHERE user_id = $1 ORDER BY id`, [userId]);
  return rows;
}

export async function findOne(userId, id, db = pool) {
  const { rows } = await db.query(`SELECT ${COLS} FROM categories WHERE user_id = $1 AND id = $2`, [userId, id]);
  return rows[0] ?? null;
}

export async function findDefault(userId, db = pool) {
  const { rows } = await db.query(`SELECT ${COLS} FROM categories WHERE user_id = $1 AND is_default`, [userId]);
  return rows[0] ?? null;
}

export async function countByUser(userId, db = pool) {
  const { rows } = await db.query('SELECT count(*)::int AS c FROM categories WHERE user_id = $1', [userId]);
  return rows[0].c;
}

// BR-14 정규화 비교 (categories_user_name_uk와 같은 식)
export async function existsName(userId, name, excludeId = null, db = pool) {
  const { rows } = await db.query(
    'SELECT 1 FROM categories WHERE user_id = $1 AND lower(btrim(name)) = lower(btrim($2)) AND ($3::bigint IS NULL OR id <> $3)',
    [userId, name, excludeId],
  );
  return rows.length > 0;
}

export async function create(userId, name, isDefault = false, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO categories (user_id, name, is_default) VALUES ($1, $2, $3) RETURNING ${COLS}`,
    [userId, name, isDefault],
  );
  return rows[0];
}

export async function rename(userId, id, name, db = pool) {
  const { rows } = await db.query(
    `UPDATE categories SET name = $3, updated_at = now() WHERE user_id = $1 AND id = $2 RETURNING ${COLS}`,
    [userId, id, name],
  );
  return rows[0] ?? null;
}

export async function remove(userId, id, db = pool) {
  const { rowCount } = await db.query('DELETE FROM categories WHERE user_id = $1 AND id = $2', [userId, id]);
  return rowCount;
}

// BR-15 소속 할일 일괄 이동
export async function moveTodos(userId, fromCategoryId, toCategoryId, db = pool) {
  const { rowCount } = await db.query(
    'UPDATE todos SET category_id = $3, updated_at = now() WHERE user_id = $1 AND category_id = $2',
    [userId, fromCategoryId, toCategoryId],
  );
  return rowCount;
}

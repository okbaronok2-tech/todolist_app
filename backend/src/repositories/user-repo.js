import { pool } from '../db/pool.js';

// 저장소 함수는 마지막 인자 db(pool 또는 트랜잭션 client)를 받는다
const PUBLIC = 'id, email, name';

// BR-04 대소문자 무시. password 해시 포함(서비스에서만 사용)
export async function findByEmail(email, db = pool) {
  const { rows } = await db.query(`SELECT ${PUBLIC}, password FROM users WHERE lower(email) = lower($1)`, [email]);
  return rows[0] ?? null;
}

export async function findById(id, db = pool) {
  const { rows } = await db.query(`SELECT ${PUBLIC}, password, updated_at AS "updatedAt" FROM users WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function create({ email, password, name }, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING ${PUBLIC}`,
    [email, password, name],
  );
  return rows[0];
}

// 사용자 단위 직렬화(카테고리 개수 상한 BR-46 등)에 쓰는 행 잠금
export async function lock(id, db) {
  await db.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [id]);
}

export async function updateName(id, name, db = pool) {
  await db.query('UPDATE users SET name = $2, updated_at = now() WHERE id = $1', [id, name]);
}

export async function updatePassword(id, passwordHash, db = pool) {
  await db.query('UPDATE users SET password = $2, updated_at = now() WHERE id = $1', [id, passwordHash]);
}

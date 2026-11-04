import { pool } from '../db/pool.js';

// 모든 쿼리에 user_id 조건 (NFR-10, PR-07). SELECT 별칭으로 camelCase (PR-04)
const COLS = `id, category_id AS "categoryId", title, description,
  start_date AS "startDate", end_date AS "endDate",
  is_completed AS "isCompleted", completed_at AS "completedAt",
  created_at AS "createdAt", updated_at AS "updatedAt"`;

export async function findOne(userId, id, db = pool) {
  const { rows } = await db.query(`SELECT ${COLS} FROM todos WHERE user_id = $1 AND id = $2`, [userId, id]);
  return rows[0] ?? null;
}

export async function create(userId, { categoryId, title, description, startDate, endDate }, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO todos (user_id, category_id, title, description, start_date, end_date)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${COLS}`,
    [userId, categoryId, title, description, startDate, endDate],
  );
  return rows[0];
}

// UC-06: 완료 여부는 바꾸지 않는다
export async function update(userId, id, { categoryId, title, description, startDate, endDate }, db = pool) {
  const { rows } = await db.query(
    `UPDATE todos SET category_id = $3, title = $4, description = $5, start_date = $6, end_date = $7, updated_at = now()
     WHERE user_id = $1 AND id = $2 RETURNING ${COLS}`,
    [userId, id, categoryId, title, description, startDate, endDate],
  );
  return rows[0] ?? null;
}

// BR-25, BR-28, D-10 멱등: 이미 완료면 completed_at 유지
export async function setCompleted(userId, id, isCompleted, db = pool) {
  const { rows } = await db.query(
    `UPDATE todos SET is_completed = $3,
       completed_at = CASE WHEN $3 THEN coalesce(completed_at, now()) ELSE NULL END,
       updated_at = now()
     WHERE user_id = $1 AND id = $2 RETURNING ${COLS}`,
    [userId, id, isCompleted],
  );
  return rows[0] ?? null;
}

export async function remove(userId, id, db = pool) {
  const { rowCount } = await db.query('DELETE FROM todos WHERE user_id = $1 AND id = $2', [userId, id]);
  return rowCount;
}

// BR-31 AND 필터, BR-32 상태(ERD-07 CASE → WHERE), BR-33 기간 겹침, 기본 정렬 (도메인 5.4).
// 고정 SQL 1개 + NULL 파라미터로 선택 조건을 끈다 (원칙 6.2: 문자열 조립 없음)
export async function list(userId, { today, categoryId, status, range }, db = pool) {
  const { rows } = await db.query(
    `SELECT ${COLS} FROM todos
      WHERE user_id = $1
        AND ($2::bigint IS NULL OR category_id = $2)
        AND ($3::text IS NULL
             OR ($3 = 'COMPLETED'   AND is_completed)
             OR ($3 = 'OVERDUE'     AND NOT is_completed AND end_date < $4::date)
             OR ($3 = 'NOT_STARTED' AND NOT is_completed AND start_date > $4::date)
             OR ($3 = 'IN_PROGRESS' AND NOT is_completed AND start_date <= $4::date AND end_date >= $4::date))
        AND ($5::date IS NULL OR (start_date <= $6::date AND end_date >= $5::date))
      ORDER BY end_date, start_date, created_at, id`,
    [userId, categoryId ?? null, status ?? null, today, range?.from ?? null, range?.to ?? null],
  );
  return rows;
}

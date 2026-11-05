// 부하 테스트 데이터 (T-X04, NFR-05): 사용자 1000명, 사용자당 기본 카테고리 1개 + 할일 100건(약 10만 행).
// 개발 시드(사용자 1·2) 뒤에 추가하며 `npm run seed`가 TRUNCATE로 원복한다. 비밀번호 해시는 시드의 것(haneul1234)을 재사용한다.
// 실행: node --env-file=.env tests/load-seed.js [사용자 수] [사용자당 할일 수]
import { pool } from '../src/db/pool.js';

const USERS = Number(process.argv[2] ?? 1000);
const TODOS_PER_USER = Number(process.argv[3] ?? 100);
const HASH = '$2b$10$fLkSQUfeBtlVwoMty5tem.8/5FzVX16iusobvQciK6.eNpNyhWA1W'; // haneul1234

const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query(
    `INSERT INTO users (email, password, name)
       SELECT format('load-%s@example.com', lpad(g::text, 4, '0')), $1, format('부하사용자%s', g)
         FROM generate_series(1, $2::int) g
       ON CONFLICT DO NOTHING`,
    [HASH, USERS],
  );
  await client.query(
    `INSERT INTO categories (user_id, name, is_default)
       SELECT u.id, '기본', true FROM users u
        WHERE u.email LIKE 'load-%@example.com'
          AND NOT EXISTS (SELECT 1 FROM categories c WHERE c.user_id = u.id)`,
  );
  // 시작일: 2026-09-01 ~ 2026-12-31 범위에 고르게, 기간 0~6일, 완료 20%
  await client.query(
    `INSERT INTO todos (user_id, category_id, title, start_date, end_date, is_completed, completed_at)
       SELECT u.id, c.id, format('부하 할일 %s', g),
              d.start_date, d.start_date + (g % 7),
              (g % 5 = 0), CASE WHEN g % 5 = 0 THEN now() END
         FROM users u
         JOIN categories c ON c.user_id = u.id AND c.is_default
         CROSS JOIN generate_series(1, $1::int) g
         CROSS JOIN LATERAL (SELECT DATE '2026-09-01' + ((((u.id * 7 + g * 13) % 122)::int) AS start_date) d
        WHERE u.email LIKE 'load-%@example.com'
          AND NOT EXISTS (SELECT 1 FROM todos t WHERE t.user_id = u.id)`,
    [TODOS_PER_USER],
  );
  await client.query('COMMIT');
  const { rows } = await client.query(
    `SELECT (SELECT count(*) FROM users WHERE email LIKE 'load-%@example.com')::int AS users,
            (SELECT count(*) FROM todos t JOIN users u ON u.id = t.user_id WHERE u.email LIKE 'load-%@example.com')::int AS todos`,
  );
  console.log(`load data: users=${rows[0].users} todos=${rows[0].todos}`);
} catch (e) {
  await client.query('ROLLBACK').catch(() => {});
  throw e;
} finally {
  client.release();
  await pool.end();
}

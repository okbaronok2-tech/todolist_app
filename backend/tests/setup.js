// 테스트 DB(.env.test의 todolist_test)에 마이그레이션과 시드를 다시 적용한다 (원칙 5장).
// 직접 실행: `node --env-file=.env.test tests/setup.js` 또는 env 없이 `node tests/setup.js`.
// 테스트 파일은 `resetDb()`를 import해 before()에서 호출한다.
import { fileURLToPath } from 'node:url';

if (!process.env.DATABASE_URL) process.loadEnvFile(new URL('../.env.test', import.meta.url));

const { migrate, seed } = await import('../src/db/migrate.js');
const { pool } = await import('../src/db/pool.js');

export async function resetDb() {
  await migrate();
  await seed();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await resetDb();
  } finally {
    await pool.end();
  }
}

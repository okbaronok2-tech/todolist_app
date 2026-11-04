// 테스트 DB(.env.test의 todolist_test)에 마이그레이션과 시드를 다시 적용한다 (원칙 5장).
// `node --env-file=.env.test tests/setup.js` 또는 env 없이 `node tests/setup.js` 둘 다 동작한다.
if (!process.env.DATABASE_URL) process.loadEnvFile(new URL('../.env.test', import.meta.url));

const { migrate, seed } = await import('../src/db/migrate.js');
const { pool } = await import('../src/db/pool.js');

try {
  await migrate();
  await seed();
} finally {
  await pool.end();
}

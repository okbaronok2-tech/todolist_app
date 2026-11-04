import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(here, 'migrations');

// 원칙 6.3: migrations/NNN_name.sql 번호순, 적용된 파일명은 schema_migrations에 기록, 미적용분만 실행
export async function migrate() {
  await pool.query(
    'CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())',
  );
  const files = (await readdir(migrationsDir)).filter((f) => /^\d{3}_.+\.sql$/.test(f)).sort();
  const { rows } = await pool.query('SELECT filename FROM schema_migrations');
  const applied = new Set(rows.map((r) => r.filename));
  for (const file of files) {
    if (applied.has(file)) continue;
    // 파일 안의 BEGIN/COMMIT이 원자성을 보장한다. 기록 INSERT는 그 뒤라 실패 시 다음 실행에서 재시도된다.
    await pool.query(await readFile(path.join(migrationsDir, file), 'utf8'));
    await pool.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
    console.log(`applied ${file}`);
  }
}

// 시나리오 3장 샘플 데이터. TRUNCATE ... RESTART IDENTITY로 id가 항상 1부터 (원칙 5장)
export async function seed() {
  await pool.query(await readFile(path.join(here, 'seed.sql'), 'utf8'));
  console.log('seeded');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const cmd = process.argv[2] ?? 'migrate';
  try {
    if (cmd === 'migrate') await migrate();
    else if (cmd === 'seed') await seed();
    else throw new Error(`unknown command: ${cmd}`);
  } finally {
    await pool.end();
  }
}

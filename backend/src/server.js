import { app } from './app.js';
import { pool } from './db/pool.js';

// 원칙 6.1: JWT_SECRET 48자 이상(NFR-06), DATABASE_URL 필수. 없으면 기동 실패
const secret = process.env.JWT_SECRET ?? '';
if (secret.length < 48) {
  console.error('JWT_SECRET is missing or shorter than 48 characters');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is missing');
  process.exit(1);
}

const port = Number(process.env.PORT) || 3000;
const server = app.listen(port, () => console.log(`listening on ${port}`));

// 원칙 6.3 graceful shutdown
function shutdown(signal) {
  console.log(`${signal} received, closing`);
  server.close(async () => {
    await pool.end();
    console.log('pool closed');
    process.exit(0);
  });
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

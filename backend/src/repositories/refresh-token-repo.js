import { pool } from '../db/pool.js';

// NFR-06, PRD 6.4. 토큰 원문은 받지 않고 SHA-256 hex 해시만 다룬다
export async function insert({ userId, tokenHash, expiresAt }, db = pool) {
  await db.query('INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)', [userId, tokenHash, expiresAt]);
}

// forUpdate: 회전 경합 직렬화 (트랜잭션 client 필요)
export async function findByHash(tokenHash, { forUpdate = false } = {}, db = pool) {
  const { rows } = await db.query(
    `SELECT r.id, r.user_id AS "userId", r.expires_at AS "expiresAt", r.revoked_at AS "revokedAt", u.name AS "userName"
       FROM refresh_tokens r JOIN users u ON u.id = r.user_id
      WHERE r.token_hash = $1${forUpdate ? ' FOR UPDATE OF r' : ''}`,
    [tokenHash],
  );
  return rows[0] ?? null;
}

export async function revoke(id, db = pool) {
  await db.query('UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL', [id]);
}

export async function revokeByHash(tokenHash, db = pool) {
  await db.query('UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL', [tokenHash]);
}

// 재사용 탐지: 그 사용자의 행 전부 폐기
export async function revokeAllForUser(userId, db = pool) {
  await db.query('UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [userId]);
}

// 로그인 시 만료·폐기 행 삭제
export async function cleanup(userId, db = pool) {
  await db.query('DELETE FROM refresh_tokens WHERE user_id = $1 AND (expires_at < now() OR revoked_at IS NOT NULL)', [userId]);
}

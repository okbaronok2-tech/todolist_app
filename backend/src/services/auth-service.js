import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import { isUniqueViolation, withTransaction } from '../db/pool.js';
import { AppError } from '../errors/app-error.js';
import { REFRESH_TTL_SEC } from '../middlewares/auth.js';
import * as users from '../repositories/user-repo.js';
import * as tokens from '../repositories/refresh-token-repo.js';
import * as categories from '../repositories/category-repo.js';

const BCRYPT_COST = 10; // NFR-07
const DEFAULT_CATEGORY_NAME = '기본'; // BR-11
// BR-06: 이메일이 없어도 bcrypt 1회를 수행해 응답 시간으로 존재 여부를 추정하지 못하게 한다
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', BCRYPT_COST);

export const hashToken = (raw) => createHash('sha256').update(raw).digest('hex');
const publicUser = (u) => ({ id: u.id, name: u.name });
const unauthorized = () => new AppError('UNAUTHORIZED', 'please log in again');

// 리프레시 토큰 발급: 원문은 반환만, DB에는 해시 (NFR-06)
async function issueRefreshToken(userId, db) {
  const raw = randomBytes(32).toString('base64url');
  await tokens.insert({ userId, tokenHash: hashToken(raw), expiresAt: new Date(Date.now() + REFRESH_TTL_SEC * 1000) }, db);
  return raw;
}

// UC-01: BR-04 중복 → 사용자 생성 → 기본 카테고리(BR-11), 한 트랜잭션
export async function signup({ email, password, name }) {
  const duplicate = () => new AppError('DUPLICATE_EMAIL', 'email already registered');
  try {
    return await withTransaction(async (db) => {
      if (await users.findByEmail(email, db)) throw duplicate();
      const user = await users.create({ email, password: await bcrypt.hash(password, BCRYPT_COST), name }, db);
      await categories.create(user.id, DEFAULT_CATEGORY_NAME, true, db);
      const refreshToken = await issueRefreshToken(user.id, db);
      return { user: publicUser(user), refreshToken };
    });
  } catch (err) {
    if (isUniqueViolation(err, 'users_email_lower_uk')) throw duplicate(); // 동시 가입 경합
    throw err;
  }
}

// UC-02: BR-06 실패 사유 미구분. 성공 시 만료·폐기 행 삭제 (PRD 6.4)
export async function login({ email, password }) {
  const user = await users.findByEmail(email);
  const ok = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);
  if (!user || !ok) throw new AppError('INVALID_CREDENTIALS', 'invalid email or password');
  await tokens.cleanup(user.id);
  const refreshToken = await issueRefreshToken(user.id);
  return { user: publicUser(user), refreshToken };
}

// PRD 6.4 회전·재사용 탐지. 행 잠금(FOR UPDATE)으로 같은 토큰의 동시 요청을 직렬화한다.
// 재사용 탐지의 전체 폐기는 커밋돼야 하므로 트랜잭션 안에서 throw하지 않고 결과로 돌려준다.
export async function refresh(rawToken) {
  if (!rawToken) throw unauthorized();
  const result = await withTransaction(async (db) => {
    const row = await tokens.findByHash(hashToken(rawToken), { forUpdate: true }, db);
    if (!row || row.expiresAt < new Date()) return null;
    if (row.revokedAt) {
      await tokens.revokeAllForUser(row.userId, db);
      return null;
    }
    await tokens.revoke(row.id, db);
    const refreshToken = await issueRefreshToken(row.userId, db);
    return { user: { id: row.userId, name: row.userName }, refreshToken };
  });
  if (!result) throw unauthorized();
  return result;
}

// UC-03: 쿠키·행이 없어도 오류 아님 (항상 204)
export async function logout(rawToken) {
  if (rawToken) await tokens.revokeByHash(hashToken(rawToken));
}

import bcrypt from 'bcrypt';
import { withTransaction } from '../db/pool.js';
import { AppError } from '../errors/app-error.js';
import * as users from '../repositories/user-repo.js';
import * as tokens from '../repositories/refresh-token-repo.js';
import { issueRefreshToken } from './auth-service.js';

const BCRYPT_COST = 10; // NFR-07

const publicUser = ({ id, email, name }) => ({ id, email, name });

// 토큰은 유효한데 사용자 행이 없으면(현재는 도달 불가, D-04) 인증 실패로 본다
async function requireUser(userId) {
  const user = await users.findById(userId);
  if (!user) throw new AppError('UNAUTHORIZED', 'authentication required');
  return user;
}

export async function getMe(userId) {
  return publicUser(await requireUser(userId));
}

// BR-03 본인 고정, BR-05 현재 비밀번호 확인, D-06 이메일 변경 없음.
// 비밀번호를 바꾸면 리프레시 토큰을 전부 폐기하고 현재 세션용 새 토큰을 발급한다 (PRD 6.4, 11-security S-01).
// 반환: { user, refreshToken } (refreshToken은 비밀번호를 바꾼 경우에만 값이 있다)
export async function updateMe(userId, { name, currentPassword, newPassword }) {
  const user = await requireUser(userId);
  if (newPassword !== undefined) {
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      throw new AppError('INVALID_CREDENTIALS', 'current password is incorrect');
    }
  }
  const passwordHash = newPassword === undefined ? null : await bcrypt.hash(newPassword, BCRYPT_COST);
  // BR-52 부분 저장 없음: 이름·비밀번호 UPDATE를 한 트랜잭션으로
  let refreshToken = null;
  await withTransaction(async (db) => {
    if (passwordHash) {
      await users.updatePassword(userId, passwordHash, db);
      await tokens.revokeAllForUser(userId, db);
      refreshToken = await issueRefreshToken(userId, db);
    }
    if (name !== undefined) await users.updateName(userId, name, db);
  });
  return { user: await getMe(userId), refreshToken };
}

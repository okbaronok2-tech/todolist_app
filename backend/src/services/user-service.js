import bcrypt from 'bcrypt';
import { AppError } from '../errors/app-error.js';
import * as users from '../repositories/user-repo.js';

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

// BR-03 본인 고정, BR-05 현재 비밀번호 확인, D-06 이메일 변경 없음
export async function updateMe(userId, { name, currentPassword, newPassword }) {
  const user = await requireUser(userId);
  if (newPassword !== undefined) {
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      throw new AppError('INVALID_CREDENTIALS', 'current password is incorrect');
    }
    await users.updatePassword(userId, await bcrypt.hash(newPassword, BCRYPT_COST));
  }
  if (name !== undefined) await users.updateName(userId, name);
  return getMe(userId);
}

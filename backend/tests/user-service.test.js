import { after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { resetDb } from './setup.js';
import { pool } from '../src/db/pool.js';
import * as userService from '../src/services/user-service.js';
import * as auth from '../src/services/auth-service.js';

// T-B08 (P1) 완료 조건
const rejects = (promise, code) => assert.rejects(promise, (e) => e.code === code);

beforeEach(resetDb);
after(() => pool.end());

test('UC-04 getMe는 id, email, name만 (password 없음)', async () => {
  assert.deepEqual(await userService.getMe(2), { id: 2, email: 'seojun@example.com', name: '이서준' });
});

test('BR-03 이름 변경 후 재조회 반영, updatedAt 갱신. 타인 불변', async () => {
  const before = (await pool.query('SELECT updated_at FROM users WHERE id = 2')).rows[0].updated_at;
  const { user: me, refreshToken } = await userService.updateMe(2, { name: '이서준(팀장)' });
  assert.equal(me.name, '이서준(팀장)');
  assert.equal(refreshToken, null); // 이름만 바꾸면 토큰은 그대로
  assert.equal((await userService.getMe(2)).name, '이서준(팀장)');
  assert.ok((await pool.query('SELECT updated_at FROM users WHERE id = 2')).rows[0].updated_at > before);
  assert.equal((await userService.getMe(1)).name, '김하늘');
});

test('BR-05 현재 비밀번호 틀리면 INVALID_CREDENTIALS, 기존 비밀번호 유지', async () => {
  await rejects(userService.updateMe(2, { currentPassword: 'wrongpass1', newPassword: 'seojun5678' }), 'INVALID_CREDENTIALS');
  await auth.login({ email: 'seojun@example.com', password: 'seojun1234' });
});

test('BR-05 변경 후 새 비밀번호로 로그인, 옛 비밀번호는 INVALID_CREDENTIALS', async () => {
  const { refreshToken } = await userService.updateMe(2, { currentPassword: 'seojun1234', newPassword: 'seojun5678' });
  assert.match(refreshToken, /^[A-Za-z0-9_-]{43}$/);
  await auth.login({ email: 'seojun@example.com', password: 'seojun5678' });
  await rejects(auth.login({ email: 'seojun@example.com', password: 'seojun1234' }), 'INVALID_CREDENTIALS');
});

test('S-01 비밀번호 변경 시 기존 리프레시 토큰 전부 폐기, 새 토큰만 유효', async () => {
  const a = await auth.login({ email: 'seojun@example.com', password: 'seojun1234' });
  const b = await auth.login({ email: 'seojun@example.com', password: 'seojun1234' });
  const { refreshToken: fresh } = await userService.updateMe(2, { currentPassword: 'seojun1234', newPassword: 'seojun5678' });
  const { rows } = await pool.query('SELECT count(*)::int AS live FROM refresh_tokens WHERE user_id = 2 AND revoked_at IS NULL');
  assert.equal(rows[0].live, 1); // 새 토큰 1개만 유효
  const rotated = await auth.refresh(fresh); // 새 토큰은 회전 가능
  assert.deepEqual(rotated.user, { id: 2, name: '이서준' });
  // 폐기된 옛 토큰은 UNAUTHORIZED. (재사용 탐지로 그 사용자의 토큰이 전부 폐기되는 것은 PRD 6.4 그대로)
  await rejects(auth.refresh(a.refreshToken), 'UNAUTHORIZED');
  await rejects(auth.refresh(b.refreshToken), 'UNAUTHORIZED');
});

test('비밀번호 검증 실패 시 이름도 저장되지 않는다 (BR-52 부분 저장 없음)', async () => {
  await rejects(userService.updateMe(2, { name: '바뀜', currentPassword: 'wrongpass1', newPassword: 'seojun5678' }), 'INVALID_CREDENTIALS');
  assert.equal((await userService.getMe(2)).name, '이서준');
});

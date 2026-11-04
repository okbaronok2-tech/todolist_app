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
  const me = await userService.updateMe(2, { name: '이서준(팀장)' });
  assert.equal(me.name, '이서준(팀장)');
  assert.equal((await userService.getMe(2)).name, '이서준(팀장)');
  assert.ok((await pool.query('SELECT updated_at FROM users WHERE id = 2')).rows[0].updated_at > before);
  assert.equal((await userService.getMe(1)).name, '김하늘');
});

test('BR-05 현재 비밀번호 틀리면 INVALID_CREDENTIALS, 기존 비밀번호 유지', async () => {
  await rejects(userService.updateMe(2, { currentPassword: 'wrongpass1', newPassword: 'seojun5678' }), 'INVALID_CREDENTIALS');
  await auth.login({ email: 'seojun@example.com', password: 'seojun1234' });
});

test('BR-05 변경 후 새 비밀번호로 로그인, 옛 비밀번호는 INVALID_CREDENTIALS', async () => {
  await userService.updateMe(2, { currentPassword: 'seojun1234', newPassword: 'seojun5678' });
  await auth.login({ email: 'seojun@example.com', password: 'seojun5678' });
  await rejects(auth.login({ email: 'seojun@example.com', password: 'seojun1234' }), 'INVALID_CREDENTIALS');
});

test('비밀번호 검증 실패 시 이름도 저장되지 않는다 (BR-52 부분 저장 없음)', async () => {
  await rejects(userService.updateMe(2, { name: '바뀜', currentPassword: 'wrongpass1', newPassword: 'seojun5678' }), 'INVALID_CREDENTIALS');
  assert.equal((await userService.getMe(2)).name, '이서준');
});

import { after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { resetDb } from './setup.js';
import { pool } from '../src/db/pool.js';
import * as auth from '../src/services/auth-service.js';

const q = (text, params) => pool.query(text, params);
const count = async (table, where = '', params = []) =>
  (await q(`SELECT count(*)::int AS c FROM ${table} ${where}`, params)).rows[0].c;
const tokenRows = (userId) => q('SELECT id, token_hash, expires_at, revoked_at FROM refresh_tokens WHERE user_id = $1 ORDER BY id', [userId]);
const rejects = (promise, code) => assert.rejects(promise, (e) => e.code === code);

beforeEach(resetDb);
after(() => pool.end());

test('BR-11 가입 직후 기본 카테고리가 name=기본, is_default=true 1개', async () => {
  const { user, refreshToken } = await auth.signup({ email: 'new@example.com', password: 'password1', name: '신규' });
  assert.deepEqual(Object.keys(user).sort(), ['id', 'name']);
  const { rows } = await q('SELECT name, is_default FROM categories WHERE user_id = $1', [user.id]);
  assert.deepEqual(rows, [{ name: '기본', is_default: true }]);
  const tokens = (await tokenRows(user.id)).rows;
  assert.equal(tokens.length, 1);
  assert.match(tokens[0].token_hash, /^[0-9a-f]{64}$/);
  assert.notEqual(tokens[0].token_hash, refreshToken);
});

test('BR-04 대소문자만 다른 이메일 가입은 DUPLICATE_EMAIL, 행 수 불변', async () => {
  const users = await count('users');
  const categories = await count('categories');
  await rejects(auth.signup({ email: 'SEOJUN@example.com', password: 'password1', name: '중복' }), 'DUPLICATE_EMAIL');
  assert.equal(await count('users'), users);
  assert.equal(await count('categories'), categories);
});

test('가입 트랜잭션: 기본 카테고리 생성 실패 시 사용자 행도 없음', async () => {
  await q("CREATE OR REPLACE FUNCTION fail_insert() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'forced'; END $$ LANGUAGE plpgsql");
  await q('DROP TRIGGER IF EXISTS fail_cat ON categories');
  await q('CREATE TRIGGER fail_cat BEFORE INSERT ON categories FOR EACH ROW EXECUTE FUNCTION fail_insert()');
  try {
    await assert.rejects(auth.signup({ email: 'tx@example.com', password: 'password1', name: '트랜잭션' }), /forced/);
    assert.equal(await count('users', "WHERE email = 'tx@example.com'"), 0);
  } finally {
    await q('DROP TRIGGER fail_cat ON categories');
    await q('DROP FUNCTION fail_insert()');
  }
});

test('BR-06 없는 이메일과 틀린 비밀번호가 같은 INVALID_CREDENTIALS', async () => {
  const errors = [];
  for (const input of [{ email: 'nobody@example.com', password: 'password1' }, { email: 'seojun@example.com', password: 'wrongpass1' }]) {
    try {
      await auth.login(input);
      assert.fail('should reject');
    } catch (e) {
      errors.push({ code: e.code, message: e.message });
    }
  }
  assert.deepEqual(errors[0], errors[1]);
  assert.equal(errors[0].code, 'INVALID_CREDENTIALS');
});

test('BR-06 시드 사용자 로그인 성공, 만료·폐기 행 삭제', async () => {
  await q("INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (2, repeat('a', 64), now() - interval '1 day')");
  await q("INSERT INTO refresh_tokens (user_id, token_hash, expires_at, revoked_at) VALUES (2, repeat('b', 64), now() + interval '1 day', now())");
  const { user } = await auth.login({ email: 'seojun@example.com', password: 'seojun1234' });
  assert.deepEqual(user, { id: 2, name: '이서준' });
  const rows = (await tokenRows(2)).rows;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].revoked_at, null);
});

test('PRD 6.4 refresh 회전: 기존 행 revoked_at, 새 행 1개', async () => {
  const { refreshToken } = await auth.login({ email: 'seojun@example.com', password: 'seojun1234' });
  const { user, refreshToken: next } = await auth.refresh(refreshToken);
  assert.deepEqual(user, { id: 2, name: '이서준' });
  assert.notEqual(next, refreshToken);
  const rows = (await tokenRows(2)).rows;
  assert.equal(rows.length, 2);
  assert.notEqual(rows[0].revoked_at, null);
  assert.equal(rows[1].revoked_at, null);
});

test('PRD 6.4 재사용 탐지: 회전된 토큰 재사용 시 UNAUTHORIZED, 사용자 전체 폐기, 새 토큰도 무효', async () => {
  const { refreshToken } = await auth.login({ email: 'seojun@example.com', password: 'seojun1234' });
  const { refreshToken: next } = await auth.refresh(refreshToken);
  await rejects(auth.refresh(refreshToken), 'UNAUTHORIZED');
  const rows = (await tokenRows(2)).rows;
  assert.ok(rows.every((r) => r.revoked_at !== null));
  await rejects(auth.refresh(next), 'UNAUTHORIZED');
});

test('PRD 6.4 만료된 리프레시 토큰은 UNAUTHORIZED', async () => {
  const { refreshToken } = await auth.login({ email: 'seojun@example.com', password: 'seojun1234' });
  await q("UPDATE refresh_tokens SET expires_at = now() - interval '1 second' WHERE user_id = 2");
  await rejects(auth.refresh(refreshToken), 'UNAUTHORIZED');
});

test('없는 토큰·빈 토큰은 UNAUTHORIZED', async () => {
  await rejects(auth.refresh(undefined), 'UNAUTHORIZED');
  await rejects(auth.refresh('not-a-token'), 'UNAUTHORIZED');
});

test('UC-03 로그아웃은 행을 폐기하고 그 토큰으로 refresh 불가. 토큰 없어도 오류 아님', async () => {
  const { refreshToken } = await auth.login({ email: 'seojun@example.com', password: 'seojun1234' });
  await auth.logout(refreshToken);
  assert.notEqual((await tokenRows(2)).rows[0].revoked_at, null);
  await rejects(auth.refresh(refreshToken), 'UNAUTHORIZED');
  await auth.logout(undefined);
  await auth.logout('unknown');
});

test('PRD 6.4 같은 리프레시 토큰 동시 요청 3건: 성공은 정확히 1건, 나머지 UNAUTHORIZED, 전부 폐기', async () => {
  const { refreshToken } = await auth.login({ email: 'seojun@example.com', password: 'seojun1234' });
  const results = await Promise.allSettled([1, 2, 3].map(() => auth.refresh(refreshToken)));
  const ok = results.filter((r) => r.status === 'fulfilled');
  assert.equal(ok.length, 1);
  assert.ok(results.filter((r) => r.status === 'rejected').every((r) => r.reason.code === 'UNAUTHORIZED'));
  // 첫 성공 뒤 두 번째가 재사용으로 판정돼 사용자 전체 폐기 → 성공한 새 토큰도 무효
  const rows = (await tokenRows(2)).rows;
  assert.ok(rows.every((r) => r.revoked_at !== null));
  await rejects(auth.refresh(ok[0].value.refreshToken), 'UNAUTHORIZED');
});

import { after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { resetDb } from './setup.js';
import { pool } from '../src/db/pool.js';
import * as categories from '../src/services/category-service.js';

const q = (text, params) => pool.query(text, params);
const rejects = (promise, code) => assert.rejects(promise, (e) => e.code === code);

beforeEach(resetDb);
after(() => pool.end());

test('목록은 본인 카테고리만 (사용자 2 → 3, 4, 5)', async () => {
  assert.deepEqual((await categories.list(2)).map((c) => c.id), [3, 4, 5]);
  assert.deepEqual((await categories.list(1)).map((c) => c.id), [1, 2]);
});

test('BR-14 공백·대소문자 변형 중복은 DUPLICATE_CATEGORY_NAME, 다른 사용자는 허용', async () => {
  await rejects(categories.create(2, ' 업무 '), 'DUPLICATE_CATEGORY_NAME');
  await q("UPDATE categories SET name = 'Work' WHERE id = 4");
  await rejects(categories.create(2, 'work'), 'DUPLICATE_CATEGORY_NAME');
  const created = await categories.create(1, '업무');
  assert.equal(created.name, '업무');
  assert.equal(created.isDefault, false);
});

test('BR-17 기본이라는 이름으로 생성·변경 불가', async () => {
  await rejects(categories.create(2, '기본'), 'DUPLICATE_CATEGORY_NAME');
  await rejects(categories.create(2, ' 기본 '), 'DUPLICATE_CATEGORY_NAME');
  await rejects(categories.rename(2, 4, '기본'), 'DUPLICATE_CATEGORY_NAME');
});

test('BR-13·17 기본 카테고리 이름 변경·삭제는 DEFAULT_CATEGORY_PROTECTED, 행 유지', async () => {
  await rejects(categories.rename(2, 3, '새이름'), 'DEFAULT_CATEGORY_PROTECTED');
  await rejects(categories.remove(2, 3), 'DEFAULT_CATEGORY_PROTECTED');
  const { rows } = await q('SELECT name, is_default FROM categories WHERE id = 3');
  assert.deepEqual(rows, [{ name: '기본', is_default: true }]);
});

test('BR-46 20개인 사용자의 생성은 CATEGORY_LIMIT_EXCEEDED', async () => {
  for (let i = 3; i < 20; i++) await categories.create(2, `c${i}`);
  assert.equal((await categories.list(2)).length, 20);
  await rejects(categories.create(2, 'one-more'), 'CATEGORY_LIMIT_EXCEEDED');
});

test('BR-15 삭제 시 소속 할일은 기본 카테고리로 이동, 할일 수 불변', async () => {
  const before = (await q('SELECT count(*)::int AS c FROM todos')).rows[0].c;
  await categories.remove(2, 4); // 업무: 할일 1, 2, 3, 5
  const { rows } = await q('SELECT id, category_id FROM todos WHERE id IN (1, 2, 3, 5) ORDER BY id');
  assert.ok(rows.every((r) => r.category_id === 3));
  assert.equal((await q('SELECT count(*)::int AS c FROM todos')).rows[0].c, before);
  assert.equal((await q('SELECT count(*)::int AS c FROM categories WHERE id = 4')).rows[0].c, 0);
});

test('BR-15 이동 UPDATE 실패 시 롤백, 카테고리 유지', async () => {
  await q("CREATE FUNCTION fail_update() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'forced'; END $$ LANGUAGE plpgsql");
  await q('CREATE TRIGGER fail_move BEFORE UPDATE ON todos FOR EACH ROW EXECUTE FUNCTION fail_update()');
  try {
    await assert.rejects(categories.remove(2, 4));
    assert.equal((await q('SELECT count(*)::int AS c FROM categories WHERE id = 4')).rows[0].c, 1);
    assert.equal((await q('SELECT count(*)::int AS c FROM todos WHERE category_id = 4')).rows[0].c, 4);
  } finally {
    await q('DROP TRIGGER fail_move ON todos');
    await q('DROP FUNCTION fail_update()');
  }
});

test('BR-02 타인·미존재 id는 같은 NOT_FOUND, 타인 데이터 불변', async () => {
  const errors = [];
  for (const id of [2, 999]) {
    for (const op of [() => categories.rename(2, id, 'x'), () => categories.remove(2, id)]) {
      try {
        await op();
        assert.fail('should reject');
      } catch (e) {
        errors.push(`${e.code}:${e.message}`);
      }
    }
  }
  assert.equal(new Set(errors).size, 1);
  assert.match(errors[0], /^NOT_FOUND:/);
  assert.equal((await q('SELECT name FROM categories WHERE id = 2')).rows[0].name, '과제');
});

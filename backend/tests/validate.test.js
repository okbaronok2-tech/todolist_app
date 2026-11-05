import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as v from '../src/routes/validate.js';

// T-B02 완료 조건. 순수 함수라 DB 불필요
const code = (fn) => {
  try {
    fn();
    return 'pass';
  } catch (e) {
    return e.code;
  }
};
const d = { startDate: '2026-11-03', endDate: '2026-11-04' };

test('BR-44 비밀번호 7자 거부, 8·64자 통과, 65자 거부', () => {
  assert.equal(code(() => v.password('a'.repeat(7))), 'VALIDATION_ERROR');
  assert.equal(code(() => v.password('a'.repeat(8))), 'pass');
  assert.equal(code(() => v.password('a'.repeat(64))), 'pass');
  assert.equal(code(() => v.password('a'.repeat(65))), 'VALIDATION_ERROR');
  assert.equal(v.password('가'.repeat(24)), '가'.repeat(24)); // 72바이트
  assert.equal(code(() => v.password('가'.repeat(25))), 'VALIDATION_ERROR'); // 75바이트 (S-03)
  assert.equal(v.id('999999999999999'), 999999999999999); // 15자리
  assert.equal(code(() => v.id('1000000000000000')), 'NOT_FOUND'); // 16자리 (S-02)
});

test('BR-43 @ 없는 이메일·255자 이메일 거부', () => {
  assert.equal(code(() => v.email('abc')), 'VALIDATION_ERROR');
  assert.equal(code(() => v.email(`${'a'.repeat(243)}@example.com`)), 'VALIDATION_ERROR');
  assert.equal(code(() => v.email('a@b.c')), 'pass');
});

test('BR-21·41 제목: 공백만·101자 거부, 100자 통과, trim 반환', () => {
  assert.equal(code(() => v.todoBody({ title: '   ', ...d })), 'VALIDATION_ERROR');
  assert.equal(code(() => v.todoBody({ title: 'a'.repeat(101), ...d })), 'VALIDATION_ERROR');
  assert.equal(v.todoBody({ title: ` ${'a'.repeat(100)} `, ...d }).title, 'a'.repeat(100));
});

test('BR-42 설명 1001자 거부, 없음은 null로 통과', () => {
  assert.equal(code(() => v.todoBody({ title: 't', description: 'a'.repeat(1001), ...d })), 'VALIDATION_ERROR');
  assert.equal(v.todoBody({ title: 't', ...d }).description, null);
});

test('BR-45·46 이름 51자, 카테고리명 31자 거부', () => {
  assert.equal(code(() => v.name('a'.repeat(51))), 'VALIDATION_ERROR');
  assert.equal(code(() => v.name('  ')), 'VALIDATION_ERROR');
  assert.equal(code(() => v.categoryName('a'.repeat(31))), 'VALIDATION_ERROR');
  assert.equal(code(() => v.categoryName('a'.repeat(30))), 'pass');
});

test('BR-52 제목 없음 + startDate > endDate는 VALIDATION_ERROR가 먼저', () => {
  assert.equal(code(() => v.dateRange(v.todoBody({ startDate: '2026-11-05', endDate: '2026-11-04' }))), 'VALIDATION_ERROR');
});

test('BR-22 같은 날짜 통과, startDate > endDate는 INVALID_DATE_RANGE', () => {
  assert.equal(code(() => v.dateRange({ startDate: '2026-11-04', endDate: '2026-11-04' })), 'pass');
  assert.equal(code(() => v.dateRange({ startDate: '2026-11-05', endDate: '2026-11-04' })), 'INVALID_DATE_RANGE');
});

test('BR-32 today 없음·2026-1-3·존재하지 않는 날짜·연도 0000은 VALIDATION_ERROR', () => {
  for (const x of [undefined, '2026-1-3', '2026-13-01', '2026-02-30', '0000-01-01']) assert.equal(code(() => v.today(x)), 'VALIDATION_ERROR', String(x));
  assert.equal(v.today('2026-11-03'), '2026-11-03');
});

test('PRD 6.3 ID abc·0·-1·1.5·19자리는 NOT_FOUND, 1은 통과', () => {
  for (const x of ['abc', '0', '-1', '1.5', '9'.repeat(19)]) assert.equal(code(() => v.id(x)), 'NOT_FOUND', x);
  assert.equal(v.id('1'), 1);
  assert.equal(v.optionalCategoryId(null), null);
});

test('AD-C4 from/to 한쪽만 있으면 VALIDATION_ERROR, isCompleted boolean만', () => {
  assert.equal(code(() => v.dateRangeQuery({ from: '2026-11-02' })), 'VALIDATION_ERROR');
  assert.equal(v.dateRangeQuery({}), null);
  assert.deepEqual(v.dateRangeQuery({ from: '2026-11-02', to: '2026-11-08' }), { from: '2026-11-02', to: '2026-11-08' });
  assert.equal(code(() => v.isCompleted('yes')), 'VALIDATION_ERROR');
  assert.equal(code(() => v.statusFilter('DONE')), 'VALIDATION_ERROR');
});

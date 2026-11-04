import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STATUS, todoStatus } from '../src/services/todo-status.js';

// 도메인 정의서 4.3 검증 예 4건. today = 2026-11-03
const today = '2026-11-03';

test('ST-01 완료는 날짜와 무관 (11-01~11-02 완료 → COMPLETED)', () => {
  assert.equal(todoStatus({ isCompleted: true, startDate: '2026-11-01', endDate: '2026-11-02' }, today), STATUS.COMPLETED);
});

test('ST-02 종료일 경과 미완료 (11-01~11-02 → OVERDUE)', () => {
  assert.equal(todoStatus({ isCompleted: false, startDate: '2026-11-01', endDate: '2026-11-02' }, today), STATUS.OVERDUE);
});

test('ST-03 시작 전 (11-04~11-05 → NOT_STARTED)', () => {
  assert.equal(todoStatus({ isCompleted: false, startDate: '2026-11-04', endDate: '2026-11-05' }, today), STATUS.NOT_STARTED);
});

test('ST-04 진행중, 경계일 포함 (11-03~11-03 → IN_PROGRESS)', () => {
  assert.equal(todoStatus({ isCompleted: false, startDate: '2026-11-03', endDate: '2026-11-03' }, today), STATUS.IN_PROGRESS);
});

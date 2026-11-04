// 입력 검증 순수 함수 (BR-21, BR-22, BR-32, BR-41~46, PRD 6.3 ID 정수). 통과 시 정규화 값을 돌려준다.
import { AppError } from '../errors/app-error.js';
import { STATUS } from '../services/todo-status.js';

const DATE_RE = /^(?!0000)\d{4}-\d{2}-\d{2}$/; // 연도 0000은 PostgreSQL DATE 범위 밖
const ID_RE = /^[1-9]\d{0,17}$/; // 18자리 이하: BIGINT 범위·JS 안전 정수 안
const EMAIL_RE = /^[^@\s]+@[^@\s]+$/;

const fail = (message) => {
  throw new AppError('VALIDATION_ERROR', message);
};
const isStr = (v) => typeof v === 'string';

// BR-43
export function email(value) {
  if (!isStr(value) || value.length > 254 || !EMAIL_RE.test(value)) fail('email must be local@domain, 254 chars or less');
  return value;
}

// BR-44
export function password(value, field = 'password') {
  if (!isStr(value) || value.length < 8 || value.length > 64) fail(`${field} must be 8 to 64 characters`);
  return value;
}

// BR-45
export function name(value) {
  const v = isStr(value) ? value.trim() : '';
  if (v.length < 1 || v.length > 50) fail('name must be 1 to 50 characters after trim');
  return v;
}

// BR-46 길이
export function categoryName(value) {
  const v = isStr(value) ? value.trim() : '';
  if (v.length < 1 || v.length > 30) fail('category name must be 1 to 30 characters after trim');
  return v;
}

function dateString(value, field) {
  if (!isStr(value) || !DATE_RE.test(value)) fail(`${field} must be YYYY-MM-DD`);
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) fail(`${field} is not a valid date`);
  return value;
}

// BR-32 형식 (BR-36 캘린더도 같다)
export function today(value) {
  return dateString(value, 'today');
}

// BR-21, BR-41, BR-42. 제목 trim. isCompleted·status 등 다른 필드는 무시한다 (BR-24, BR-26)
export function todoBody(body) {
  const b = body ?? {};
  const title = isStr(b.title) ? b.title.trim() : '';
  if (title.length < 1 || title.length > 100) fail('title must be 1 to 100 characters after trim');
  let description = null;
  if (b.description !== undefined && b.description !== null) {
    if (!isStr(b.description) || b.description.length > 1000) fail('description must be 1000 characters or less');
    description = b.description;
  }
  const startDate = dateString(b.startDate, 'startDate');
  const endDate = dateString(b.endDate, 'endDate');
  return { title, description, startDate, endDate };
}

// BR-22. 문자열 비교로 충분하다 (YYYY-MM-DD)
export function dateRange({ startDate, endDate }) {
  if (startDate > endDate) throw new AppError('INVALID_DATE_RANGE', 'startDate must be on or before endDate');
}

// PRD 6.3: 양의 정수 형식이 아니면 DB 조회 없이 NOT_FOUND (BR-02, BR-16)
export function id(value) {
  const s = typeof value === 'number' ? String(value) : value;
  if (!isStr(s) || !ID_RE.test(s)) throw new AppError('NOT_FOUND', 'resource not found');
  return Number(s);
}

// BR-12: 없음·null → null(기본 카테고리). 있으면 id 형식
export function optionalCategoryId(value) {
  if (value === undefined || value === null) return null;
  return id(value);
}

// D-10
export function isCompleted(value) {
  if (typeof value !== 'boolean') fail('isCompleted must be boolean');
  return value;
}

// BR-31, BR-32 상태 필터 값
export function statusFilter(value) {
  if (value === undefined) return undefined;
  if (!Object.values(STATUS).includes(value)) fail(`status must be one of ${Object.values(STATUS).join(', ')}`);
  return value;
}

// AD-C4: from/to는 둘 다 있거나 둘 다 없음
export function dateRangeQuery({ from, to }) {
  if (from === undefined && to === undefined) return null;
  if (from === undefined || to === undefined) fail('from and to must be given together');
  return { from: dateString(from, 'from'), to: dateString(to, 'to') };
}

// CP-04 상태 표기. 글자(전체·축약)와 CSS 수식어 (스타일 가이드 3.6, 6장)
import type { TodoStatus } from '../types/todo';

const LABEL: Record<TodoStatus, { full: string; short: string; mod: string }> = {
  NOT_STARTED: { full: '시작 전', short: '전', mod: 'not-started' },
  IN_PROGRESS: { full: '진행중', short: '진', mod: 'in-progress' },
  COMPLETED: { full: '완료', short: '완', mod: 'completed' },
  OVERDUE: { full: '기한 초과', short: '초', mod: 'overdue' },
};

export const statusLabel = (status: TodoStatus) => LABEL[status].full;
export const statusShort = (status: TodoStatus) => LABEL[status].short;
export const statusModifier = (status: TodoStatus) => LABEL[status].mod;

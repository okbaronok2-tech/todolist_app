// 서버 message는 영어 디버그용. 화면은 코드별 한국어 (10-guide 6장). 모르는 코드는 message 그대로.
import type { ErrorCode } from '../types/api';

const TEXT: Record<ErrorCode, string> = {
  UNAUTHORIZED: '로그인이 필요합니다.',
  INVALID_CREDENTIALS: '이메일 또는 비밀번호가 올바르지 않습니다.',
  NOT_FOUND: '요청한 항목을 찾을 수 없습니다.',
  VALIDATION_ERROR: '입력값이 올바르지 않습니다.',
  INVALID_DATE_RANGE: '시작일은 종료일보다 늦을 수 없습니다.',
  DUPLICATE_EMAIL: '이미 가입된 이메일입니다.',
  DUPLICATE_CATEGORY_NAME: '같은 이름의 카테고리가 이미 있습니다.',
  CATEGORY_LIMIT_EXCEEDED: '카테고리는 최대 20개까지 만들 수 있습니다.',
  DEFAULT_CATEGORY_PROTECTED: '기본 카테고리는 변경하거나 삭제할 수 없습니다.',
  INTERNAL_ERROR: '서버 오류가 발생했습니다. 잠시 후 다시 시도하세요.',
};

export function errorText(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err && typeof (err as { code: unknown }).code === 'string') {
    const { code, message } = err as { code: string; message?: string };
    const text = TEXT[code as ErrorCode];
    if (!text) return code; // 계약 밖 코드: 서버 디버그 문구는 화면에 내지 않는다
    // VALIDATION_ERROR는 어느 필드·제약인지 서버 message에만 있으므로 덧붙인다 (CP-02)
    return code === 'VALIDATION_ERROR' && message ? `${text} (${message})` : text;
  }
  return '요청에 실패했습니다. 네트워크를 확인하세요.';
}

// VALIDATION_ERROR 서버 message로 필드 판별 (PRD 4.2 "판별 가능하면 해당 입력란 아래")
export function fieldOf(message: string): 'title' | 'description' | 'date' | 'email' | 'password' | 'name' | null {
  const m = message.toLowerCase();
  if (m.startsWith('title')) return 'title';
  if (m.startsWith('description')) return 'description';
  if (m.includes('date')) return 'date';
  if (m.startsWith('email')) return 'email';
  if (m.includes('password')) return 'password';
  if (m.includes('name')) return 'name';
  return null;
}

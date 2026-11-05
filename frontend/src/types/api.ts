// BR-51 오류 코드 9개 + 서버 5xx (PRD 6.3, 10-guide 6장)
export const ERROR_CODES = [
  'UNAUTHORIZED',
  'INVALID_CREDENTIALS',
  'NOT_FOUND',
  'VALIDATION_ERROR',
  'INVALID_DATE_RANGE',
  'DUPLICATE_EMAIL',
  'DUPLICATE_CATEGORY_NAME',
  'CATEGORY_LIMIT_EXCEEDED',
  'DEFAULT_CATEGORY_PROTECTED',
  'INTERNAL_ERROR',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export class ApiError extends Error {
  readonly code: ErrorCode;
  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

export interface User {
  id: number;
  name: string;
}

export interface Me extends User {
  email: string;
}

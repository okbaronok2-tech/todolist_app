import { AppError } from '../errors/app-error.js';
import { HTTP } from '../errors/codes.js';

export function notFound(req, res, next) {
  next(new AppError('NOT_FOUND', `${req.method} ${req.path} not found`));
}

// AppError → status·{ code, message }. 그 외 → 500. 1줄 JSON 로그, 5xx만 stack (원칙 6.3)
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let error = err;
  // body-parser 4xx(잘못된 JSON, 100kb 초과, 미지원 charset)는 모두 입력 오류 (BR-51)
  if (!(err instanceof AppError) && typeof err?.status === 'number' && err.status < HTTP.INTERNAL_ERROR) {
    error = new AppError('VALIDATION_ERROR', 'invalid request body');
  }
  const isApp = error instanceof AppError;
  const status = isApp ? error.status : HTTP.INTERNAL_ERROR;
  const code = isApp ? error.code : 'INTERNAL_ERROR';
  const message = isApp ? error.message : 'internal server error';
  const log = { ts: new Date().toISOString(), method: req.method, path: req.originalUrl, status, code, message };
  if (req.userId) log.userId = req.userId; // 11-security S-05
  if (status >= HTTP.INTERNAL_ERROR) log.stack = err.stack;
  console.log(JSON.stringify(log));
  res.status(status).json({ code, message });
}

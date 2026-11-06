import jwt from 'jsonwebtoken';
import { AppError } from '../errors/app-error.js';

import { ACCESS_TTL_SEC, REFRESH_TTL_SEC } from '../services/auth-service.js';

// NFR-06 두 쿠키 옵션. 설정은 이 파일 한 곳 (원칙 6.2)
// 운영은 SPA와 API가 다른 site(예: *.vercel.app 두 도메인)라 SameSite=None + Secure가 아니면 브라우저가 쿠키를 보내지 않는다.
// CSRF는 CORS 허용 목록(CORS_ORIGIN) + JSON 본문(프리플라이트)으로 막는다 (11-security). 개발(http)은 Lax
const prod = () => process.env.NODE_ENV === 'production';
const base = () => ({ httpOnly: true, sameSite: prod() ? 'none' : 'lax', secure: prod() });
const accessOpts = () => ({ ...base(), path: '/' });
const refreshOpts = () => ({ ...base(), path: '/api/auth' });

export function signAccessToken(userId) {
  return jwt.sign({}, process.env.JWT_SECRET, { algorithm: 'HS384', subject: String(userId), expiresIn: ACCESS_TTL_SEC });
}

export function setAuthCookies(res, userId, refreshToken) {
  res.cookie('token', signAccessToken(userId), { ...accessOpts(), maxAge: ACCESS_TTL_SEC * 1000 });
  res.cookie('refresh_token', refreshToken, { ...refreshOpts(), maxAge: REFRESH_TTL_SEC * 1000 });
}

export function clearAuthCookies(res) {
  res.cookie('token', '', { ...accessOpts(), maxAge: 0 });
  res.cookie('refresh_token', '', { ...refreshOpts(), maxAge: 0 });
}

// BR-01, BR-53: 액세스 토큰만 검증, HS384 고정. refresh_token 쿠키는 보지 않는다
export function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) throw new AppError('UNAUTHORIZED', 'authentication required');
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS384'] });
  } catch {
    throw new AppError('UNAUTHORIZED', 'authentication required');
  }
  req.userId = Number(payload.sub);
  next();
}

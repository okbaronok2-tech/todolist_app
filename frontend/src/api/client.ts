// fetch 래퍼 (T-F01, AD-16). credentials 포함, {code,message} → ApiError,
// UNAUTHORIZED → refresh 1회(동시 요청은 Promise 1개 공유) → 재시도 → 실패 시 세션 만료 핸들러
import { ApiError, type ErrorCode } from '../types/api';

const API = import.meta.env.VITE_API_URL as string;

let onSessionExpired: () => void = () => {};

// App이 등록한다: 스토어 reset + queryClient.clear + /login 이동
export function setSessionExpiredHandler(fn: () => void) {
  onSessionExpired = fn;
}

// 'ok' 재발급 성공, 'expired' 401(리프레시 만료·폐기), 'error' 그 외(일시 장애는 만료로 보지 않는다)
type RefreshResult = 'ok' | 'expired' | 'error';
let refreshing: Promise<RefreshResult> | null = null;

function refreshOnce(): Promise<RefreshResult> {
  refreshing ??= fetch(`${API}/api/auth/refresh`, { method: 'POST', credentials: 'include' })
    .then((r): RefreshResult => (r.ok ? 'ok' : r.status === 401 ? 'expired' : 'error'))
    .catch((): RefreshResult => 'error')
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

const codeOf = async (res: Response) => ((await res.clone().json().catch(() => ({}))) as { code?: string }).code;

async function parse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (res.ok) return body as T;
  const b = (body ?? {}) as { code?: string; message?: string };
  throw new ApiError((b.code ?? 'INTERNAL_ERROR') as ErrorCode, b.message ?? `HTTP ${res.status}`);
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
}

function send(path: string, { method = 'GET', body }: RequestOptions): Promise<Response> {
  return fetch(API + path, {
    method,
    credentials: 'include',
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const res = await send(path, options);
  if (res.status !== 401 || path.startsWith('/api/auth/')) return parse<T>(res);
  if ((await codeOf(res)) !== 'UNAUTHORIZED') return parse<T>(res);
  const refreshed = await refreshOnce();
  if (refreshed === 'error') return parse<T>(res); // 일시 장애: 만료 처리 없이 원 오류
  if (refreshed === 'ok') {
    const retry = await send(path, options);
    // 재시도도 UNAUTHORIZED일 때만 만료. INVALID_CREDENTIALS 등은 그대로 화면에 (PRD 4.2)
    if (retry.status !== 401 || (await codeOf(retry)) !== 'UNAUTHORIZED') return parse<T>(retry);
  }
  onSessionExpired();
  return parse<T>(res);
}

export const qs = (params: Record<string, string | number | null | undefined>) => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== null && v !== undefined && v !== '') q.set(k, String(v));
  const s = q.toString();
  return s ? `?${s}` : '';
};

// T-F01 완료 조건: refresh 1회 공유, /api/auth/* 제외, INVALID_CREDENTIALS는 throw, 최종 실패 시 핸들러
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { request, setSessionExpiredHandler } from './client';
import { ApiError } from '../types/api';

type Handler = (url: string, init: RequestInit) => Response;
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
let calls: { url: string; method: string }[];

function mockFetch(handler: Handler) {
  calls = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => {
    calls.push({ url, method: init.method ?? 'GET' });
    return handler(url, init);
  }));
}
const count = (path: string) => calls.filter((c) => c.url.endsWith(path)).length;

beforeEach(() => setSessionExpiredHandler(() => {}));
afterEach(() => vi.unstubAllGlobals());

describe('request', () => {
  it('성공 응답을 JSON으로, 204는 undefined', async () => {
    mockFetch((url) => (url.endsWith('/x') ? json(200, { a: 1 }) : new Response(null, { status: 204 })));
    expect(await request('/api/x')).toEqual({ a: 1 });
    expect(await request('/api/y', { method: 'DELETE' })).toBeUndefined();
    expect((calls[0] as unknown as { url: string }).url).toBe('http://localhost:3000/api/x');
  });

  it('credentials: include, JSON 본문 헤더', async () => {
    mockFetch(() => json(200, {}));
    await request('/api/z', { method: 'POST', body: { k: 1 } });
    const init = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
    expect(init.credentials).toBe('include');
    expect((init.headers as Record<string, string>)['content-type']).toBe('application/json');
    expect(init.body).toBe('{"k":1}');
  });

  it('UNAUTHORIZED → refresh 1회 → 재시도 성공, 동시 3건도 refresh 1회', async () => {
    let refreshed = false;
    mockFetch((url) => {
      if (url.endsWith('/api/auth/refresh')) { refreshed = true; return json(200, { user: { id: 2, name: 'x' } }); }
      return refreshed ? json(200, { ok: true }) : json(401, { code: 'UNAUTHORIZED', message: 'authentication required' });
    });
    const results = await Promise.all([request('/api/a'), request('/api/b'), request('/api/c')]);
    expect(results).toEqual([{ ok: true }, { ok: true }, { ok: true }]);
    expect(count('/api/auth/refresh')).toBe(1);
    expect(count('/api/a')).toBe(2); // 원 요청 + 재시도 1회
  });

  it('refresh 실패 → 세션 만료 핸들러 호출 + UNAUTHORIZED throw', async () => {
    const expired = vi.fn();
    setSessionExpiredHandler(expired);
    mockFetch((url) => (url.endsWith('/api/auth/refresh') ? json(401, { code: 'UNAUTHORIZED', message: 'please log in again' }) : json(401, { code: 'UNAUTHORIZED', message: 'authentication required' })));
    await expect(request('/api/a')).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(expired).toHaveBeenCalledTimes(1);
    expect(count('/api/auth/refresh')).toBe(1);
  });

  it('재시도 응답도 UNAUTHORIZED면 핸들러 호출, 재시도는 1회만', async () => {
    const expired = vi.fn();
    setSessionExpiredHandler(expired);
    mockFetch((url) => (url.endsWith('/api/auth/refresh') ? json(200, { user: { id: 2, name: 'x' } }) : json(401, { code: 'UNAUTHORIZED', message: 'authentication required' })));
    await expect(request('/api/a')).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(expired).toHaveBeenCalledTimes(1);
    expect(count('/api/a')).toBe(2);
  });

  it('재시도 응답이 INVALID_CREDENTIALS면 만료 처리 없이 그대로 throw (내 정보 비밀번호 변경)', async () => {
    const expired = vi.fn();
    setSessionExpiredHandler(expired);
    let refreshed = false;
    mockFetch((url) => {
      if (url.endsWith('/api/auth/refresh')) { refreshed = true; return json(200, { user: { id: 2, name: 'x' } }); }
      return refreshed ? json(401, { code: 'INVALID_CREDENTIALS', message: 'current password is incorrect' }) : json(401, { code: 'UNAUTHORIZED', message: 'authentication required' });
    });
    await expect(request('/api/users/me', { method: 'PATCH', body: {} })).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    expect(expired).not.toHaveBeenCalled();
  });

  it('refresh가 5xx·네트워크 오류면 만료 처리 없이 원 오류 throw', async () => {
    const expired = vi.fn();
    setSessionExpiredHandler(expired);
    mockFetch((url) => (url.endsWith('/api/auth/refresh') ? new Response('down', { status: 503 }) : json(401, { code: 'UNAUTHORIZED', message: 'authentication required' })));
    await expect(request('/api/a')).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(expired).not.toHaveBeenCalled();
    expect(count('/api/a')).toBe(1);
  });

  it('/api/auth/* 의 UNAUTHORIZED에는 refresh 없음', async () => {
    const expired = vi.fn();
    setSessionExpiredHandler(expired);
    mockFetch(() => json(401, { code: 'UNAUTHORIZED', message: 'please log in again' }));
    await expect(request('/api/auth/refresh', { method: 'POST' })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(calls).toHaveLength(1);
    expect(expired).not.toHaveBeenCalled();
  });

  it('INVALID_CREDENTIALS 401은 refresh·이동 없이 ApiError throw', async () => {
    const expired = vi.fn();
    setSessionExpiredHandler(expired);
    mockFetch(() => json(401, { code: 'INVALID_CREDENTIALS', message: 'invalid email or password' }));
    const err = await request('/api/users/me', { method: 'PATCH', body: {} }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe('INVALID_CREDENTIALS');
    expect(calls).toHaveLength(1);
    expect(expired).not.toHaveBeenCalled();
  });

  it('본문 없는 5xx는 INTERNAL_ERROR', async () => {
    mockFetch(() => new Response('oops', { status: 502 }));
    await expect(request('/api/a')).rejects.toMatchObject({ code: 'INTERNAL_ERROR' });
  });
});

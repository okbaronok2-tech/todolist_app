import { request } from './client';
import type { Me, User } from '../types/api';

export const signup = (input: { email: string; password: string; name: string }) =>
  request<{ user: User }>('/api/auth/signup', { method: 'POST', body: input }).then((r) => r.user);

export const login = (input: { email: string; password: string }) =>
  request<{ user: User }>('/api/auth/login', { method: 'POST', body: input }).then((r) => r.user);

export const logout = () => request<void>('/api/auth/logout', { method: 'POST' });

export const refresh = () => request<{ user: User }>('/api/auth/refresh', { method: 'POST' }).then((r) => r.user);

// UC-04 (P1). users/me 조회·수정 (원칙 7.3)
export const me = () => request<Me>('/api/users/me');

export const updateMe = (input: { name?: string; currentPassword?: string; newPassword?: string }) =>
  request<Me>('/api/users/me', { method: 'PATCH', body: input });

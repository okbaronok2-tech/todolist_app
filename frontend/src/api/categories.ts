import { request } from './client';
import type { Category } from '../types/category';

export const list = () => request<Category[]>('/api/categories');
export const create = (name: string) => request<Category>('/api/categories', { method: 'POST', body: { name } });
export const rename = (id: number, name: string) => request<Category>(`/api/categories/${id}`, { method: 'PATCH', body: { name } });
export const remove = (id: number) => request<void>(`/api/categories/${id}`, { method: 'DELETE' });

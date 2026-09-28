// src/lib/auth.ts
import { api } from './api';
import type { User } from '../types';

export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem('lm_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function storeSession(token: string, user: User) {
  localStorage.setItem('lm_token', token);
  localStorage.setItem('lm_user', JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem('lm_token');
  localStorage.removeItem('lm_user');
}

export async function fetchMe(): Promise<User> {
  const res = await api.get<User>('/me');
  return res.data;
}

export type Role = 'EMPLOYEE' | 'MANAGER' | 'HR' | 'ADMIN';

export const ROLE_HIERARCHY: Record<Role, Role[]> = {
  ADMIN:    ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'],
  HR:       ['HR', 'MANAGER', 'EMPLOYEE'],
  MANAGER:  ['MANAGER', 'EMPLOYEE'],
  EMPLOYEE: ['EMPLOYEE'],
};

export function hasRole(user: User | null, role: Role): boolean {
  if (!user) return false;
  return ROLE_HIERARCHY[user.role as Role]?.includes(role) ?? false;
}

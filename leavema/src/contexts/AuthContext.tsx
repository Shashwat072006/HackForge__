// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { storeSession, clearSession, getStoredUser, hasRole } from '../lib/auth';
import type { User } from '../types';
import type { Role } from '../lib/auth';

interface AuthState {
  user: User | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (role: Role) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: getStoredUser(),
    loading: true,
  });

  useEffect(() => {
    const token = localStorage.getItem('lm_token');
    if (!token) {
      setState({ user: null, loading: false });
      return;
    }
    api.get<User>('/me')
      .then((res) => setState({ user: res.data, loading: false }))
      .catch(() => {
        clearSession();
        setState({ user: null, loading: false });
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ token: string; user: User }>('/auth/login', { email, password });
    storeSession(res.data.token, res.data.user);
    setState({ user: res.data.user, loading: false });
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setState({ user: null, loading: false });
  }, []);

  const checkRole = useCallback((role: Role) => hasRole(state.user, role), [state.user]);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, hasRole: checkRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

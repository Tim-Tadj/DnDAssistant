// Phase 5: client-side auth state. The token is persisted to
// localStorage so a refresh keeps the user signed in.

import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiBase } from '../api/api-client';

export type AuthUser = {
  id: string;
  username: string;
  email?: string;
  display_name?: string;
};

export type AuthState = {
  user: AuthUser | null;
  token: string | null;
  login: (username: string, password: string) => Promise<AuthUser>;
  signup: (username: string, password: string, email?: string, displayName?: string) => Promise<AuthUser>;
  logout: () => void;
};

const TOKEN_KEY = 'dndassistant.jwt';
const USER_KEY = 'dndassistant.user';

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  });

  useEffect(() => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }, [token]);

  useEffect(() => {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  }, [user]);

  const login = useCallback(async (username: string, password: string) => {
    const res = await fetch(`${apiBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || res.statusText);
    }
    const data = await res.json();
    setToken(data.token);
    const u: AuthUser = {
      id: data.user.id,
      username: data.user.username,
      email: data.user.email,
      display_name: data.user.display_name,
    };
    setUser(u);
    return u;
  }, []);

  const signup = useCallback(
    async (username: string, password: string, email?: string, displayName?: string) => {
      const res = await fetch(`${apiBase}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          email,
          display_name: displayName ?? username,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }
      const data = await res.json();
      setToken(data.token);
      const u: AuthUser = {
        id: data.user.id,
        username: data.user.username,
        email: data.user.email,
        display_name: data.user.display_name,
      };
      setUser(u);
      return u;
    },
    []
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user, token, login, signup, logout }),
    [user, token, login, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

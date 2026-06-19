// Phase 5: client-side auth state. The token is persisted to
// localStorage so a refresh keeps the user signed in.
//
// Talks to the backend via the shared api client (`api.post`) — the
// client handles JSON encoding, the Authorization header (read from
// localStorage), and {error:{code,message}} mapping. We just unwrap
// the {token, user} response and lift it into state.

import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../api/api-client';

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

type AuthResponse = { token: string; user: AuthUser };

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
    const data = await api.post<AuthResponse>('/auth/login', { username, password });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const signup = useCallback(
    async (username: string, password: string, email?: string, displayName?: string) => {
      const data = await api.post<AuthResponse>('/auth/signup', {
        username,
        password,
        email,
        display_name: displayName ?? username,
      });
      setToken(data.token);
      setUser(data.user);
      return data.user;
    },
    [],
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

// Re-export so any caller that catches the auth error gets the typed
// ApiError (status / code / message) without an extra import.
export { ApiError };

// Phase 5: client-side auth state. The token is persisted to
// localStorage so a refresh keeps the user signed in.
//
// Talks to the backend via the shared api client (`api.post`) — the
// client handles JSON encoding, the Authorization header (read from
// localStorage), and {error:{code,message}} mapping. We just unwrap
// the {token, user} response and lift it into state.
//
// Auth lifecycle:
//   - On mount, decode the stored JWT and check `exp`. If expired,
//     wipe localStorage so the UI doesn't claim we're logged in when
//     the server will reject every call.
//   - Listen for the `auth:unauthorized` window event (dispatched by
//     api-client.ts on any 401 from a non-auth endpoint). That clears
//     state too, so an expired-mid-session token gets caught even
//     without a refresh.

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

/**
 * Decode a JWT payload WITHOUT verifying the signature. The server is
 * the source of truth for validity; this only reads the `exp` claim so
 * the SPA can decide whether to bother trying.
 */
function jwtExpiry(token: string): number | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = parts[1];
    // base64url -> base64
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const json = atob(padded);
    const claims = JSON.parse(json) as { exp?: number };
    return typeof claims.exp === 'number' ? claims.exp : null;
  } catch {
    return null;
  }
}

function isTokenLive(token: string | null): boolean {
  if (!token) return false;
  const exp = jwtExpiry(token);
  if (exp == null) return false;
  // Treat tokens within 30s of expiry as already dead — clock skew
  // between client and worker would otherwise produce a flicker.
  return exp * 1000 > Date.now() + 30_000;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Bootstrap from localStorage, but only keep the token if it's
  // actually still valid — otherwise drop both user and token so the
  // UI starts in a clean "logged out" state.
  const [token, setToken] = useState<string | null>(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    return isTokenLive(stored) ? stored : null;
  });
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (!isTokenLive(localStorage.getItem(TOKEN_KEY))) return null;
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  });

  // Keep localStorage in sync. We do this via useEffect AND synchronously
  // inside login/signup/logout — the useEffect alone is not enough because
  // React fires effects bottom-up (children before parents), so a child
  // like CampaignProvider can fire its own effect (which calls /campaigns
  // and reads localStorage) before AuthProvider's [token] effect has had a
  // chance to run. That triggers a 401 → auth:unauthorized → AuthContext
  // clears state → AppLayout reopens the login dialog. Writing directly
  // in the mutators avoids the race entirely.
  useEffect(() => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }, [token]);

  useEffect(() => {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  }, [user]);

  // React to 401s from any non-auth endpoint. The api-client fires
  // this event so we don't have to import AuthContext from inside
  // the client (which would create a circular dep).
  useEffect(() => {
    const onUnauth = () => {
      setToken(null);
      setUser(null);
    };
    window.addEventListener('auth:unauthorized', onUnauth);
    return () => window.removeEventListener('auth:unauthorized', onUnauth);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const data = await api.post<AuthResponse>('/auth/login', { username, password });
    // Write to localStorage synchronously, BEFORE setToken, so any effect
    // that fires as a result of the state change (e.g. CampaignProvider
    // reloading /campaigns) finds the new token already there.
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
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
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      return data.user;
    },
    [],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
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

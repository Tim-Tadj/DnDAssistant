// Centralised API client config + tiny fetch wrapper.
// All API calls go through here so the base URL + auth header +
// error parsing are defined in exactly one place.

const API_BASE: string = (
  (process.env.REACT_APP_API_BASE as string | undefined) ??
  'http://127.0.0.1:8787/api/v1'
).trim();

export type ApiErrorBody = { error: { code: string; message: string } };

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function authToken(): string | null {
  try {
    return localStorage.getItem('dndassistant.jwt');
  } catch {
    return null;
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };
  const token = authToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    let code = 'HTTP_' + res.status;
    let message = res.statusText;
    try {
      const body = (await res.json()) as ApiErrorBody;
      if (body?.error) {
        code = body.error.code ?? code;
        message = body.error.message ?? message;
      }
    } catch {
      // body wasn't JSON; keep the status text
    }
    // 401 from anywhere except the auth endpoints themselves means the
    // stored JWT is no longer valid (expired, revoked, or tampered).
    // Tell AuthContext to clear its state so the UI stops pretending
    // we're logged in.
    if (res.status === 401 && !path.startsWith('/auth/')) {
      try {
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      } catch {
        // SSR or non-browser env — nothing to do.
      }
    }
    throw new ApiError(res.status, code, message);
  }
  if (res.status === 204) {
    return undefined as unknown as T;
  }
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export const apiBase = API_BASE;

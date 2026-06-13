// Centralised API client config + tiny fetch wrapper.
// Phase 1: only spells use the API; monsters/gear still read bundled JSON.

const API_BASE: string =
  (process.env.REACT_APP_API_BASE as string | undefined) ??
  'http://localhost:8081/api/v1';

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

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    ...init,
  });
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

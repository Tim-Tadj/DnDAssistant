// Typed HTTP errors. Thrown from routes, mapped to the
// `{error:{code,message}}` JSON shape by the global onError handler
// (matches what src/ts/api/api-client.ts reads).

import type { ContentfulStatusCode } from 'hono/utils/http-status';

export class HttpError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const badRequest = (m: string) => new HttpError(400, 'BAD_REQUEST', m);
export const unauthorized = (m = 'Authentication required') =>
  new HttpError(401, 'UNAUTHORIZED', m);
export const forbidden = (m: string) => new HttpError(403, 'FORBIDDEN', m);
export const notFound = (m: string) => new HttpError(404, 'NOT_FOUND', m);
export const conflict = (m: string) => new HttpError(409, 'CONFLICT', m);

/** Maps a raw D1/SQLite constraint error to a friendly HttpError where we can. */
export function mapDbError(
  e: unknown,
  handlers: { unique?: () => HttpError; foreignKey?: () => HttpError },
): never {
  const msg = e instanceof Error ? e.message : String(e);
  if (handlers.unique && msg.includes('UNIQUE constraint failed')) throw handlers.unique();
  if (handlers.foreignKey && msg.includes('FOREIGN KEY constraint failed')) {
    throw handlers.foreignKey();
  }
  throw e;
}

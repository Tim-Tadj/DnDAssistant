// Auth middleware, mirroring JwtAuthFilter + SecurityConfig:
//   - attachUser: reads `Authorization: Bearer <jwt>`, sets userId/username on
//     the context (or null). Never rejects — public reads stay open.
//   - requireAuth: rejects with 401 if no authenticated user. Apply per-route
//     on writes / owner-scoped endpoints.

import type { MiddlewareHandler } from 'hono';
import type { AppBindings } from '../types';
import { parseToken } from '../auth/jwt';
import { unauthorized } from '../lib/errors';

export const attachUser: MiddlewareHandler<AppBindings> = async (c, next) => {
  c.set('userId', null);
  c.set('username', null);
  const header = c.req.header('Authorization');
  if (header?.startsWith('Bearer ')) {
    const token = header.slice('Bearer '.length).trim();
    const claims = await parseToken(c.env.JWT_SECRET, token);
    if (claims) {
      c.set('userId', claims.sub);
      c.set('username', claims.username);
    }
  }
  await next();
};

export const requireAuth: MiddlewareHandler<AppBindings> = async (c, next) => {
  if (!c.get('userId')) throw unauthorized();
  await next();
};

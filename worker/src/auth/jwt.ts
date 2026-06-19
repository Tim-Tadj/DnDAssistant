// HS256 JWT issue/verify, mirroring the Java JwtService:
//   claims: sub = userId, username, iat, exp, jti ; 24h TTL.
// Uses hono/jwt (WebCrypto under the hood) — no node deps.

import { sign, verify } from 'hono/jwt';

const TTL_SECONDS = 24 * 60 * 60;

export async function issueToken(
  secret: string,
  userId: string,
  username: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return sign(
    {
      sub: userId,
      username,
      iat: now,
      exp: now + TTL_SECONDS,
      jti: crypto.randomUUID(),
    },
    secret,
    'HS256',
  );
}

export type Claims = { sub: string; username: string };

export async function parseToken(
  secret: string,
  token: string,
): Promise<Claims | null> {
  try {
    const payload = await verify(token, secret, 'HS256');
    if (!payload.sub) return null;
    return { sub: String(payload.sub), username: String(payload.username ?? '') };
  } catch {
    // Bad / expired token → treat as anonymous (matches JwtAuthFilter).
    return null;
  }
}

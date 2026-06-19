// Ports AuthController: signup / login / me.
//   POST /api/v1/auth/signup  {username, email?, password, display_name?}
//   POST /api/v1/auth/login   {username, password}
//   GET  /api/v1/auth/me      (Bearer required)
// Success returns {token, user:{id, username, email, display_name}}.

import { Hono } from 'hono';
import type { AppBindings } from '../types';
import { first, run } from '../db';
import { hashPassword, verifyPassword } from '../auth/password';
import { issueToken } from '../auth/jwt';
import { badRequest, conflict, notFound, unauthorized } from '../lib/errors';

type UserRow = {
  id: string;
  username: string;
  email: string | null;
  display_name: string | null;
  password_hash?: string;
};

const auth = new Hono<AppBindings>();

function tokenResponse(token: string, u: Omit<UserRow, 'password_hash'>) {
  return {
    token,
    user: {
      id: u.id,
      username: u.username,
      email: u.email ?? '',
      display_name: u.display_name ?? u.username,
    },
  };
}

auth.post('/signup', async (c) => {
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  const username = typeof body?.username === 'string' ? body.username.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!username) throw badRequest('username is required');
  if (password.length < 8) throw badRequest('password must be at least 8 characters');

  const existing = await first<{ id: string }>(
    c.env.DB,
    'SELECT id FROM users WHERE lower(username) = lower(?)',
    username,
  );
  if (existing) throw conflict(`Username '${username}' is already taken`);

  const id = crypto.randomUUID();
  const email = typeof body?.email === 'string' ? body.email : null;
  const displayName =
    typeof body?.display_name === 'string' && body.display_name ? body.display_name : username;
  const hash = await hashPassword(password);

  await run(
    c.env.DB,
    'INSERT INTO users (id, username, email, password_hash, display_name) VALUES (?, ?, ?, ?, ?)',
    id,
    username,
    email,
    hash,
    displayName,
  );

  const token = await issueToken(c.env.JWT_SECRET, id, username);
  return c.json(tokenResponse(token, { id, username, email, display_name: displayName }), 201);
});

auth.post('/login', async (c) => {
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  const username = typeof body?.username === 'string' ? body.username : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!username || !password) throw badRequest('username and password are required');

  const row = await first<UserRow>(
    c.env.DB,
    'SELECT id, username, email, display_name, password_hash FROM users WHERE lower(username) = lower(?)',
    username,
  );
  if (!row?.password_hash || !(await verifyPassword(password, row.password_hash))) {
    throw badRequest('Invalid username or password');
  }
  const token = await issueToken(c.env.JWT_SECRET, row.id, row.username);
  return c.json(tokenResponse(token, row));
});

auth.get('/me', async (c) => {
  const userId = c.get('userId');
  if (!userId) throw unauthorized('Not authenticated');
  const row = await first<UserRow>(
    c.env.DB,
    'SELECT id, username, email, display_name FROM users WHERE id = ?',
    userId,
  );
  if (!row) throw notFound('User not found');
  return c.json({
    id: row.id,
    username: row.username,
    email: row.email,
    display_name: row.display_name,
  });
});

export default auth;

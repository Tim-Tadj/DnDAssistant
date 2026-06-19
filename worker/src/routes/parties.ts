// Ports PartyController + PartyRepository. Owned by the calling user; all
// routes require auth. `member_ids` is a position-ordered list backed by the
// party_members join table; writes replace the whole set. Each member must be
// a character owned by the caller (404 if missing, 400 if not owned).

import { Hono } from 'hono';
import type { Context } from 'hono';
import type { AppBindings } from '../types';
import { all, first, run } from '../db';
import { badRequest, forbidden, notFound } from '../lib/errors';
import { requireAuth } from '../middleware/auth';

const parties = new Hono<AppBindings>();
parties.use('*', requireAuth);

type PartyRow = {
  id: string;
  name: string;
  description: string;
  owner_user_id: string;
  created_at: string;
  updated_at: string;
};

async function memberIds(db: D1Database, partyId: string): Promise<string[]> {
  const rows = await all<{ character_id: string }>(
    db,
    'SELECT character_id FROM party_members WHERE party_id = ? ORDER BY position',
    partyId,
  );
  return rows.map((r) => r.character_id);
}

async function toJson(db: D1Database, row: PartyRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    member_ids: await memberIds(db, row.id),
    owner_user_id: row.owner_user_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function requireOwned(c: Context<AppBindings>, id: string): Promise<PartyRow> {
  const row = await first<PartyRow>(c.env.DB, 'SELECT * FROM parties WHERE id = ?', id);
  if (!row) throw notFound(`Party ${id} not found`);
  if (row.owner_user_id !== c.get('userId')) {
    throw forbidden('Only the owner can modify this party');
  }
  return row;
}

/** Resolve member_ids from the body (absent -> []) and validate ownership. */
async function resolveMembers(c: Context<AppBindings>, body: Record<string, unknown> | null): Promise<string[]> {
  const raw = Array.isArray(body?.member_ids) ? (body!.member_ids as unknown[]) : [];
  const ids = raw.map(String).filter((s) => s.trim() !== '');
  for (const mid of ids) {
    const ch = await first<{ owner_user_id: string }>(
      c.env.DB,
      'SELECT owner_user_id FROM characters WHERE id = ?',
      mid,
    );
    if (!ch) throw notFound(`Character ${mid} not found`);
    if (ch.owner_user_id !== c.get('userId')) {
      throw badRequest(`Character ${mid} is not owned by the current user`);
    }
  }
  return ids;
}

async function replaceMembers(db: D1Database, partyId: string, ids: string[]) {
  await run(db, 'DELETE FROM party_members WHERE party_id = ?', partyId);
  for (let pos = 0; pos < ids.length; pos++) {
    await run(
      db,
      'INSERT INTO party_members (party_id, character_id, position) VALUES (?,?,?)',
      partyId,
      ids[pos],
      pos,
    );
  }
}

parties.get('/', async (c) => {
  const rows = await all<PartyRow>(
    c.env.DB,
    'SELECT * FROM parties WHERE owner_user_id = ? ORDER BY updated_at DESC',
    c.get('userId'),
  );
  return c.json(await Promise.all(rows.map((r) => toJson(c.env.DB, r))));
});

parties.get('/:id', async (c) => {
  const row = await requireOwned(c, c.req.param('id'));
  return c.json(await toJson(c.env.DB, row));
});

parties.post('/', async (c) => {
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!name) throw badRequest('name is required');
  const members = await resolveMembers(c, body);
  const id = crypto.randomUUID();
  await run(
    c.env.DB,
    'INSERT INTO parties (id, name, description, owner_user_id) VALUES (?,?,?,?)',
    id,
    name,
    String(body?.description ?? ''),
    c.get('userId'),
  );
  await replaceMembers(c.env.DB, id, members);
  const row = await first<PartyRow>(c.env.DB, 'SELECT * FROM parties WHERE id = ?', id);
  return c.json(await toJson(c.env.DB, row!), 201);
});

parties.put('/:id', async (c) => {
  const id = c.req.param('id');
  await requireOwned(c, id);
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!name) throw badRequest('name is required');
  const members = await resolveMembers(c, body);
  await run(
    c.env.DB,
    'UPDATE parties SET name=?, description=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
    name,
    String(body?.description ?? ''),
    id,
  );
  await replaceMembers(c.env.DB, id, members);
  const row = await first<PartyRow>(c.env.DB, 'SELECT * FROM parties WHERE id = ?', id);
  return c.json(await toJson(c.env.DB, row!));
});

parties.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await requireOwned(c, id);
  // campaign_parties + party_members FK ON DELETE CASCADE clean themselves up.
  await run(c.env.DB, 'DELETE FROM parties WHERE id = ?', id);
  return c.body(null, 204);
});

export default parties;

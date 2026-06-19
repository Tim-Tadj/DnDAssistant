// Ports CampaignController + CampaignRepository. Owned by the calling user;
// all routes require auth. Field names match columns; `archived` is int<->bool
// and the two date fields are nullable (omitted when null per NON_NULL).

import { Hono } from 'hono';
import type { Context } from 'hono';
import type { AppBindings } from '../types';
import { all, first, run } from '../db';
import { badRequest, forbidden, notFound } from '../lib/errors';
import { requireAuth } from '../middleware/auth';

const campaigns = new Hono<AppBindings>();
campaigns.use('*', requireAuth);

type CampaignRow = {
  id: string;
  name: string;
  description: string;
  setting: string;
  status: string;
  notes: string;
  next_session_on: string | null;
  cadence: string;
  started_on: string | null;
  archived: number;
  owner_user_id: string;
  created_at: string;
  updated_at: string;
};

function toJson(row: CampaignRow) {
  const out: Record<string, unknown> = {
    id: row.id,
    name: row.name,
    description: row.description,
    setting: row.setting,
    status: row.status,
    notes: row.notes,
    next_session_on: row.next_session_on,
    cadence: row.cadence,
    started_on: row.started_on,
    archived: !!row.archived,
    owner_user_id: row.owner_user_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
  for (const k of ['next_session_on', 'started_on']) if (out[k] == null) delete out[k];
  return out;
}

async function requireOwned(c: Context<AppBindings>, id: string): Promise<CampaignRow> {
  const row = await first<CampaignRow>(c.env.DB, 'SELECT * FROM campaigns WHERE id = ?', id);
  if (!row) throw notFound(`Campaign ${id} not found`);
  if (row.owner_user_id !== c.get('userId')) {
    throw forbidden('Only the owner can modify this campaign');
  }
  return row;
}

const dateOrNull = (v: unknown): string | null => (v == null || v === '' ? null : String(v));

// Writable values shared by insert/update (minus id/owner).
function writeValues(body: Record<string, unknown>, name: string) {
  return [
    name,
    String(body.description ?? ''),
    String(body.setting ?? ''),
    String(body.status ?? 'active'),
    String(body.notes ?? ''),
    dateOrNull(body.next_session_on),
    String(body.cadence ?? ''),
    dateOrNull(body.started_on),
    body.archived ? 1 : 0,
  ];
}

campaigns.get('/', async (c) => {
  const rows = await all<CampaignRow>(
    c.env.DB,
    `SELECT * FROM campaigns WHERE owner_user_id = ?
     ORDER BY archived ASC, (next_session_on IS NULL), next_session_on ASC, name`,
    c.get('userId'),
  );
  return c.json(rows.map(toJson));
});

campaigns.get('/:id', async (c) => {
  const row = await requireOwned(c, c.req.param('id'));
  return c.json(toJson(row));
});

campaigns.post('/', async (c) => {
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!name) throw badRequest('name is required');
  const id = crypto.randomUUID();
  await run(
    c.env.DB,
    `INSERT INTO campaigns
       (id, name, description, setting, status, notes, next_session_on, cadence,
        started_on, archived, owner_user_id)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    id,
    ...writeValues(body!, name),
    c.get('userId'),
  );
  const row = await first<CampaignRow>(c.env.DB, 'SELECT * FROM campaigns WHERE id = ?', id);
  return c.json(toJson(row!), 201);
});

campaigns.put('/:id', async (c) => {
  const id = c.req.param('id');
  await requireOwned(c, id);
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!name) throw badRequest('name is required');
  await run(
    c.env.DB,
    `UPDATE campaigns SET
       name=?, description=?, setting=?, status=?, notes=?, next_session_on=?,
       cadence=?, started_on=?, archived=?, updated_at=CURRENT_TIMESTAMP
     WHERE id=?`,
    ...writeValues(body!, name),
    id,
  );
  const row = await first<CampaignRow>(c.env.DB, 'SELECT * FROM campaigns WHERE id = ?', id);
  return c.json(toJson(row!));
});

campaigns.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await requireOwned(c, id);
  await run(c.env.DB, 'DELETE FROM campaigns WHERE id = ?', id);
  return c.body(null, 204);
});

export default campaigns;

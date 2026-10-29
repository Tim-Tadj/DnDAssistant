// The campaign timeline. Mounted at /api/v1/campaigns/:campaignId/events.
//
//   GET    /         newest first; ?session=<id|none>, ?ref_kind=&ref_id=,
//                    ?tag=, ?limit= (default 500)
//   POST   /         add a jot (or any manual entry); lands on the live
//                    session unless session_id is given
//   PUT    /:id      edit text / tag / dm_only / session_id
//   DELETE /:id
//
// Most rows are written by other routes (see lib/events.ts); this route
// is for reading them and for the DM's own notes.

import { Hono } from 'hono';
import type { Context } from 'hono';
import type { AppBindings } from '../types';
import { all, first, run } from '../db';
import { badRequest, notFound } from '../lib/errors';
import { requireAuth } from '../middleware/auth';
import { ownedCampaign } from '../lib/ownership';
import { logEvent, type EventKind } from '../lib/events';

const events = new Hono<AppBindings>();
events.use('*', requireAuth);

export type EventRow = {
  id: string;
  campaign_id: string;
  session_id: string | null;
  kind: string;
  text: string;
  tag: string;
  dm_only: number;
  ref_kind: string;
  ref_id: string;
  data_json: string;
  created_at: string;
};

const KINDS: EventKind[] = ['jot', 'encounter', 'character', 'npc', 'thread', 'session'];

function parseData(text: string): Record<string, unknown> {
  try {
    const v = JSON.parse(text);
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

export function eventJson(row: EventRow) {
  return {
    id: row.id,
    campaign_id: row.campaign_id,
    session_id: row.session_id,
    kind: row.kind,
    text: row.text,
    tag: row.tag,
    dm_only: !!row.dm_only,
    ref_kind: row.ref_kind,
    ref_id: row.ref_id,
    data: parseData(row.data_json),
    created_at: row.created_at,
  };
}

async function sessionOf(c: Context<AppBindings>, campaignId: string, v: unknown): Promise<string | null | undefined> {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  const s = await first<{ campaign_id: string }>(
    c.env.DB,
    'SELECT campaign_id FROM campaign_sessions WHERE id = ?',
    String(v),
  );
  if (!s || s.campaign_id !== campaignId) throw badRequest('session_id must be a session of this campaign');
  return String(v);
}

async function loadEvent(c: Context<AppBindings>, campaignId: string, id: string) {
  const row = await first<EventRow>(c.env.DB, 'SELECT * FROM campaign_events WHERE id = ?', id);
  if (!row || row.campaign_id !== campaignId) throw notFound(`Event ${id} not found`);
  return row;
}

events.get('/', async (c) => {
  const campaignId = await ownedCampaign(c, c.req.param('campaignId'));
  const where = ['campaign_id = ?'];
  const params: unknown[] = [campaignId];
  const session = c.req.query('session');
  if (session === 'none') where.push('session_id IS NULL');
  else if (session) {
    where.push('session_id = ?');
    params.push(session);
  }
  const refKind = c.req.query('ref_kind');
  const refId = c.req.query('ref_id');
  if (refKind && refId) {
    where.push('ref_kind = ? AND ref_id = ?');
    params.push(refKind, refId);
  }
  const tag = c.req.query('tag');
  if (tag) {
    where.push('tag = ?');
    params.push(tag);
  }
  const limit = Math.min(2000, Math.max(1, Number(c.req.query('limit')) || 500));
  const rows = await all<EventRow>(
    c.env.DB,
    `SELECT * FROM campaign_events WHERE ${where.join(' AND ')}
     ORDER BY created_at DESC, rowid DESC LIMIT ${limit}`,
    ...params,
  );
  return c.json(rows.map(eventJson));
});

events.post('/', async (c) => {
  const campaignId = await ownedCampaign(c, c.req.param('campaignId'));
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  const text = String(body?.text ?? '').trim();
  if (!body || !text) throw badRequest('text is required');
  const kind = String(body.kind ?? 'jot') as EventKind;
  if (!KINDS.includes(kind)) throw badRequest(`kind must be one of ${KINDS.join(', ')}`);
  const id = await logEvent(c.env.DB, campaignId, {
    kind,
    text,
    tag: String(body.tag ?? ''),
    dm_only: !!body.dm_only,
    ref_kind: String(body.ref_kind ?? ''),
    ref_id: String(body.ref_id ?? ''),
    data: body.data && typeof body.data === 'object' ? (body.data as Record<string, unknown>) : {},
    session_id: await sessionOf(c, campaignId, body.session_id),
  });
  const row = await first<EventRow>(c.env.DB, 'SELECT * FROM campaign_events WHERE id = ?', id);
  return c.json(eventJson(row!), 201);
});

events.put('/:id', async (c) => {
  const campaignId = await ownedCampaign(c, c.req.param('campaignId'));
  const existing = await loadEvent(c, campaignId, c.req.param('id'));
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) throw badRequest('body is required');
  const text = body.text === undefined ? existing.text : String(body.text).trim();
  if (!text) throw badRequest('text is required');
  const session = await sessionOf(c, campaignId, body.session_id);
  await run(
    c.env.DB,
    'UPDATE campaign_events SET text = ?, tag = ?, dm_only = ?, session_id = ? WHERE id = ?',
    text,
    body.tag === undefined ? existing.tag : String(body.tag),
    body.dm_only === undefined ? existing.dm_only : body.dm_only ? 1 : 0,
    session === undefined ? existing.session_id : session,
    existing.id,
  );
  const row = await first<EventRow>(c.env.DB, 'SELECT * FROM campaign_events WHERE id = ?', existing.id);
  return c.json(eventJson(row!));
});

events.delete('/:id', async (c) => {
  const campaignId = await ownedCampaign(c, c.req.param('campaignId'));
  const existing = await loadEvent(c, campaignId, c.req.param('id'));
  await run(c.env.DB, 'DELETE FROM campaign_events WHERE id = ?', existing.id);
  return c.body(null, 204);
});

export default events;

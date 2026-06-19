// Ports CampaignSessionController + CampaignSessionRepository.
// Mounted at /api/v1/campaigns/:campaignId/sessions. Owned transitively via
// the campaign. session_number auto-assigns to MAX+1 when absent; attendees is
// a JSON-array text column; played_on is a nullable date.

import { Hono } from 'hono';
import type { Context } from 'hono';
import type { AppBindings } from '../types';
import { all, first, run } from '../db';
import { badRequest, notFound } from '../lib/errors';
import { requireAuth } from '../middleware/auth';
import { ownedCampaign } from '../lib/ownership';

const sessions = new Hono<AppBindings>();
sessions.use('*', requireAuth);

type SessionRow = {
  id: string;
  campaign_id: string;
  session_number: number;
  title: string;
  played_on: string | null;
  summary: string;
  prep_notes: string;
  attendees: string;
  created_at: string;
  updated_at: string;
};

const parseAttendees = (text: string | null): string[] => {
  if (!text) return [];
  try {
    const v = JSON.parse(text);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
};

function toJson(row: SessionRow) {
  const out: Record<string, unknown> = {
    id: row.id,
    campaign_id: row.campaign_id,
    session_number: row.session_number,
    title: row.title,
    played_on: row.played_on,
    summary: row.summary,
    prep_notes: row.prep_notes,
    attendees: parseAttendees(row.attendees),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
  if (out.played_on == null) delete out.played_on;
  return out;
}

const dateOrNull = (v: unknown): string | null => (v == null || v === '' ? null : String(v));
const attendeesJson = (v: unknown): string =>
  JSON.stringify(Array.isArray(v) ? v : []);

async function loadSession(c: Context<AppBindings>, campaignId: string, id: string) {
  const s = await first<SessionRow>(c.env.DB, 'SELECT * FROM campaign_sessions WHERE id = ?', id);
  if (!s) throw notFound(`Session ${id} not found`);
  if (s.campaign_id !== campaignId) {
    throw badRequest(`Session ${id} does not belong to campaign ${campaignId}`);
  }
  return s;
}

sessions.get('/', async (c) => {
  const campaignId = c.req.param('campaignId');
  await ownedCampaign(c, campaignId);
  const rows = await all<SessionRow>(
    c.env.DB,
    `SELECT * FROM campaign_sessions WHERE campaign_id = ?
     ORDER BY session_number DESC, (played_on IS NULL), played_on DESC`,
    campaignId,
  );
  return c.json(rows.map(toJson));
});

sessions.get('/:id', async (c) => {
  const campaignId = await ownedCampaign(c, c.req.param('campaignId'));
  const s = await loadSession(c, campaignId, c.req.param('id'));
  return c.json(toJson(s));
});

sessions.post('/', async (c) => {
  const campaignId = await ownedCampaign(c, c.req.param('campaignId'));
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) throw badRequest('body is required');
  const id = crypto.randomUUID();

  let sessionNumber: number;
  if (body.session_number != null) {
    sessionNumber = Math.trunc(Number(body.session_number)) || 1;
  } else {
    const max = await first<{ n: number }>(
      c.env.DB,
      'SELECT COALESCE(MAX(session_number), 0) + 1 AS n FROM campaign_sessions WHERE campaign_id = ?',
      campaignId,
    );
    sessionNumber = max?.n ?? 1;
  }

  await run(
    c.env.DB,
    `INSERT INTO campaign_sessions
       (id, campaign_id, session_number, title, played_on, summary, prep_notes, attendees)
     VALUES (?,?,?,?,?,?,?,?)`,
    id,
    campaignId,
    sessionNumber,
    String(body.title ?? ''),
    dateOrNull(body.played_on),
    String(body.summary ?? ''),
    String(body.prep_notes ?? ''),
    attendeesJson(body.attendees),
  );
  const row = await first<SessionRow>(c.env.DB, 'SELECT * FROM campaign_sessions WHERE id = ?', id);
  return c.json(toJson(row!), 201);
});

sessions.put('/:id', async (c) => {
  const campaignId = await ownedCampaign(c, c.req.param('campaignId'));
  const id = c.req.param('id');
  await loadSession(c, campaignId, id);
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) throw badRequest('body is required');
  await run(
    c.env.DB,
    `UPDATE campaign_sessions SET
       session_number=?, title=?, played_on=?, summary=?, prep_notes=?, attendees=?,
       updated_at=CURRENT_TIMESTAMP
     WHERE id=?`,
    body.session_number != null ? Math.trunc(Number(body.session_number)) || 1 : 1,
    String(body.title ?? ''),
    dateOrNull(body.played_on),
    String(body.summary ?? ''),
    String(body.prep_notes ?? ''),
    attendeesJson(body.attendees),
    id,
  );
  const row = await first<SessionRow>(c.env.DB, 'SELECT * FROM campaign_sessions WHERE id = ?', id);
  return c.json(toJson(row!));
});

sessions.delete('/:id', async (c) => {
  const campaignId = await ownedCampaign(c, c.req.param('campaignId'));
  const id = c.req.param('id');
  await loadSession(c, campaignId, id);
  await run(c.env.DB, 'DELETE FROM campaign_sessions WHERE id = ?', id);
  return c.body(null, 204);
});

export default sessions;

// Ports CampaignSessionController + CampaignSessionRepository.
// Mounted at /api/v1/campaigns/:campaignId/sessions. Owned transitively via
// the campaign. session_number auto-assigns to MAX+1 when absent; attendees is
// a JSON-array text column; played_on is a nullable date.
//
// Sessions move planned → live → played (migration 0003):
//   POST /             status defaults to played (a session logged after
//                      the fact); `planned` makes the next session's draft,
//                      at most one per campaign
//   POST /:id/start    planned → live; logs "Session N started"
//   POST /:id/end      live → played with the recap; unchecked prep items
//                      roll over to a new planned session, and the
//                      campaign's next date moves if one is given

import { Hono } from 'hono';
import type { Context } from 'hono';
import type { AppBindings } from '../types';
import { all, first, run } from '../db';
import { badRequest, conflict, notFound } from '../lib/errors';
import { requireAuth } from '../middleware/auth';
import { ownedCampaign } from '../lib/ownership';
import { logEvent } from '../lib/events';

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
  status: string;
  prep_json: string;
  strong_start: string;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
};

type PrepItem = { id: string; text: string; done: boolean; ref_kind?: string; ref_id?: string };

const STATUSES = ['planned', 'live', 'played'] as const;

function prepItem(v: unknown): PrepItem | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const text = String(o.text ?? '').trim();
  if (!text) return null;
  const item: PrepItem = { id: String(o.id || crypto.randomUUID()), text, done: !!o.done };
  if (o.ref_kind && o.ref_id) {
    item.ref_kind = String(o.ref_kind);
    item.ref_id = String(o.ref_id);
  }
  return item;
}

const parsePrep = (text: string | null): PrepItem[] => {
  if (!text) return [];
  try {
    const v = JSON.parse(text);
    return Array.isArray(v) ? v.map(prepItem).filter((x): x is PrepItem => !!x) : [];
  } catch {
    return [];
  }
};

const prepJson = (v: unknown): string =>
  JSON.stringify(Array.isArray(v) ? v.map(prepItem).filter(Boolean) : []);

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
    status: row.status,
    prep: parsePrep(row.prep_json),
    strong_start: row.strong_start,
    started_at: row.started_at,
    ended_at: row.ended_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
  for (const k of ['played_on', 'started_at', 'ended_at']) if (out[k] == null) delete out[k];
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
  const status = String(body.status ?? 'played');
  if (status !== 'planned' && status !== 'played') {
    throw badRequest('status must be planned or played (start a session with POST /:id/start)');
  }
  if (status === 'planned') {
    const draft = await first<{ id: string }>(
      c.env.DB,
      `SELECT id FROM campaign_sessions WHERE campaign_id = ? AND status = 'planned'`,
      campaignId,
    );
    if (draft) throw conflict('This campaign already has a planned next session');
  }

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
       (id, campaign_id, session_number, title, played_on, summary, prep_notes, attendees,
        status, prep_json, strong_start)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    id,
    campaignId,
    sessionNumber,
    String(body.title ?? ''),
    status === 'planned' ? null : dateOrNull(body.played_on),
    String(body.summary ?? ''),
    String(body.prep_notes ?? ''),
    attendeesJson(body.attendees),
    status,
    prepJson(body.prep),
    String(body.strong_start ?? ''),
  );
  const row = await first<SessionRow>(c.env.DB, 'SELECT * FROM campaign_sessions WHERE id = ?', id);
  return c.json(toJson(row!), 201);
});

sessions.put('/:id', async (c) => {
  const campaignId = await ownedCampaign(c, c.req.param('campaignId'));
  const id = c.req.param('id');
  const existing = await loadSession(c, campaignId, id);
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) throw badRequest('body is required');
  // Fields left out keep their value. Status only moves planned → played
  // here (a fight recorded "in" the next session); going live and ending
  // go through /start and /end.
  const merged = { ...toJson(existing), ...body } as Record<string, unknown>;
  const status = String(merged.status);
  if (!STATUSES.includes(status as typeof STATUSES[number])) {
    throw badRequest(`status must be one of ${STATUSES.join(', ')}`);
  }
  if (status !== existing.status && !(existing.status === 'planned' && status === 'played')) {
    throw badRequest('Use /start and /end to start or end a session');
  }
  await run(
    c.env.DB,
    `UPDATE campaign_sessions SET
       session_number=?, title=?, played_on=?, summary=?, prep_notes=?, attendees=?,
       status=?, prep_json=?, strong_start=?, updated_at=CURRENT_TIMESTAMP
     WHERE id=?`,
    merged.session_number != null ? Math.trunc(Number(merged.session_number)) || 1 : 1,
    String(merged.title ?? ''),
    dateOrNull(merged.played_on),
    String(merged.summary ?? ''),
    String(merged.prep_notes ?? ''),
    attendeesJson(merged.attendees),
    status,
    prepJson(merged.prep),
    String(merged.strong_start ?? ''),
    id,
  );
  const row = await first<SessionRow>(c.env.DB, 'SELECT * FROM campaign_sessions WHERE id = ?', id);
  return c.json(toJson(row!));
});

sessions.post('/:id/start', async (c) => {
  const campaignId = await ownedCampaign(c, c.req.param('campaignId'));
  const s = await loadSession(c, campaignId, c.req.param('id'));
  if (s.status !== 'planned') throw badRequest(`Session ${s.session_number} has already been played`);
  const live = await first<{ session_number: number }>(
    c.env.DB,
    `SELECT session_number FROM campaign_sessions WHERE campaign_id = ? AND status = 'live'`,
    campaignId,
  );
  if (live) throw conflict(`Session ${live.session_number} is still live; end it first`);
  const body = ((await c.req.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  await run(
    c.env.DB,
    `UPDATE campaign_sessions SET status = 'live', played_on = ?, attendees = ?,
       started_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    dateOrNull(body.played_on) ?? new Date().toISOString().slice(0, 10),
    body.attendees === undefined ? s.attendees : attendeesJson(body.attendees),
    s.id,
  );
  await logEvent(c.env.DB, campaignId, {
    kind: 'session',
    text: `Session ${s.session_number} started`,
    session_id: s.id,
    data: { phase: 'start' },
  });
  const row = await first<SessionRow>(c.env.DB, 'SELECT * FROM campaign_sessions WHERE id = ?', s.id);
  return c.json(toJson(row!));
});

sessions.post('/:id/end', async (c) => {
  const campaignId = await ownedCampaign(c, c.req.param('campaignId'));
  const s = await loadSession(c, campaignId, c.req.param('id'));
  if (s.status !== 'live') throw badRequest(`Session ${s.session_number} isn't live`);
  const body = ((await c.req.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  await logEvent(c.env.DB, campaignId, {
    kind: 'session',
    text: `Session ${s.session_number} ended`,
    session_id: s.id,
    data: { phase: 'end' },
  });
  await run(
    c.env.DB,
    `UPDATE campaign_sessions SET status = 'played', title = ?, summary = ?,
       ended_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    body.title === undefined ? s.title : String(body.title),
    body.summary === undefined ? s.summary : String(body.summary),
    s.id,
  );

  // The next session's draft starts with whatever prep wasn't used.
  const leftover = parsePrep(s.prep_json).filter((p) => !p.done);
  let nextId: string;
  const draft = await first<SessionRow>(
    c.env.DB,
    `SELECT * FROM campaign_sessions WHERE campaign_id = ? AND status = 'planned'`,
    campaignId,
  );
  if (draft) {
    nextId = draft.id;
    if (leftover.length) {
      await run(
        c.env.DB,
        'UPDATE campaign_sessions SET prep_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        JSON.stringify([...parsePrep(draft.prep_json), ...leftover]),
        draft.id,
      );
    }
  } else {
    nextId = crypto.randomUUID();
    const max = await first<{ n: number }>(
      c.env.DB,
      'SELECT COALESCE(MAX(session_number), 0) + 1 AS n FROM campaign_sessions WHERE campaign_id = ?',
      campaignId,
    );
    await run(
      c.env.DB,
      `INSERT INTO campaign_sessions (id, campaign_id, session_number, status, prep_json)
       VALUES (?, ?, ?, 'planned', ?)`,
      nextId,
      campaignId,
      max?.n ?? s.session_number + 1,
      JSON.stringify(leftover),
    );
  }
  if (body.next_session_on !== undefined) {
    await run(
      c.env.DB,
      'UPDATE campaigns SET next_session_on = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      dateOrNull(body.next_session_on),
      campaignId,
    );
  }
  const [ended, upcoming] = await Promise.all([
    first<SessionRow>(c.env.DB, 'SELECT * FROM campaign_sessions WHERE id = ?', s.id),
    first<SessionRow>(c.env.DB, 'SELECT * FROM campaign_sessions WHERE id = ?', nextId),
  ]);
  return c.json({ session: toJson(ended!), next: toJson(upcoming!), rolled_over: leftover.length });
});

sessions.delete('/:id', async (c) => {
  const campaignId = await ownedCampaign(c, c.req.param('campaignId'));
  const id = c.req.param('id');
  await loadSession(c, campaignId, id);
  await run(c.env.DB, 'DELETE FROM campaign_sessions WHERE id = ?', id);
  return c.body(null, 204);
});

export default sessions;

// Quests, rumours and mysteries. Mounted at
// /api/v1/campaigns/:campaignId/threads.
//
//   GET    /          open ones first (rumour, active), then resolved/failed
//   POST   /          logs "New thread" on the timeline while a session is live
//   PUT    /:id       a status change is logged; so is `advance: true`
//                     (the old next step is recorded as done)
//   DELETE /:id

import { Hono } from 'hono';
import type { Context } from 'hono';
import type { AppBindings } from '../types';
import { all, first, run } from '../db';
import { badRequest, notFound } from '../lib/errors';
import { requireAuth } from '../middleware/auth';
import { ownedCampaign } from '../lib/ownership';
import { liveSessionId, tryLogEvent } from '../lib/events';

const threads = new Hono<AppBindings>();
threads.use('*', requireAuth);

type ThreadRow = {
  id: string;
  campaign_id: string;
  title: string;
  status: string;
  next_step: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

const STATUSES = ['rumour', 'active', 'resolved', 'failed'] as const;

const STATUS_TEXT: Record<string, string> = {
  rumour: 'is only a rumour again',
  active: 'is now active',
  resolved: 'resolved',
  failed: 'failed',
};

const toJson = (row: ThreadRow) => ({ ...row });

function status(v: unknown): string {
  const s = String(v ?? 'active');
  if (!STATUSES.includes(s as typeof STATUSES[number])) {
    throw badRequest(`status must be one of ${STATUSES.join(', ')}`);
  }
  return s;
}

async function loadThread(c: Context<AppBindings>, campaignId: string, id: string) {
  const row = await first<ThreadRow>(c.env.DB, 'SELECT * FROM campaign_threads WHERE id = ?', id);
  if (!row || row.campaign_id !== campaignId) throw notFound(`Thread ${id} not found`);
  return row;
}

threads.get('/', async (c) => {
  const campaignId = await ownedCampaign(c, c.req.param('campaignId'));
  const rows = await all<ThreadRow>(
    c.env.DB,
    `SELECT * FROM campaign_threads WHERE campaign_id = ?
     ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'rumour' THEN 1 ELSE 2 END, updated_at DESC`,
    campaignId,
  );
  return c.json(rows.map(toJson));
});

threads.post('/', async (c) => {
  const campaignId = await ownedCampaign(c, c.req.param('campaignId'));
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  const title = String(body?.title ?? '').trim();
  if (!body || !title) throw badRequest('title is required');
  const id = crypto.randomUUID();
  const st = status(body.status);
  await run(
    c.env.DB,
    'INSERT INTO campaign_threads (id, campaign_id, title, status, next_step, notes) VALUES (?,?,?,?,?,?)',
    id,
    campaignId,
    title,
    st,
    String(body.next_step ?? ''),
    String(body.notes ?? ''),
  );
  // Threads written during prep aren't news; ones that turn up at the
  // table are.
  if (await liveSessionId(c.env.DB, campaignId)) {
    await tryLogEvent(c.env.DB, campaignId, {
      kind: 'thread',
      text: st === 'rumour' ? `Heard a rumour: ${title}` : `New thread: ${title}`,
      ref_kind: 'thread',
      ref_id: id,
    });
  }
  const row = await first<ThreadRow>(c.env.DB, 'SELECT * FROM campaign_threads WHERE id = ?', id);
  return c.json(toJson(row!), 201);
});

threads.put('/:id', async (c) => {
  const campaignId = await ownedCampaign(c, c.req.param('campaignId'));
  const existing = await loadThread(c, campaignId, c.req.param('id'));
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) throw badRequest('body is required');
  const title = body.title === undefined ? existing.title : String(body.title).trim();
  if (!title) throw badRequest('title is required');
  const st = body.status === undefined ? existing.status : status(body.status);
  const nextStep = body.next_step === undefined ? existing.next_step : String(body.next_step);
  await run(
    c.env.DB,
    `UPDATE campaign_threads SET title = ?, status = ?, next_step = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    title,
    st,
    nextStep,
    body.notes === undefined ? existing.notes : String(body.notes),
    existing.id,
  );
  if (body.advance && existing.next_step.trim()) {
    await tryLogEvent(c.env.DB, campaignId, {
      kind: 'thread',
      text: `${title}: ${existing.next_step.trim()}`,
      ref_kind: 'thread',
      ref_id: existing.id,
      data: { advanced: true },
    });
  }
  if (st !== existing.status) {
    await tryLogEvent(c.env.DB, campaignId, {
      kind: 'thread',
      text: `${title} ${STATUS_TEXT[st]}`,
      ref_kind: 'thread',
      ref_id: existing.id,
      data: { from: existing.status, to: st },
    });
  }
  const row = await first<ThreadRow>(c.env.DB, 'SELECT * FROM campaign_threads WHERE id = ?', existing.id);
  return c.json(toJson(row!));
});

threads.delete('/:id', async (c) => {
  const campaignId = await ownedCampaign(c, c.req.param('campaignId'));
  const existing = await loadThread(c, campaignId, c.req.param('id'));
  await run(c.env.DB, 'DELETE FROM campaign_threads WHERE id = ?', existing.id);
  return c.body(null, 204);
});

export default threads;

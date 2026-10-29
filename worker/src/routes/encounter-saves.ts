// Ports EncounterSaveController. Snapshot of an encounter — list of
// monster refs (id/name/count/xp_each), a party snapshot (character ids),
// difficulty, total XP, played-on date, and notes.
//
// `status` splits prep from history (migration 0002):
//   - planned: prepared ahead of time, reusable, can be test-run.
//   - played:  the record of a fight: outcome, rounds, combat log,
//              final combatant state, the session it happened in and
//              the planned encounter it was run from (source_id).
//
// Two exports, both require auth and are owner-scoped:
//   - personal  (`encounterSaves`):      /api/v1/encounter-saves
//   - campaign  (`campaignEncounterSaves`): /api/v1/campaigns/:campaignId/encounters
//
// Personal endpoints:
//   GET    /              list the caller's saves (campaign_id may be null)
//   POST   /              create a new save
//   PUT    /:id           update a save (must be owner)
//   DELETE /:id           delete a save (must be owner)
//
// Campaign-scoped endpoint:
//   GET    /              list saves attached to this campaign (must own the campaign)

import { Hono } from 'hono';
import type { Context } from 'hono';
import type { AppBindings } from '../types';
import { all, first, run } from '../db';
import { badRequest, forbidden, notFound } from '../lib/errors';
import { requireAuth } from '../middleware/auth';
import { ownedCampaign } from '../lib/ownership';
import { tryLogEvent } from '../lib/events';

type Row = {
  id: string;
  owner_user_id: string;
  campaign_id: string | null;
  name: string;
  monsters_json: string;
  party_snapshot_json: string;
  difficulty: string;
  total_xp: number;
  played_on: string | null;
  notes: string;
  status: string;
  session_id: string | null;
  source_id: string | null;
  outcome: string;
  rounds: number;
  log_json: string;
  combatants_json: string;
  created_at: string;
  updated_at: string;
};

const STATUSES = ['planned', 'played'] as const;

type Combatant = { name?: string; isPC?: boolean; hp?: number; defeated?: boolean };

// "Bell tower ambush — Victory in 4 rounds", plus which PCs went down.
async function logPlayed(db: D1Database, row: Row) {
  if (row.status !== 'played' || !row.campaign_id) return;
  const rounds = row.rounds ? ` in ${row.rounds} round${row.rounds === 1 ? '' : 's'}` : '';
  const downed = parseJsonArray<Combatant>(row.combatants_json)
    .filter((c) => c.isPC && (c.defeated || (c.hp ?? 1) <= 0))
    .map((c) => String(c.name ?? ''))
    .filter(Boolean);
  await tryLogEvent(db, row.campaign_id, {
    kind: 'encounter',
    text: `${row.name || 'Encounter'}${row.outcome ? ` — ${row.outcome}${rounds}` : rounds}`,
    ref_kind: 'encounter',
    ref_id: row.id,
    session_id: row.session_id ?? undefined,
    data: { outcome: row.outcome, rounds: row.rounds, xp: row.total_xp, downed },
  });
}

function parseJsonArray<T = unknown>(text: string | null): T[] {
  if (!text) return [];
  try {
    const v = JSON.parse(text);
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

function toJson(row: Row) {
  const out: Record<string, unknown> = {
    id: row.id,
    owner_user_id: row.owner_user_id,
    campaign_id: row.campaign_id,
    name: row.name,
    monsters: parseJsonArray(row.monsters_json),
    party_snapshot_ids: parseJsonArray<string>(row.party_snapshot_json),
    difficulty: row.difficulty,
    total_xp: row.total_xp,
    played_on: row.played_on,
    notes: row.notes,
    status: row.status,
    session_id: row.session_id,
    source_id: row.source_id,
    outcome: row.outcome,
    rounds: row.rounds,
    log: parseJsonArray(row.log_json),
    combatants: parseJsonArray(row.combatants_json),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
  for (const k of ['campaign_id', 'played_on', 'session_id', 'source_id']) {
    if (out[k] == null) delete out[k];
  }
  return out;
}

const intOr = (v: unknown, d: number): number => {
  if (v == null || v === '') return d;
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) ? n : d;
};

const dateOrNull = (v: unknown): string | null =>
  v == null || v === '' ? null : String(v);

const jsonArray = (v: unknown): string =>
  JSON.stringify(Array.isArray(v) ? v : []);

const campaignIdOrNull = (v: unknown): string | null =>
  v == null || v === '' ? null : String(v);

async function loadOwned(c: Context<AppBindings>, id: string): Promise<Row> {
  const row = await first<Row>(c.env.DB, 'SELECT * FROM encounter_saves WHERE id = ?', id);
  if (!row) throw notFound(`Encounter save ${id} not found`);
  if (row.owner_user_id !== c.get('userId')) {
    throw forbidden('Only the owner can modify this encounter save');
  }
  return row;
}

// ---- Personal: /api/v1/encounter-saves -----------------------------------

const encounterSaves = new Hono<AppBindings>();
encounterSaves.use('*', requireAuth);

encounterSaves.get('/', async (c) => {
  const rows = await all<Row>(
    c.env.DB,
    `SELECT * FROM encounter_saves
     WHERE owner_user_id = ?
     ORDER BY (played_on IS NULL), played_on DESC, updated_at DESC`,
    c.get('userId'),
  );
  return c.json(rows.map(toJson));
});

// Validates a create/update body against the caller's data and returns
// the column values, in COLUMNS order.
const COLUMNS = [
  'campaign_id', 'name', 'monsters_json', 'party_snapshot_json', 'difficulty',
  'total_xp', 'played_on', 'notes', 'status', 'session_id', 'source_id',
  'outcome', 'rounds', 'log_json', 'combatants_json',
] as const;

async function columnValues(c: Context<AppBindings>, body: Record<string, unknown>) {
  // If a campaign is attached, the caller must own it, and a session
  // must belong to that campaign.
  const campaignId = campaignIdOrNull(body.campaign_id);
  if (campaignId) await ownedCampaign(c, campaignId);
  const sessionId = campaignIdOrNull(body.session_id);
  if (sessionId) {
    const s = await first<{ campaign_id: string }>(
      c.env.DB,
      'SELECT campaign_id FROM campaign_sessions WHERE id = ?',
      sessionId,
    );
    if (!s || s.campaign_id !== campaignId) {
      throw badRequest('session_id must be a session of the same campaign');
    }
  }
  const status = String(body.status ?? 'planned');
  if (!STATUSES.includes(status as typeof STATUSES[number])) {
    throw badRequest(`status must be one of ${STATUSES.join(', ')}`);
  }
  return [
    campaignId,
    String(body.name ?? ''),
    jsonArray(body.monsters),
    jsonArray(body.party_snapshot_ids),
    String(body.difficulty ?? ''),
    intOr(body.total_xp, 0),
    // Only a played encounter has a played-on date.
    status === 'played' ? dateOrNull(body.played_on) : null,
    String(body.notes ?? ''),
    status,
    sessionId,
    campaignIdOrNull(body.source_id),
    String(body.outcome ?? ''),
    Math.max(0, intOr(body.rounds, 0)),
    jsonArray(body.log),
    jsonArray(body.combatants),
  ];
}

encounterSaves.post('/', async (c) => {
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) throw badRequest('body is required');
  const values = await columnValues(c, body);
  const id = crypto.randomUUID();
  await run(
    c.env.DB,
    `INSERT INTO encounter_saves (id, owner_user_id, ${COLUMNS.join(', ')})
     VALUES (?, ?, ${COLUMNS.map(() => '?').join(', ')})`,
    id,
    c.get('userId'),
    ...values,
  );
  const row = await first<Row>(c.env.DB, 'SELECT * FROM encounter_saves WHERE id = ?', id);
  await logPlayed(c.env.DB, row!);
  return c.json(toJson(row!), 201);
});

encounterSaves.put('/:id', async (c) => {
  const id = c.req.param('id');
  const existing = await loadOwned(c, id);
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) throw badRequest('body is required');
  // Fields left out of the body keep their current value.
  const merged = { ...toJson(existing), ...body };
  const values = await columnValues(c, merged);
  await run(
    c.env.DB,
    `UPDATE encounter_saves
     SET ${COLUMNS.map((k) => `${k} = ?`).join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    ...values,
    id,
  );
  const row = await first<Row>(c.env.DB, 'SELECT * FROM encounter_saves WHERE id = ?', id);
  return c.json(toJson(row!));
});

encounterSaves.delete('/:id', async (c) => {
  await loadOwned(c, c.req.param('id'));
  await run(c.env.DB, 'DELETE FROM encounter_saves WHERE id = ?', c.req.param('id'));
  return c.body(null, 204);
});

// ---- Campaign-scoped: /api/v1/campaigns/:campaignId/encounters ------------

const campaignEncounterSaves = new Hono<AppBindings>();
campaignEncounterSaves.use('*', requireAuth);

campaignEncounterSaves.get('/', async (c) => {
  const campaignId = c.req.param('campaignId');
  await ownedCampaign(c, campaignId);
  const rows = await all<Row>(
    c.env.DB,
    `SELECT * FROM encounter_saves
     WHERE campaign_id = ? AND owner_user_id = ?
     ORDER BY (played_on IS NULL), played_on DESC, updated_at DESC`,
    campaignId,
    c.get('userId'),
  );
  return c.json(rows.map(toJson));
});

export { encounterSaves, campaignEncounterSaves };

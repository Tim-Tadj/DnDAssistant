// Ports EncounterSaveController. Snapshot of a generated encounter — list of
// monster refs (id/name/count/xp_each), a party snapshot (character ids),
// difficulty, total XP, played-on date, and notes.
//
// Two exports, both require auth and are owner-scoped:
//   - personal  (`encounterSaves`):      /api/v1/encounter-saves
//   - campaign  (`campaignEncounterSaves`): /api/v1/campaigns/:campaignId/encounters
//
// Personal endpoints:
//   GET    /              list the caller's saves (campaign_id may be null)
//   POST   /              create a new save
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
  created_at: string;
  updated_at: string;
};

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
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
  if (out.campaign_id == null) delete out.campaign_id;
  if (out.played_on == null) delete out.played_on;
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

encounterSaves.post('/', async (c) => {
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) throw badRequest('body is required');

  // If a campaign is attached, the caller must own it.
  const campaignId = campaignIdOrNull(body.campaign_id);
  if (campaignId) await ownedCampaign(c, campaignId);

  const id = crypto.randomUUID();
  await run(
    c.env.DB,
    `INSERT INTO encounter_saves
       (id, owner_user_id, campaign_id, name, monsters_json, party_snapshot_json,
        difficulty, total_xp, played_on, notes)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    id,
    c.get('userId'),
    campaignId,
    String(body.name ?? ''),
    jsonArray(body.monsters),
    jsonArray(body.party_snapshot_ids),
    String(body.difficulty ?? ''),
    intOr(body.total_xp, 0),
    dateOrNull(body.played_on),
    String(body.notes ?? ''),
  );
  const row = await first<Row>(c.env.DB, 'SELECT * FROM encounter_saves WHERE id = ?', id);
  return c.json(toJson(row!), 201);
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

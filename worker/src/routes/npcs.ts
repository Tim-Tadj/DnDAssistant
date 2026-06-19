// Ports NpcController (global /api/v1/npcs — what the frontend calls) and
// CampaignNpcController (back-compat /api/v1/campaigns/:campaignId/npcs), both
// over campaign_npcs. NPCs are global per-user (V14): owner-scoped, tagged with
// the campaigns they appear in via campaign_tags (JSON-array text). monster_id
// is a nullable FK to monsters (bad id -> 400). campaign_id / monster_id are
// omitted from the response when null (NON_NULL).

import { Hono } from 'hono';
import type { Context } from 'hono';
import type { AppBindings } from '../types';
import { all, first, run } from '../db';
import { badRequest, forbidden, mapDbError, notFound } from '../lib/errors';
import { requireAuth } from '../middleware/auth';
import { ownedCampaign } from '../lib/ownership';

type NpcRow = {
  id: string;
  campaign_id: string | null;
  owner_user_id: string;
  name: string;
  role: string;
  race: string;
  alignment: string;
  description: string;
  status: string;
  location: string;
  monster_id: number | null;
  notes: string;
  campaign_tags: string;
  created_at: string;
  updated_at: string;
};

const parseTags = (text: string | null): string[] => {
  if (!text) return [];
  try {
    const v = JSON.parse(text);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
};

function toJson(row: NpcRow) {
  const out: Record<string, unknown> = {
    id: row.id,
    campaign_id: row.campaign_id,
    owner_user_id: row.owner_user_id,
    name: row.name,
    role: row.role,
    race: row.race,
    alignment: row.alignment,
    description: row.description,
    status: row.status,
    location: row.location,
    monster_id: row.monster_id,
    notes: row.notes,
    campaign_tags: parseTags(row.campaign_tags),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
  for (const k of ['campaign_id', 'monster_id']) if (out[k] == null) delete out[k];
  return out;
}

const onMonsterFk = () => badRequest('monster_id does not reference an existing monster');
const monsterIdOrNull = (v: unknown): number | null =>
  v == null || v === '' ? null : Math.trunc(Number(v));

async function loadOwnedNpc(c: Context<AppBindings>, id: string): Promise<NpcRow> {
  const n = await first<NpcRow>(c.env.DB, 'SELECT * FROM campaign_npcs WHERE id = ?', id);
  if (!n) throw notFound(`NPC ${id} not found`);
  if (n.owner_user_id !== c.get('userId')) throw forbidden('Only the owner can modify this NPC');
  return n;
}

async function insertNpc(
  c: Context<AppBindings>,
  id: string,
  campaignId: string | null,
  body: Record<string, unknown>,
  tags: string[],
) {
  try {
    await run(
      c.env.DB,
      `INSERT INTO campaign_npcs
         (id, campaign_id, owner_user_id, name, role, race, alignment, description,
          status, location, monster_id, notes, campaign_tags)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      id,
      campaignId,
      c.get('userId'),
      String(body.name ?? ''),
      String(body.role ?? 'Notable'),
      String(body.race ?? ''),
      String(body.alignment ?? ''),
      String(body.description ?? ''),
      String(body.status ?? 'alive'),
      String(body.location ?? ''),
      monsterIdOrNull(body.monster_id),
      String(body.notes ?? ''),
      JSON.stringify(tags),
    );
  } catch (e) {
    mapDbError(e, { foreignKey: onMonsterFk });
  }
}

async function updateNpc(c: Context<AppBindings>, id: string, body: Record<string, unknown>) {
  const tags = Array.isArray(body.campaign_tags) ? body.campaign_tags.map(String) : [];
  try {
    await run(
      c.env.DB,
      `UPDATE campaign_npcs SET
         name=?, role=?, race=?, alignment=?, description=?, status=?, location=?,
         monster_id=?, notes=?, campaign_tags=?, updated_at=CURRENT_TIMESTAMP
       WHERE id=?`,
      String(body.name ?? ''),
      String(body.role ?? 'Notable'),
      String(body.race ?? ''),
      String(body.alignment ?? ''),
      String(body.description ?? ''),
      String(body.status ?? 'alive'),
      String(body.location ?? ''),
      monsterIdOrNull(body.monster_id),
      String(body.notes ?? ''),
      JSON.stringify(tags),
      id,
    );
  } catch (e) {
    mapDbError(e, { foreignKey: onMonsterFk });
  }
}

// ===== Global /api/v1/npcs =================================================

const npcs = new Hono<AppBindings>();
npcs.use('*', requireAuth);

npcs.get('/', async (c) => {
  const userId = c.get('userId');
  const tag = c.req.query('campaign');
  const rows = tag
    ? await all<NpcRow>(
        c.env.DB,
        `SELECT * FROM campaign_npcs
         WHERE owner_user_id = ? AND (campaign_id = ? OR campaign_tags LIKE ?)
         ORDER BY lower(name)`,
        userId,
        tag,
        `%${tag}%`,
      )
    : await all<NpcRow>(
        c.env.DB,
        'SELECT * FROM campaign_npcs WHERE owner_user_id = ? ORDER BY lower(name)',
        userId,
      );
  return c.json(rows.map(toJson));
});

npcs.get('/:id', async (c) => {
  const n = await loadOwnedNpc(c, c.req.param('id'));
  return c.json(toJson(n));
});

npcs.post('/', async (c) => {
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body?.name || String(body.name).trim() === '') throw badRequest('name is required');
  const id = crypto.randomUUID();
  const campaignId = body.campaign_id != null ? String(body.campaign_id) : null;
  const tags = Array.isArray(body.campaign_tags) ? body.campaign_tags.map(String) : [];
  await insertNpc(c, id, campaignId, body, tags);
  const row = await first<NpcRow>(c.env.DB, 'SELECT * FROM campaign_npcs WHERE id = ?', id);
  return c.json(toJson(row!), 201);
});

npcs.put('/:id', async (c) => {
  const id = c.req.param('id');
  await loadOwnedNpc(c, id);
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) throw badRequest('body is required');
  await updateNpc(c, id, body);
  const row = await first<NpcRow>(c.env.DB, 'SELECT * FROM campaign_npcs WHERE id = ?', id);
  return c.json(toJson(row!));
});

npcs.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await loadOwnedNpc(c, id);
  await run(c.env.DB, 'DELETE FROM campaign_npcs WHERE id = ?', id);
  return c.body(null, 204);
});

// ===== Back-compat nested /api/v1/campaigns/:campaignId/npcs ===============

const campaignNpcs = new Hono<AppBindings>();
campaignNpcs.use('*', requireAuth);

campaignNpcs.get('/', async (c) => {
  const campaignId = await ownedCampaign(c, c.req.param('campaignId'));
  const rows = await all<NpcRow>(
    c.env.DB,
    `SELECT * FROM campaign_npcs
     WHERE owner_user_id = ? AND (campaign_id = ? OR campaign_tags LIKE ?)
     ORDER BY lower(name)`,
    c.get('userId'),
    campaignId,
    `%${campaignId}%`,
  );
  return c.json(rows.map(toJson));
});

campaignNpcs.get('/:id', async (c) => {
  const campaignId = await ownedCampaign(c, c.req.param('campaignId'));
  const n = await loadOwnedNpc(c, c.req.param('id'));
  const visible = n.campaign_id === campaignId || parseTags(n.campaign_tags).includes(campaignId);
  if (!visible) throw badRequest(`NPC ${n.id} is not associated with campaign ${campaignId}`);
  return c.json(toJson(n));
});

campaignNpcs.post('/', async (c) => {
  const campaignId = await ownedCampaign(c, c.req.param('campaignId'));
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body?.name || String(body.name).trim() === '') throw badRequest('name is required');
  const id = crypto.randomUUID();
  const tags = Array.isArray(body.campaign_tags) ? body.campaign_tags.map(String) : [];
  if (!tags.includes(campaignId)) tags.push(campaignId);
  await insertNpc(c, id, campaignId, body, tags);
  const row = await first<NpcRow>(c.env.DB, 'SELECT * FROM campaign_npcs WHERE id = ?', id);
  return c.json(toJson(row!), 201);
});

campaignNpcs.put('/:id', async (c) => {
  await ownedCampaign(c, c.req.param('campaignId'));
  const id = c.req.param('id');
  await loadOwnedNpc(c, id);
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) throw badRequest('body is required');
  await updateNpc(c, id, body);
  const row = await first<NpcRow>(c.env.DB, 'SELECT * FROM campaign_npcs WHERE id = ?', id);
  return c.json(toJson(row!));
});

campaignNpcs.delete('/:id', async (c) => {
  await ownedCampaign(c, c.req.param('campaignId'));
  const id = c.req.param('id');
  await loadOwnedNpc(c, id);
  await run(c.env.DB, 'DELETE FROM campaign_npcs WHERE id = ?', id);
  return c.body(null, 204);
});

export { npcs, campaignNpcs };

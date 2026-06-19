// Ports CampaignCharacterController + CampaignCharacterRepository.
// Per-campaign override of a character (level / hp_max / AC / conditions /
// death saves / hit dice). The bare list is the whole campaign; per-pair
// endpoints live under :characterId.
//
//   GET    /api/v1/campaigns/:campaignId/characters
//   GET    /api/v1/campaigns/:campaignId/characters/:characterId   (auto-inits)
//   PUT    /api/v1/campaigns/:campaignId/characters/:characterId   (upsert)
//   DELETE /api/v1/campaigns/:campaignId/characters/:characterId
//
// All routes require auth; the caller must own both the campaign and the
// attached character. When the row doesn't exist yet, GET seeds it from the
// canonical character (level, hp_max) and returns it — matching the Java
// `getOrInit` behaviour.

import { Hono } from 'hono';
import type { Context } from 'hono';
import type { AppBindings } from '../types';
import { all, first, run } from '../db';
import { badRequest, forbidden, mapDbError, notFound } from '../lib/errors';
import { requireAuth } from '../middleware/auth';
import { ownedCampaign } from '../lib/ownership';

const campaignCharacters = new Hono<AppBindings>();
campaignCharacters.use('*', requireAuth);

type Row = {
  id: string;
  campaign_id: string;
  character_id: string;
  level: number;
  hp_max_override: number | null;
  ac_override: number | null;
  notes: string;
  conditions: string;
  death_save_successes: number;
  death_save_failures: number;
  hit_dice_used: number;
  last_long_rest: string | null;
  last_short_rest: string | null;
  created_at: string;
  updated_at: string;
};

type CharRow = { id: string; level: number; hp_max: number; owner_user_id: string };

const intOr = (v: unknown, d: number): number => {
  if (v == null || v === '') return d;
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) ? n : d;
};

const intOrNull = (v: unknown): number | null => {
  if (v == null || v === '') return null;
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) ? n : null;
};

const parseConditions = (text: string | null): string[] => {
  if (!text) return [];
  try {
    const v = JSON.parse(text);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
};

const dateOrNull = (v: unknown): string | null =>
  v == null || v === '' ? null : String(v);

const conditionsJson = (v: unknown): string =>
  JSON.stringify(Array.isArray(v) ? v : []);

function toJson(row: Row) {
  const out: Record<string, unknown> = {
    id: row.id,
    campaign_id: row.campaign_id,
    character_id: row.character_id,
    level: row.level,
    hp_max_override: row.hp_max_override,
    ac_override: row.ac_override,
    notes: row.notes,
    conditions: parseConditions(row.conditions),
    death_save_successes: row.death_save_successes,
    death_save_failures: row.death_save_failures,
    hit_dice_used: row.hit_dice_used,
    last_long_rest: row.last_long_rest,
    last_short_rest: row.last_short_rest,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
  for (const k of ['hp_max_override', 'ac_override', 'last_long_rest', 'last_short_rest']) {
    if (out[k] == null) delete out[k];
  }
  return out;
}

async function loadOwnedCharacter(c: Context<AppBindings>, characterId: string): Promise<CharRow> {
  const ch = await first<CharRow>(
    c.env.DB,
    'SELECT id, level, hp_max, owner_user_id FROM characters WHERE id = ?',
    characterId,
  );
  if (!ch) throw notFound(`Character ${characterId} not found`);
  if (ch.owner_user_id !== c.get('userId')) {
    throw forbidden('Only the character owner can attach this character to a campaign');
  }
  return ch;
}

campaignCharacters.get('/', async (c) => {
  const campaignId = c.req.param('campaignId');
  await ownedCampaign(c, campaignId);
  const rows = await all<Row>(
    c.env.DB,
    'SELECT * FROM campaign_characters WHERE campaign_id = ? ORDER BY created_at ASC',
    campaignId,
  );
  return c.json(rows.map(toJson));
});

campaignCharacters.get('/:characterId', async (c) => {
  const campaignId = c.req.param('campaignId');
  await ownedCampaign(c, campaignId);
  const characterId = c.req.param('characterId');
  const ch = await loadOwnedCharacter(c, characterId);

  const existing = await first<Row>(
    c.env.DB,
    'SELECT * FROM campaign_characters WHERE campaign_id = ? AND character_id = ?',
    campaignId,
    characterId,
  );
  if (existing) return c.json(toJson(existing));

  // Auto-init: seed a row from the canonical character. Mirrors Java's
  // `getOrInit(campaignId, characterId, level, hpMax)`.
  const id = crypto.randomUUID();
  await run(
    c.env.DB,
    `INSERT INTO campaign_characters
       (id, campaign_id, character_id, level, hp_max_override, ac_override,
        notes, conditions, death_save_successes, death_save_failures,
        hit_dice_used, last_long_rest, last_short_rest)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    id,
    campaignId,
    characterId,
    ch.level ?? 1,
    ch.hp_max ?? 10,
    null,
    '',
    '[]',
    0,
    0,
    0,
    null,
    null,
  );
  const row = await first<Row>(c.env.DB, 'SELECT * FROM campaign_characters WHERE id = ?', id);
  return c.json(toJson(row!));
});

campaignCharacters.put('/:characterId', async (c) => {
  const campaignId = c.req.param('campaignId');
  await ownedCampaign(c, campaignId);
  const characterId = c.req.param('characterId');
  await loadOwnedCharacter(c, characterId);

  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) throw badRequest('body is required');

  // Upsert by (campaign_id, character_id): if the client PUTs without an
  // id (the common case from a re-edit), resolve the existing row first.
  const existing = await first<{ id: string }>(
    c.env.DB,
    'SELECT id FROM campaign_characters WHERE campaign_id = ? AND character_id = ?',
    campaignId,
    characterId,
  );

  try {
    if (existing) {
      await run(
        c.env.DB,
        `UPDATE campaign_characters SET
           level = ?, hp_max_override = ?, ac_override = ?, notes = ?,
           conditions = ?, death_save_successes = ?, death_save_failures = ?,
           hit_dice_used = ?, last_long_rest = ?, last_short_rest = ?,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        intOr(body.level, 1),
        intOrNull(body.hp_max_override),
        intOrNull(body.ac_override),
        String(body.notes ?? ''),
        conditionsJson(body.conditions),
        intOr(body.death_save_successes, 0),
        intOr(body.death_save_failures, 0),
        intOr(body.hit_dice_used, 0),
        dateOrNull(body.last_long_rest),
        dateOrNull(body.last_short_rest),
        existing.id,
      );
    } else {
      await run(
        c.env.DB,
        `INSERT INTO campaign_characters
           (id, campaign_id, character_id, level, hp_max_override, ac_override,
            notes, conditions, death_save_successes, death_save_failures,
            hit_dice_used, last_long_rest, last_short_rest)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        crypto.randomUUID(),
        campaignId,
        characterId,
        intOr(body.level, 1),
        intOrNull(body.hp_max_override),
        intOrNull(body.ac_override),
        String(body.notes ?? ''),
        conditionsJson(body.conditions),
        intOr(body.death_save_successes, 0),
        intOr(body.death_save_failures, 0),
        intOr(body.hit_dice_used, 0),
        dateOrNull(body.last_long_rest),
        dateOrNull(body.last_short_rest),
      );
    }
  } catch (e) {
    // FK violations here mean the character or campaign vanished mid-flight.
    mapDbError(e, {
      foreignKey: () => badRequest('character_id or campaign_id does not reference an existing row'),
    });
  }

  const row = await first<Row>(
    c.env.DB,
    'SELECT * FROM campaign_characters WHERE campaign_id = ? AND character_id = ?',
    campaignId,
    characterId,
  );
  return c.json(toJson(row!));
});

campaignCharacters.delete('/:characterId', async (c) => {
  const campaignId = c.req.param('campaignId');
  await ownedCampaign(c, campaignId);
  const characterId = c.req.param('characterId');
  await loadOwnedCharacter(c, characterId);
  await run(
    c.env.DB,
    'DELETE FROM campaign_characters WHERE campaign_id = ? AND character_id = ?',
    campaignId,
    characterId,
  );
  return c.body(null, 204);
});

export default campaignCharacters;

// Ports CharacterController + CharacterStateController (same path prefix).
//   GET/POST   /api/v1/characters
//   GET/PUT/DELETE /api/v1/characters/:id
//   GET/PUT    /api/v1/characters/:id/state   (in-session HP/conditions/rest)
//
// All routes require auth and are scoped to the owning user. Character JSON
// field names already match the DB columns (incl. `int_`), so character rows
// pass through unchanged; only character_state needs the conditions[] <-> JSON
// transform. State is auto-initialised (transient, not persisted) on first GET
// with current_hp = the character's hp_max; PUT upserts.

import { Hono } from 'hono';
import type { Context } from 'hono';
import type { AppBindings } from '../types';
import { all, first, run } from '../db';
import { badRequest, forbidden, mapDbError, notFound } from '../lib/errors';
import { requireAuth } from '../middleware/auth';

const characters = new Hono<AppBindings>();

// Every character endpoint requires a signed-in user.
characters.use('*', requireAuth);

type CharRow = {
  id: string;
  hp_max: number;
  owner_user_id: string;
  [k: string]: unknown;
};

type StateRow = {
  character_id: string;
  current_hp: number;
  temp_hp: number;
  conditions: string;
  death_save_successes: number;
  death_save_failures: number;
  hit_dice_used: number;
  last_long_rest: string | null;
  last_short_rest: string | null;
  updated_at: string;
};

const intOr = (v: unknown, d: number): number => {
  if (v == null || v === '') return d;
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) ? n : d;
};

async function requireOwned(c: Context<AppBindings>, id: string): Promise<CharRow> {
  const ch = await first<CharRow>(c.env.DB, 'SELECT * FROM characters WHERE id = ?', id);
  if (!ch) throw notFound(`Character ${id} not found`);
  if (ch.owner_user_id !== c.get('userId')) {
    throw forbidden('Only the owner can modify this character');
  }
  return ch;
}

const onFkError = () => badRequest('race_id or class_id does not reference an existing race/class');

// ---- Character CRUD -------------------------------------------------------

characters.get('/', async (c) => {
  const rows = await all(
    c.env.DB,
    'SELECT * FROM characters WHERE owner_user_id = ? ORDER BY name',
    c.get('userId'),
  );
  return c.json(rows);
});

characters.get('/:id', async (c) => {
  const ch = await requireOwned(c, c.req.param('id'));
  return c.json(ch);
});

characters.post('/', async (c) => {
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!name) throw badRequest('name is required');
  if (body?.race_id == null) throw badRequest('race_id is required');
  if (body?.class_id == null) throw badRequest('class_id is required');
  const id = crypto.randomUUID();

  try {
    await run(
      c.env.DB,
      `INSERT INTO characters
         (id, name, race_id, class_id, level, alignment, background,
          str, dex, con, int_, wis, cha, hp_max, ac, notes, owner_user_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      id,
      name,
      Number(body.race_id),
      Number(body.class_id),
      intOr(body.level, 1),
      String(body.alignment ?? 'Neutral'),
      String(body.background ?? ''),
      intOr(body.str, 10),
      intOr(body.dex, 10),
      intOr(body.con, 10),
      intOr(body.int_, 10),
      intOr(body.wis, 10),
      intOr(body.cha, 10),
      intOr(body.hp_max, 10),
      intOr(body.ac, 10),
      String(body.notes ?? ''),
      c.get('userId'),
    );
  } catch (e) {
    mapDbError(e, { foreignKey: onFkError });
  }
  const row = await first(c.env.DB, 'SELECT * FROM characters WHERE id = ?', id);
  return c.json(row, 201);
});

characters.put('/:id', async (c) => {
  const id = c.req.param('id');
  await requireOwned(c, id);
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!name) throw badRequest('name is required');
  if (body?.race_id == null) throw badRequest('race_id is required');
  if (body?.class_id == null) throw badRequest('class_id is required');

  try {
    await run(
      c.env.DB,
      `UPDATE characters SET
         name=?, race_id=?, class_id=?, level=?, alignment=?, background=?,
         str=?, dex=?, con=?, int_=?, wis=?, cha=?, hp_max=?, ac=?, notes=?,
         updated_at=CURRENT_TIMESTAMP
       WHERE id=?`,
      name,
      Number(body.race_id),
      Number(body.class_id),
      intOr(body.level, 1),
      String(body.alignment ?? 'Neutral'),
      String(body.background ?? ''),
      intOr(body.str, 10),
      intOr(body.dex, 10),
      intOr(body.con, 10),
      intOr(body.int_, 10),
      intOr(body.wis, 10),
      intOr(body.cha, 10),
      intOr(body.hp_max, 10),
      intOr(body.ac, 10),
      String(body.notes ?? ''),
      id,
    );
  } catch (e) {
    mapDbError(e, { foreignKey: onFkError });
  }
  const row = await first(c.env.DB, 'SELECT * FROM characters WHERE id = ?', id);
  return c.json(row);
});

characters.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await requireOwned(c, id);
  await run(c.env.DB, 'DELETE FROM characters WHERE id = ?', id);
  return c.body(null, 204);
});

// ---- Character state (HP/conditions/rest) ---------------------------------

function parseConditions(text: string | null): string[] {
  if (!text) return [];
  try {
    const v = JSON.parse(text);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

function stateToJson(row: StateRow) {
  const out: Record<string, unknown> = {
    character_id: row.character_id,
    current_hp: row.current_hp,
    temp_hp: row.temp_hp,
    conditions: parseConditions(row.conditions),
    death_save_successes: row.death_save_successes,
    death_save_failures: row.death_save_failures,
    hit_dice_used: row.hit_dice_used,
    last_long_rest: row.last_long_rest,
    last_short_rest: row.last_short_rest,
    updated_at: row.updated_at,
  };
  for (const k of ['last_long_rest', 'last_short_rest']) if (out[k] == null) delete out[k];
  return out;
}

characters.get('/:id/state', async (c) => {
  const id = c.req.param('id');
  const ch = await requireOwned(c, id);
  const existing = await first<StateRow>(
    c.env.DB,
    'SELECT * FROM character_state WHERE character_id = ?',
    id,
  );
  if (existing) return c.json(stateToJson(existing));
  // Transient default (not persisted), mirroring getOrInit.
  return c.json({
    character_id: id,
    current_hp: ch.hp_max ?? 10,
    temp_hp: 0,
    conditions: [],
    death_save_successes: 0,
    death_save_failures: 0,
    hit_dice_used: 0,
  });
});

characters.put('/:id/state', async (c) => {
  const id = c.req.param('id');
  await requireOwned(c, id);
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) throw badRequest('body is required');
  const conditions = JSON.stringify(Array.isArray(body.conditions) ? body.conditions : []);

  await run(
    c.env.DB,
    `INSERT INTO character_state
       (character_id, current_hp, temp_hp, conditions, death_save_successes,
        death_save_failures, hit_dice_used, last_long_rest, last_short_rest, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
     ON CONFLICT(character_id) DO UPDATE SET
       current_hp = excluded.current_hp,
       temp_hp = excluded.temp_hp,
       conditions = excluded.conditions,
       death_save_successes = excluded.death_save_successes,
       death_save_failures = excluded.death_save_failures,
       hit_dice_used = excluded.hit_dice_used,
       last_long_rest = excluded.last_long_rest,
       last_short_rest = excluded.last_short_rest,
       updated_at = CURRENT_TIMESTAMP`,
    id,
    intOr(body.current_hp, 0),
    intOr(body.temp_hp, 0),
    conditions,
    intOr(body.death_save_successes, 0),
    intOr(body.death_save_failures, 0),
    intOr(body.hit_dice_used, 0),
    body.last_long_rest != null ? String(body.last_long_rest) : null,
    body.last_short_rest != null ? String(body.last_short_rest) : null,
  );
  const row = await first<StateRow>(
    c.env.DB,
    'SELECT * FROM character_state WHERE character_id = ?',
    id,
  );
  return c.json(stateToJson(row!));
});

export default characters;

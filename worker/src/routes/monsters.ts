// Ports MonsterController + MonsterRepository. This is the TEMPLATE that
// every other resource route copies (spells, gear, ...).
//
//   GET    /api/v1/monsters       list visible to current user
//   GET    /api/v1/monsters/:id   one
//   POST   /api/v1/monsters       create (auth; forced provenance=homebrew, owner=me)
//   PUT    /api/v1/monsters/:id   update (auth; owner of a homebrew row only)
//   DELETE /api/v1/monsters/:id   delete (same ownership rule)
//
// Visibility: SRD/derived rows are global; homebrew rows are visible only to
// their owner. Only homebrew rows owned by the caller may be modified.

import { Hono } from 'hono';
import type { Context } from 'hono';
import type { AppBindings } from '../types';
import { all, first, run, str } from '../db';
import { badRequest, conflict, forbidden, mapDbError, notFound } from '../lib/errors';
import { requireAuth } from '../middleware/auth';

const monsters = new Hono<AppBindings>();

// `int` is a SQLite keyword-ish identifier → always quote it.
const colName = (f: string) => (f === 'int' ? '"int"' : f);

// Writable string fields (everything except id/provenance/owner/timestamps).
const FIELDS = [
  'meta', 'ac', 'hp', 'speed',
  'str', 'str_mod', 'dex', 'dex_mod', 'con', 'con_mod',
  'int', 'int_mod', 'wis', 'wis_mod', 'cha', 'cha_mod',
  'saving_throws', 'skills',
  'damage_vulnerabilities', 'damage_resistances', 'damage_immunities',
  'condition_immunities', 'senses', 'languages', 'challenge',
  'traits', 'actions', 'reactions', 'legendary_actions',
  'description', 'lair_actions', 'regional_effects', 'img_url',
] as const;

const SELECT_COLS = `id, name, ${FIELDS.map(colName).join(', ')}, provenance, owner_user_id, created_at, updated_at`;

type MonsterRow = Record<string, unknown> & {
  id: number;
  provenance: string;
  owner_user_id: string | null;
};

async function loadOwned(c: Context<AppBindings>, id: number) {
  const existing = await first<MonsterRow>(
    c.env.DB,
    'SELECT id, provenance, owner_user_id FROM monsters WHERE id = ?',
    id,
  );
  if (!existing) throw notFound(`Monster ${id} not found`);
  if (existing.provenance !== 'homebrew') {
    throw forbidden('Only homebrew monsters can be modified');
  }
  if (existing.owner_user_id !== c.get('userId')) {
    throw forbidden('Only the owner can modify this monster');
  }
  return existing;
}

monsters.get('/', async (c) => {
  const userId = c.get('userId');
  const rows = userId
    ? await all(
        c.env.DB,
        `SELECT ${SELECT_COLS} FROM monsters WHERE provenance <> 'homebrew' OR owner_user_id = ? ORDER BY name`,
        userId,
      )
    : await all(
        c.env.DB,
        `SELECT ${SELECT_COLS} FROM monsters WHERE provenance <> 'homebrew' ORDER BY name`,
      );
  return c.json(rows);
});

monsters.get('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const row = await first(c.env.DB, `SELECT ${SELECT_COLS} FROM monsters WHERE id = ?`, id);
  if (!row) throw notFound(`Monster ${id} not found`);
  return c.json(row);
});

monsters.post('/', requireAuth, async (c) => {
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!name) throw badRequest("Monster 'name' is required");
  const userId = c.get('userId')!;

  const cols = ['name', ...FIELDS.map(colName), 'provenance', 'owner_user_id'];
  const values = [name, ...FIELDS.map((f) => str(body?.[f])), 'homebrew', userId];
  const placeholders = cols.map(() => '?').join(', ');

  let res: D1Result;
  try {
    res = await run(
      c.env.DB,
      `INSERT INTO monsters (${cols.join(', ')}) VALUES (${placeholders})`,
      ...values,
    );
  } catch (e) {
    mapDbError(e, {
      unique: () =>
        conflict(`A monster named '${name}' with provenance 'homebrew' already exists`),
    });
  }
  const newId = res!.meta.last_row_id;
  const row = await first(c.env.DB, `SELECT ${SELECT_COLS} FROM monsters WHERE id = ?`, newId);
  return c.json(row, 201);
});

monsters.put('/:id', requireAuth, async (c) => {
  const id = Number(c.req.param('id'));
  await loadOwned(c, id);
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!name) throw badRequest("Monster 'name' is required");

  const setClause = [
    'name = ?',
    ...FIELDS.map((f) => `${colName(f)} = ?`),
    'updated_at = CURRENT_TIMESTAMP',
  ].join(', ');
  const values = [name, ...FIELDS.map((f) => str(body?.[f])), id];

  await run(c.env.DB, `UPDATE monsters SET ${setClause} WHERE id = ?`, ...values);
  const row = await first(c.env.DB, `SELECT ${SELECT_COLS} FROM monsters WHERE id = ?`, id);
  return c.json(row);
});

monsters.delete('/:id', requireAuth, async (c) => {
  const id = Number(c.req.param('id'));
  await loadOwned(c, id);
  await run(c.env.DB, 'DELETE FROM monsters WHERE id = ?', id);
  return c.body(null, 204);
});

export default monsters;

// Ports SpellController + SpellRepository.
//   GET/POST /api/v1/spells ; GET/PUT/DELETE /api/v1/spells/:id
// Wire format quirks preserved:
//   - JSON `range` <-> DB column `spell_range`
//   - `ritual` boolean <-> INTEGER 0/1
//   - `classes` / `tags` string[] <-> CSV text
//   - `components` object <-> JSON text column
// Visibility + ownership rules identical to monsters.

import { Hono } from 'hono';
import type { Context } from 'hono';
import type { AppBindings } from '../types';
import { all, first, run } from '../db';
import { badRequest, conflict, forbidden, mapDbError, notFound } from '../lib/errors';
import { requireAuth } from '../middleware/auth';

const spells = new Hono<AppBindings>();

type SpellRow = {
  id: number;
  name: string;
  level: string;
  school: string;
  type: string;
  casting_time: string;
  spell_range: string;
  duration: string;
  ritual: number;
  description: string;
  higher_levels: string;
  classes: string;
  tags: string;
  components: string;
  provenance: string;
  owner_user_id: string | null;
  created_at: string;
  updated_at: string;
};

const splitCsv = (s: string | null): string[] =>
  s ? s.split(',').map((t) => t.trim()).filter(Boolean) : [];

const joinCsv = (v: unknown): string =>
  Array.isArray(v)
    ? v.map((x) => String(x).trim()).filter(Boolean).join(',')
    : typeof v === 'string'
      ? v
      : '';

const DEFAULT_COMPONENTS = { material: false, somatic: false, verbal: false, materials_needed: [] as string[], raw: '' };

function parseComponents(text: string | null): {
  material: boolean;
  somatic: boolean;
  verbal: boolean;
  materials_needed: string[];
  raw: string;
} {
  if (!text) return { ...DEFAULT_COMPONENTS };
  let v: unknown;
  try {
    v = JSON.parse(text);
  } catch {
    return { ...DEFAULT_COMPONENTS, raw: text };
  }
  if (!v || typeof v !== 'object') return { ...DEFAULT_COMPONENTS, raw: text };
  // Older seed data (pre-Phase-7) was written without a materials_needed
  // array; normalise so the wire is always consistent.
  const o = v as Record<string, unknown>;
  return {
    material: !!o.material,
    somatic: !!o.somatic,
    verbal: !!o.verbal,
    materials_needed: Array.isArray(o.materials_needed) ? o.materials_needed : [],
    raw: typeof o.raw === 'string' ? o.raw : text,
  };
}

const serializeComponents = (v: unknown): string =>
  v && typeof v === 'object' ? JSON.stringify(v) : '{}';

function toJson(row: SpellRow) {
  return {
    id: row.id,
    name: row.name,
    level: row.level,
    school: row.school,
    type: row.type,
    casting_time: row.casting_time,
    range: row.spell_range,
    duration: row.duration,
    ritual: !!row.ritual,
    description: row.description,
    higher_levels: row.higher_levels,
    classes: splitCsv(row.classes),
    tags: splitCsv(row.tags),
    components: parseComponents(row.components),
    provenance: row.provenance,
    owner_user_id: row.owner_user_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function loadOwned(c: Context<AppBindings>, id: number) {
  const existing = await first<SpellRow>(
    c.env.DB,
    'SELECT id, provenance, owner_user_id FROM spells WHERE id = ?',
    id,
  );
  if (!existing) throw notFound(`Spell ${id} not found`);
  if (existing.provenance !== 'homebrew') throw forbidden('Only homebrew spells can be modified');
  if (existing.owner_user_id !== c.get('userId')) {
    throw forbidden('Only the owner can modify this spell');
  }
  return existing;
}

function validateRequired(body: Record<string, unknown> | null) {
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const level = typeof body?.level === 'string' ? body.level.trim() : '';
  const school = typeof body?.school === 'string' ? body.school.trim() : '';
  if (!name) throw badRequest("Spell 'name' is required");
  if (!level) throw badRequest("Spell 'level' is required");
  if (!school) throw badRequest("Spell 'school' is required");
  return { name, level, school };
}

// Column order shared by INSERT/UPDATE value building (minus id/provenance/owner).
function writeValues(body: Record<string, unknown>, name: string, level: string, school: string) {
  return [
    name,
    level,
    school,
    String(body.type ?? ''),
    String(body.casting_time ?? ''),
    String(body.range ?? ''),
    String(body.duration ?? ''),
    body.ritual ? 1 : 0,
    String(body.description ?? ''),
    String(body.higher_levels ?? ''),
    joinCsv(body.classes),
    joinCsv(body.tags),
    serializeComponents(body.components),
  ];
}

spells.get('/', async (c) => {
  const userId = c.get('userId');
  // Visibility: SRD/derived + homebrew owned by caller + homebrew with no
  // owner (global reference content, e.g. seeded custom_* corpora).
  const where = userId
    ? `provenance <> 'homebrew' OR owner_user_id = ? OR owner_user_id IS NULL`
    : `provenance <> 'homebrew' OR owner_user_id IS NULL`;
  const rows = userId
    ? await all<SpellRow>(
        c.env.DB,
        `SELECT * FROM spells WHERE ${where} ORDER BY level, name`,
        userId,
      )
    : await all<SpellRow>(
        c.env.DB,
        `SELECT * FROM spells WHERE ${where} ORDER BY level, name`,
      );
  return c.json(rows.map(toJson));
});

spells.get('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const row = await first<SpellRow>(c.env.DB, 'SELECT * FROM spells WHERE id = ?', id);
  if (!row) throw notFound(`Spell ${id} not found`);
  return c.json(toJson(row));
});

spells.post('/', requireAuth, async (c) => {
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  const { name, level, school } = validateRequired(body);
  const userId = c.get('userId')!;
  const values = [...writeValues(body!, name, level, school), 'homebrew', userId];

  let res: D1Result;
  try {
    res = await run(
      c.env.DB,
      `INSERT INTO spells
         (name, level, school, type, casting_time, spell_range, duration, ritual,
          description, higher_levels, classes, tags, components, provenance, owner_user_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      ...values,
    );
  } catch (e) {
    mapDbError(e, {
      unique: () =>
        conflict(`A spell named '${name}' with provenance 'homebrew' already exists`),
    });
  }
  const row = await first<SpellRow>(c.env.DB, 'SELECT * FROM spells WHERE id = ?', res!.meta.last_row_id);
  return c.json(toJson(row!), 201);
});

spells.put('/:id', requireAuth, async (c) => {
  const id = Number(c.req.param('id'));
  await loadOwned(c, id);
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  const { name, level, school } = validateRequired(body);
  const values = [...writeValues(body!, name, level, school), id];

  await run(
    c.env.DB,
    `UPDATE spells SET
       name=?, level=?, school=?, type=?, casting_time=?, spell_range=?, duration=?,
       ritual=?, description=?, higher_levels=?, classes=?, tags=?, components=?,
       updated_at=CURRENT_TIMESTAMP
     WHERE id=?`,
    ...values,
  );
  const row = await first<SpellRow>(c.env.DB, 'SELECT * FROM spells WHERE id = ?', id);
  return c.json(toJson(row!));
});

spells.delete('/:id', requireAuth, async (c) => {
  const id = Number(c.req.param('id'));
  await loadOwned(c, id);
  await run(c.env.DB, 'DELETE FROM spells WHERE id = ?', id);
  return c.body(null, 204);
});

export default spells;

// Ports ImportController. Generic upsert pipeline for content ingestion:
//   POST /api/v1/import           bulk-upsert by natural key
//   GET  /api/v1/import/snapshot  export DB rows in the exact shape the
//                                 importer accepts (round-trippable)
//
// AUTH-GATED (was open in the Java port — fixed 2026-06-22 after a
// security review of /api/v1/*). Both endpoints now require a valid JWT.
// User-driven calls are forced to provenance='homebrew' with the caller's
// userId as owner_user_id; only seed scripts (which write via
// `wrangler d1 execute --file=...` and never touch this HTTP endpoint)
// can land srd/derived rows. Each item is processed in isolation — a
// single bad row is recorded in the per-item `errors` array and never
// aborts the batch.
//
// Natural keys:
//   spells:    (name, provenance, owner_user_id)
//   monsters:  (name, provenance, owner_user_id)
//   gear:      (name, kind, provenance, owner_user_id)   (kind required for gear)
//
// The Java side uses IS NOT DISTINCT FROM so NULL owner_user_id matches
// another NULL (global reference rows). We emulate that here with
// (col = ? OR (col IS NULL AND ? IS NULL)) so D1/SQLite stays portable.

import { Hono } from 'hono';
import type { Context } from 'hono';
import type { AppBindings } from '../types';
import { all, first, run } from '../db';
import { badRequest, unauthorized } from '../lib/errors';
import { requireAuth } from '../middleware/auth';

const importRoutes = new Hono<AppBindings>();

// Auth gate: every endpoint below requires a valid JWT. Previously this
// route was open, which let any internet caller overwrite the global SRD
// tables or impersonate any user. The frontend does not currently call
// these endpoints — seed scripts write directly via `wrangler d1 execute`
// and bypass this HTTP layer entirely.
importRoutes.use('*', requireAuth);

// Force homebrew provenance + caller's userId for user-driven calls.
// Only seed-time writes should ever produce provenance='srd' or 'derived',
// and those happen out-of-band via `wrangler d1 execute --file=...`.
// We do this in the handler, not in the middleware, because snapshot needs
// to read with the user's view of visibility (their own homebrew + global SRD).
function userHomebrewContext(
  c: Context<AppBindings>,
  claimedProvenance: unknown,
  claimedOwner: unknown,
): { provenance: 'homebrew'; ownerUserId: string } {
  const userId = c.get('userId');
  if (!userId) throw unauthorized(); // requireAuth should have caught this, but be explicit
  if (claimedProvenance !== undefined && claimedProvenance !== 'homebrew') {
    throw badRequest("Request 'provenance' must be 'homebrew' on this endpoint");
  }
  if (claimedOwner !== undefined && claimedOwner !== null && claimedOwner !== userId) {
    throw badRequest("'owner_user_id' must be omitted, null, or match the authenticated user");
  }
  return { provenance: 'homebrew', ownerUserId: userId };
}

const KINDS = ['spell', 'monster', 'gear'] as const;
const PROVENANCES = ['srd', 'derived', 'homebrew'] as const;
type Kind = (typeof KINDS)[number];
type Provenance = (typeof PROVENANCES)[number];

// ---- Per-kind transform helpers -------------------------------------------

const orEmpty = (v: unknown): string => (v == null ? '' : String(v));
const orNull = (v: unknown): string | null => (v == null ? null : String(v));
const orZero = (v: unknown): number => {
  if (v == null || v === '') return 0;
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) ? n : 0;
};

const joinCsv = (v: unknown): string =>
  Array.isArray(v)
    ? v.map((x) => String(x).trim()).filter(Boolean).join(',')
    : typeof v === 'string'
      ? v
      : '';

const splitCsv = (s: string | null): string[] =>
  s ? s.split(',').map((t) => t.trim()).filter(Boolean) : [];

const serializeComponents = (v: unknown): string =>
  v && typeof v === 'object' ? JSON.stringify(v) : '{}';

const parseComponents = (text: string | null): unknown => {
  if (!text) return { material: false, somatic: false, verbal: false, materials_needed: [], raw: '' };
  try {
    const v = JSON.parse(text);
    return v && typeof v === 'object' ? v : { material: false, somatic: false, verbal: false, materials_needed: [], raw: text };
  } catch {
    return { material: false, somatic: false, verbal: false, materials_needed: [], raw: text };
  }
};

const colName = (f: string) => (f === 'int' ? '"int"' : f);

const MONSTER_FIELDS = [
  'meta', 'ac', 'hp', 'speed',
  'str', 'str_mod', 'dex', 'dex_mod', 'con', 'con_mod',
  'int', 'int_mod', 'wis', 'wis_mod', 'cha', 'cha_mod',
  'saving_throws', 'skills',
  'damage_vulnerabilities', 'damage_resistances', 'damage_immunities',
  'condition_immunities', 'senses', 'languages', 'challenge',
  'traits', 'actions', 'reactions', 'legendary_actions',
  'description', 'lair_actions', 'regional_effects', 'img_url',
] as const;

const SPELL_COLS = [
  'name', 'level', 'school', 'type', 'casting_time', 'spell_range', 'duration',
  'ritual', 'description', 'higher_levels', 'classes', 'tags', 'components',
  'provenance', 'owner_user_id',
] as const;

const MONSTER_COLS = [
  'name', ...MONSTER_FIELDS, 'provenance', 'owner_user_id',
] as const;

const GEAR_COLS = [
  'name', 'kind', 'cost', 'weight', 'type', 'damage', 'properties', 'ac',
  'strength', 'stealth', 'description', 'provenance', 'owner_user_id',
] as const;

// ---- Per-kind upsert -------------------------------------------------------

function spellWriteValues(body: Record<string, unknown>, provenance: string, owner: string | null) {
  return [
    String(body.name ?? ''),
    String(body.level ?? ''),
    String(body.school ?? ''),
    String(body.type ?? ''),
    String(body.casting_time ?? ''),
    String(body.range ?? ''),
    String(body.duration ?? ''),
    body.ritual ? 1 : 0,
    orEmpty(body.description),
    orEmpty(body.higher_levels),
    joinCsv(body.classes),
    joinCsv(body.tags),
    serializeComponents(body.components),
    provenance,
    owner,
  ];
}

function monsterWriteValues(body: Record<string, unknown>, provenance: string, owner: string | null) {
  const vals: unknown[] = [String(body.name ?? '')];
  for (const f of MONSTER_FIELDS) vals.push(orEmpty(body[f]));
  vals.push(provenance, owner);
  return vals;
}

function gearWriteValues(body: Record<string, unknown>, provenance: string, owner: string | null) {
  return [
    String(body.name ?? ''),
    String(body.kind ?? 'gear'),
    orEmpty(body.cost),
    orEmpty(body.weight),
    orEmpty(body.type),
    orNull(body.Damage),
    orNull(body.Properties),
    orNull(body.AC),
    orNull(body.Strength),
    orNull(body.Stealth),
    orNull(body.description),
    provenance,
    owner,
  ];
}

async function upsertSpell(
  c: Context<AppBindings>,
  body: Record<string, unknown>,
  provenance: Provenance,
  owner: string | null,
): Promise<{ created: boolean }> {
  const name = String(body.name ?? '').trim();
  if (!name) throw new Error("spell 'name' is required");
  const existing = await findByNaturalKey(c, 'spells', name, provenance, owner, null);
  if (existing) {
    await run(
      c.env.DB,
      `UPDATE spells SET
         name=?, level=?, school=?, type=?, casting_time=?, spell_range=?, duration=?,
         ritual=?, description=?, higher_levels=?, classes=?, tags=?, components=?,
         updated_at=CURRENT_TIMESTAMP
       WHERE id=?`,
      ...spellWriteValues(body, provenance, owner).slice(0, -2),
      (existing as { id: number }).id,
    );
    return { created: false };
  }
  await run(
    c.env.DB,
    `INSERT INTO spells
       (${SPELL_COLS.join(', ')})
     VALUES (${SPELL_COLS.map(() => '?').join(', ')})`,
    ...spellWriteValues(body, provenance, owner),
  );
  return { created: true };
}

async function upsertMonster(
  c: Context<AppBindings>,
  body: Record<string, unknown>,
  provenance: Provenance,
  owner: string | null,
): Promise<{ created: boolean }> {
  const name = String(body.name ?? '').trim();
  if (!name) throw new Error("monster 'name' is required");
  const existing = await findByNaturalKey(c, 'monsters', name, provenance, owner, null);
  if (existing) {
    const vals = monsterWriteValues(body, provenance, owner).slice(0, -2);
    const setClause = ['name = ?', ...MONSTER_FIELDS.map((f) => `${colName(f)} = ?`), 'updated_at = CURRENT_TIMESTAMP'].join(', ');
    await run(
      c.env.DB,
      `UPDATE monsters SET ${setClause} WHERE id = ?`,
      ...vals,
      (existing as { id: number }).id,
    );
    return { created: false };
  }
  await run(
    c.env.DB,
    `INSERT INTO monsters (${MONSTER_COLS.map(colName).join(', ')})
     VALUES (${MONSTER_COLS.map(() => '?').join(', ')})`,
    ...monsterWriteValues(body, provenance, owner),
  );
  return { created: true };
}

async function upsertGear(
  c: Context<AppBindings>,
  body: Record<string, unknown>,
  provenance: Provenance,
  owner: string | null,
): Promise<{ created: boolean }> {
  const name = String(body.name ?? '').trim();
  if (!name) throw new Error("gear 'name' is required");
  const kind = String(body.kind ?? 'gear');
  if (!['weapon', 'armour', 'gear'].includes(kind)) {
    throw new Error(`gear 'kind' must be one of: weapon, armour, gear`);
  }
  const existing = await findByNaturalKey(c, 'gear', name, provenance, owner, kind);
  if (existing) {
    const vals = gearWriteValues(body, provenance, owner).slice(0, -2);
    await run(
      c.env.DB,
      `UPDATE gear SET
         name=?, kind=?, cost=?, weight=?, type=?, damage=?, properties=?, ac=?,
         strength=?, stealth=?, description=?, updated_at=CURRENT_TIMESTAMP
       WHERE id=?`,
      ...vals,
      (existing as { id: number }).id,
    );
    return { created: false };
  }
  await run(
    c.env.DB,
    `INSERT INTO gear
       (name, kind, cost, weight, type, damage, properties, ac, strength, stealth,
        description, provenance, owner_user_id)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ...gearWriteValues(body, provenance, owner),
  );
  return { created: true };
}

/**
 * Look up an existing row by the natural key:
 *   (name, provenance, owner_user_id)        for spells + monsters
 *   (name, kind, provenance, owner_user_id)  for gear
 *
 * SQLite has no IS NOT DISTINCT FROM, so we explicitly compare NULLs.
 */
async function findByNaturalKey(
  c: Context<AppBindings>,
  table: 'spells' | 'monsters' | 'gear',
  name: string,
  provenance: string,
  owner: string | null,
  kind: string | null,
): Promise<{ id: number } | null> {
  const nullOwnerClause =
    '(owner_user_id = ? OR (owner_user_id IS NULL AND ? IS NULL))';
  const row =
    table === 'gear'
      ? await first<{ id: number }>(
          c.env.DB,
          `SELECT id FROM gear
           WHERE name = ? AND kind = ? AND provenance = ? AND ${nullOwnerClause}`,
          name,
          kind,
          provenance,
          owner,
          owner,
        )
      : await first<{ id: number }>(
          c.env.DB,
          `SELECT id FROM ${table}
           WHERE name = ? AND provenance = ? AND ${nullOwnerClause}`,
          name,
          provenance,
          owner,
          owner,
        );
  return row;
}

// ---- POST /api/v1/import ---------------------------------------------------

importRoutes.post('/', async (c) => {
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  const kind = body?.kind as string | undefined;
  const { provenance, ownerUserId } = userHomebrewContext(
    c,
    body?.provenance,
    body?.owner_user_id,
  );

  if (!KINDS.includes(kind as Kind)) {
    throw badRequest("Request 'kind' must be one of: spell, monster, gear");
  }

  const items = Array.isArray(body?.items) ? (body!.items as unknown[]) : [];
  const result: {
    imported: number;
    updated: number;
    skipped: number;
    errors: { name: string; reason: string }[];
  } = { imported: 0, updated: 0, skipped: 0, errors: [] };

  for (const raw of items) {
    const item = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const itemName = typeof item.name === 'string' ? item.name : '(unnamed)';
    try {
      const r =
        kind === 'spell'
          ? await upsertSpell(c, item, provenance, ownerUserId)
          : kind === 'monster'
            ? await upsertMonster(c, item, provenance, ownerUserId)
            : await upsertGear(c, item, provenance, ownerUserId);
      if (r.created) result.imported++;
      else result.updated++;
    } catch (e) {
      result.errors.push({
        name: itemName,
        reason: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return c.json(result);
});

// ---- GET /api/v1/import/snapshot ------------------------------------------

importRoutes.get('/snapshot', async (c) => {
  const kind = c.req.query('kind');
  const provenance = c.req.query('provenance');
  const userId = c.get('userId');
  if (!userId) throw unauthorized();

  if (!KINDS.includes(kind as Kind)) {
    throw badRequest("Query param 'kind' must be one of: spell, monster, gear");
  }
  // 'provenance' is now informational only — the visibility predicate
  // below is the source of truth. We don't reject non-homebrew values
  // because 'srd' and 'derived' are global; they're included in the
  // snapshot for export round-tripping but still visible to any caller.
  if (provenance && !PROVENANCES.includes(provenance as Provenance)) {
    throw badRequest("Query param 'provenance' must be one of: srd, derived, homebrew");
  }

  // Visibility predicate mirrors monsters/spells/gear list endpoints:
  //   - everything that isn't homebrew (srd, derived) is global
  //   - homebrew rows are visible only to their owner + global (NULL owner)
  const homebrewClause = `provenance <> 'homebrew' OR owner_user_id = ? OR owner_user_id IS NULL`;
  const itemsTable = kind === 'gear' ? 'gear' : kind === 'spell' ? 'spells' : 'monsters';
  const toExport =
    kind === 'spell'
      ? spellToExport
      : kind === 'monster'
        ? monsterToExport
        : gearToExport;

  const rows = await all<Record<string, unknown>>(
    c.env.DB,
    `SELECT * FROM ${itemsTable} WHERE ${homebrewClause} ORDER BY name`,
    userId,
  );
  return c.json({ kind, provenance: provenance ?? null, items: rows.map(toExport) });
});

// Snapshot serializers — strip internal id/timestamps so the result is
// round-trippable (id is null on re-import, timestamps re-set).
function spellToExport(r: Record<string, unknown>) {
  return {
    name: r.name,
    level: r.level,
    school: r.school,
    type: r.type,
    casting_time: r.casting_time,
    range: r.spell_range,
    duration: r.duration,
    ritual: !!r.ritual,
    description: r.description,
    higher_levels: r.higher_levels,
    classes: splitCsv(r.classes as string | null),
    tags: splitCsv(r.tags as string | null),
    components: parseComponents(r.components as string | null),
    provenance: r.provenance,
    owner_user_id: r.owner_user_id ?? null,
  };
}

function monsterToExport(r: Record<string, unknown>) {
  const out: Record<string, unknown> = { name: r.name, provenance: r.provenance, owner_user_id: r.owner_user_id ?? null };
  for (const f of MONSTER_FIELDS) out[f] = r[f];
  return out;
}

function gearToExport(r: Record<string, unknown>) {
  const out: Record<string, unknown> = { name: r.name, provenance: r.provenance, owner_user_id: r.owner_user_id ?? null };
  for (const k of ['kind', 'cost', 'weight', 'type', 'Damage', 'Properties', 'AC', 'Strength', 'Stealth', 'description']) {
    if (r[k] != null) out[k] = r[k];
  }
  return out;
}

export default importRoutes;

// Ports GearController + GearRepository. One table for weapons/armour/gear,
// discriminated by `kind`. Wire format uses PascalCase for the type-specific
// fields (Damage/Properties for weapons; AC/Strength/Stealth for armour);
// those columns are nullable and omitted from the response when null
// (matches @JsonInclude(NON_NULL)).
//   GET /api/v1/gear?kind=weapon  filters by kind.

import { Hono } from 'hono';
import type { Context } from 'hono';
import type { AppBindings } from '../types';
import { all, first, run, str } from '../db';
import { badRequest, conflict, forbidden, mapDbError, notFound } from '../lib/errors';
import { requireAuth } from '../middleware/auth';

const gear = new Hono<AppBindings>();

const KINDS = ['weapon', 'armour', 'gear'];

type GearRow = {
  id: number;
  name: string;
  kind: string;
  cost: string;
  weight: string;
  type: string;
  damage: string | null;
  properties: string | null;
  ac: string | null;
  strength: string | null;
  stealth: string | null;
  description: string | null;
  provenance: string;
  owner_user_id: string | null;
  created_at: string;
  updated_at: string;
};

function toJson(row: GearRow) {
  const out: Record<string, unknown> = {
    id: row.id,
    name: row.name,
    kind: row.kind,
    cost: row.cost,
    weight: row.weight,
    type: row.type,
    Damage: row.damage,
    Properties: row.properties,
    AC: row.ac,
    Strength: row.strength,
    Stealth: row.stealth,
    description: row.description,
    provenance: row.provenance,
    owner_user_id: row.owner_user_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
  for (const k of Object.keys(out)) if (out[k] == null) delete out[k]; // NON_NULL
  return out;
}

function validateKind(kind: unknown): string {
  if (typeof kind !== 'string' || !KINDS.includes(kind)) {
    throw badRequest("Gear 'kind' must be one of: weapon, armour, gear");
  }
  return kind;
}

const orNull = (v: unknown): string | null => (v == null ? null : String(v));

async function loadOwned(c: Context<AppBindings>, id: number) {
  const existing = await first<GearRow>(
    c.env.DB,
    'SELECT id, provenance, owner_user_id FROM gear WHERE id = ?',
    id,
  );
  if (!existing) throw notFound(`Gear ${id} not found`);
  if (existing.provenance !== 'homebrew') throw forbidden('Only homebrew gear can be modified');
  if (existing.owner_user_id !== c.get('userId')) {
    throw forbidden('Only the owner can modify this gear');
  }
  return existing;
}

// Shared writable values (cost/weight/type default to ''; type-specific nullable).
function writeValues(body: Record<string, unknown>, name: string, kind: string) {
  return [
    name,
    kind,
    str(body.cost),
    str(body.weight),
    str(body.type),
    orNull(body.Damage),
    orNull(body.Properties),
    orNull(body.AC),
    orNull(body.Strength),
    orNull(body.Stealth),
    orNull(body.description),
  ];
}

gear.get('/', async (c) => {
  const userId = c.get('userId');
  const kind = c.req.query('kind');
  let rows: GearRow[];
  if (kind) {
    rows = userId
      ? await all<GearRow>(
          c.env.DB,
          "SELECT * FROM gear WHERE kind = ? AND (provenance <> 'homebrew' OR owner_user_id = ?) ORDER BY name",
          kind,
          userId,
        )
      : await all<GearRow>(
          c.env.DB,
          "SELECT * FROM gear WHERE kind = ? AND provenance <> 'homebrew' ORDER BY name",
          kind,
        );
  } else {
    rows = userId
      ? await all<GearRow>(
          c.env.DB,
          "SELECT * FROM gear WHERE provenance <> 'homebrew' OR owner_user_id = ? ORDER BY kind, name",
          userId,
        )
      : await all<GearRow>(
          c.env.DB,
          "SELECT * FROM gear WHERE provenance <> 'homebrew' ORDER BY kind, name",
        );
  }
  return c.json(rows.map(toJson));
});

gear.get('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const row = await first<GearRow>(c.env.DB, 'SELECT * FROM gear WHERE id = ?', id);
  if (!row) throw notFound(`Gear ${id} not found`);
  return c.json(toJson(row));
});

gear.post('/', requireAuth, async (c) => {
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!name) throw badRequest("Gear 'name' is required");
  const kind = validateKind(body?.kind);
  const userId = c.get('userId')!;
  const values = [...writeValues(body!, name, kind), 'homebrew', userId];

  let res: D1Result;
  try {
    res = await run(
      c.env.DB,
      `INSERT INTO gear
         (name, kind, cost, weight, type, damage, properties, ac, strength, stealth,
          description, provenance, owner_user_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      ...values,
    );
  } catch (e) {
    mapDbError(e, () =>
      conflict(`A gear entry named '${name}' (kind=${kind}, provenance=homebrew) already exists`),
    );
  }
  const row = await first<GearRow>(c.env.DB, 'SELECT * FROM gear WHERE id = ?', res!.meta.last_row_id);
  return c.json(toJson(row!), 201);
});

gear.put('/:id', requireAuth, async (c) => {
  const id = Number(c.req.param('id'));
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!name) throw badRequest("Gear 'name' is required");
  const kind = validateKind(body?.kind);
  await loadOwned(c, id);

  const values = [...writeValues(body!, name, kind), id];
  await run(
    c.env.DB,
    `UPDATE gear SET
       name=?, kind=?, cost=?, weight=?, type=?, damage=?, properties=?, ac=?,
       strength=?, stealth=?, description=?, updated_at=CURRENT_TIMESTAMP
     WHERE id=?`,
    ...values,
  );
  const row = await first<GearRow>(c.env.DB, 'SELECT * FROM gear WHERE id = ?', id);
  return c.json(toJson(row!));
});

gear.delete('/:id', requireAuth, async (c) => {
  const id = Number(c.req.param('id'));
  await loadOwned(c, id);
  await run(c.env.DB, 'DELETE FROM gear WHERE id = ?', id);
  return c.body(null, 204);
});

export default gear;

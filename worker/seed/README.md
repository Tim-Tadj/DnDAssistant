# Seeding the D1 database

Generates and applies the bundled content (SRD spells, weapons/armour/gear,
the Monster Manual, plus the SRD class/race reference set) to a D1 database.

## Quick start (local)

```bash
# from the repo root — drops & re-applies migrations to a fresh local D1
cd worker
rm -rf .wrangler                                # wipe any existing local D1
npx wrangler d1 migrations apply dnd-assistant --local
npm run seed:local                              # generates + applies seed.sql
```

After this, `GET /api/v1/monsters` returns 409, `/spells` 396, `/gear` 152,
`/classes` 12, `/races` 9.

## Remote (production)

```bash
cd worker
npx wrangler d1 create dnd-assistant            # one-time; paste id in wrangler.toml
npx wrangler d1 migrations apply dnd-assistant --remote
npm run seed:remote
```

## Idempotency

Every statement is `INSERT INTO … SELECT … WHERE NOT EXISTS (…)` against
the natural key (treating `NULL == NULL` via `IS NULL`). Re-running
`seed:local` or `seed:remote` is a no-op.

## Layout

- `generate.mjs` — reads `src/res/resources/*.json`, writes 5 per-table SQL
  files plus the combined `seed.sql`.
- `apply.mjs` — invokes `wrangler d1 execute --file=…` once per table so
  the whole seed completes quickly under a single wrangler timeout.
- `seed-classes.sql` (12), `seed-races.sql` (9), `seed-spells.sql` (396),
  `seed-gear.sql` (152), `seed-monsters.sql` (409) — generated output.
- `seed.sql` — combined file (inspection only; not used by the seed scripts).

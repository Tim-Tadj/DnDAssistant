# Content Ingestion

How D&D content (SRD, adapted book content, homebrew) gets into the system.
**Status: ✅ implemented (generic pipeline) · content corpora pending.**

## Goal

Take content from a source (the SRD JSON already bundled, a published book the
owner is adapting, or user homebrew) and load it into PostgreSQL in a normalized,
provenance-tagged form, with JSON snapshots kept as seeds/backups.

## Canonical formats

The bundled JSON under [src/res/resources/](../../src/res/resources/) is the
reference shape — new content must match it, because the TypeScript types in
[src/ts/types/](../../src/ts/types/) consume it directly. Notably:

- Monsters: shape of `srd_5e_monsters.json` (now superseded by
  `monster_manual_monsters.json` for the live data set; the SRD file is still
  the shape reference).
- Spells: shape of `srd_5e_spells.json`.
- Gear / weapons / armour: the `custom_*.json` shapes (and the editor
  output, which already emits these shapes).

The creation editors already produce conforming JSON, so editor output and
importer input share one format.

## Pipeline (implemented)

```
source (SRD / book / homebrew)
        │  normalize
        ▼
normalized JSON  (matches src/res shapes + provenance)
        │  POST /api/v1/import
        ▼
PostgreSQL  (provenance + owner recorded; idempotent on natural key)
        │  (optional) export
        ▼
JSON backups in src/res  (preloaded as defaults on a fresh DB)
```

1. **Normalize** — transform a source into the canonical JSON shape. For adapted
   book content this is a transformative step producing only stats and
   descriptions for in-app display. (Out of scope for the generic pipeline —
   the corpus-specific normalizer is per-source.)
2. **Tag provenance** — stamp each record `srd` / `derived` / `homebrew`
   (see [data-model.md](data-model.md)).
3. **Import** — POST a batch to `/api/v1/import`. The backend upserts each item
   by natural key (see "Idempotency" below).
4. **Snapshot** — periodically export the DB back to JSON under `src/res/` so a
   fresh database can be seeded with sensible defaults.

## Importer endpoint

```
POST /api/v1/import
{
  "kind": "spell" | "monster" | "gear",
  "provenance": "srd" | "derived" | "homebrew",
  "owner_user_id": "<nullable>",
  "items": [ { ...spell or monster or gear... }, ... ]
}

→ 200 OK
{
  "imported": <int>,    // rows newly inserted
  "updated":  <int>,    // rows replaced via natural key
  "skipped":  <int>,    // reserved
  "errors":   [{ "name": "...", "reason": "..." }]   // per-item failures
}
```

The endpoint is **open** in Phase 3 (no auth) — same posture as the rest of the
API. Auth lands in Phase 5; when it does, only the owning user can import
homebrew content (the existing `owner_user_id` column already records the
owner on insert).

Per-item exceptions are caught and recorded in `errors[]` so a single bad
item doesn't abort the batch.

## Idempotency

Each item is upserted by its natural key:

- Spells: `(name, provenance, owner_user_id)`
- Monsters: `(name, provenance, owner_user_id)`
- Gear: `(name, kind, provenance, owner_user_id)`

The `owner_user_id` comparison uses `IS NOT DISTINCT FROM` so a NULL owner
matches another NULL owner (i.e. global reference content keyed by `(name,
provenance)` is unique). Re-importing the same file produces `updated` rows
on the second pass, not duplicates.

## CLI driver

A PowerShell script ([scripts/import-content.ps1](../../scripts/import-content.ps1))
drives the endpoint from the shell:

```powershell
.\scripts\import-content.ps1 `
    -Path src\res\resources\srd_5e_armour.json `
    -Kind gear -Provenance derived

.\scripts\import-content.ps1 `
    -Path my-homebrew-monsters.json `
    -Kind monster -Provenance homebrew `
    -OwnerUserId alice

.\scripts\import-content.ps1 -Path draft.json -Kind spell -Provenance derived -Dry
```

The script accepts either a top-level JSON array (the natural shape for files
under `src/res/resources/`) or an object with an `items` property. It prints the
`{imported, updated, errors[]}` summary and exits non-zero on transport
errors.

## Provenance rules

- `srd` and `derived` content is global reference data (no owner).
- `homebrew` content records an owning `userId` (nullable in Phase 3; required
  in Phase 5 when auth lands).
- The importer must set provenance explicitly; never default silently to `srd`.

## Per-resource repositories

`SpellRepository`, `MonsterRepository`, and `GearRepository` each expose:

- `findByNaturalKey(name, provenance, ownerUserId[, kind])` — the lookup used
  by the importer.
- `upsert(domain)` — insert-or-update. Returns `(domain, created)` so the
  controller can report `imported` vs `updated` counts.

## Resolved (was open)

- **Importer form:** both. `POST /api/v1/import` for tooling/UI, and
  `scripts/import-content.ps1` for the dev/CLI workflow.
- **Idempotency key:** natural key per resource (see above). Stable across
  re-imports.
- **Derived-content source files:** kept out of the public repo (e.g. the
  raw Monster Manual pages and copied images). The normalized
  `monster_manual_monsters.json` is the public artifact and lives under
  `src/res/resources/`. See
  [monster-manual-ingestion.md](monster-manual-ingestion.md) for the
  copyright/legal notes.

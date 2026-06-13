# Content Ingestion

How D&D content (SRD, adapted book content, homebrew) gets into the system.
**Status: ⛔ not started** — design target for Phase 3.

## Goal

Take content from a source (the SRD JSON already bundled, a published book the
owner is adapting, or user homebrew) and load it into PostgreSQL in a normalized,
provenance-tagged form, with JSON snapshots kept as seeds/backups.

## Canonical formats

The bundled JSON under [src/res/resources/](../../src/res/resources/) is the
reference shape — new content must match it, because the TypeScript types in
[src/ts/types/](../../src/ts/types/) consume it directly. Notably:

- Monsters: shape of `srd_5e_monsters.json`.
- Spells / gear / weapons / armour: the `custom_*.json` shapes (and the editor
  output, which already emits these shapes).

The creation editors already produce conforming JSON, so editor output and
importer input share one format.

## Pipeline

```
source (SRD / book / homebrew)
        │  normalize
        ▼
normalized JSON  (matches src/res shapes + provenance)
        │  import
        ▼
PostgreSQL  (provenance + owner recorded)
        │  snapshot
        ▼
JSON backups in src/res  (preloaded as defaults on a fresh DB)
```

1. **Normalize** — transform a source into the canonical JSON shape. For adapted
   book content this is a transformative step producing only stats and
   descriptions for in-app display.
2. **Tag provenance** — stamp each record `srd` / `derived` / `homebrew`
   (see [data-model.md](data-model.md)).
3. **Import** — upsert into PostgreSQL via the backend.
4. **Snapshot** — periodically export the DB back to JSON under `src/res/` so a
   fresh database can be seeded with sensible defaults (as noted in the README).

## Provenance rules

- `srd` and `derived` content is global reference data (no owner).
- `homebrew` content records an owning `userId`.
- The importer must set provenance explicitly; never default silently to `srd`.

## Open questions

- Importer form: CLI tool, backend admin endpoint, or both?
- Idempotency / upsert key for re-imports (name + provenance? stable id?).
- Where derived-content source files live (kept out of the public repo vs. in it)
  — to be decided with the owner.

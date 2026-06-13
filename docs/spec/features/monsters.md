# Feature: Monsters

## Current behavior ✅ (browser) / ⛔ (editor)

- Browser: [src/ts/monsters/monster-table.tsx](../../../src/ts/monsters/monster-table.tsx)
  renders an `@mui/x-data-grid` of monsters with `+`-delimited multi-keyword
  search; a row click opens a detail dialog (the stat block).
- Data source: bundled `src/res/resources/srd_5e_monsters.json` (600+ SRD
  monsters), read at build time. `custom_monsters.json` holds homebrew (empty).
- Creation: [src/ts/monsters/create-monster.tsx](../../../src/ts/monsters/create-monster.tsx)
  opens a dialog, but the `MonsterEditor`
  ([monster-editor.tsx](../../../src/ts/monsters/monster-editor.tsx)) is a **stub**
  — no fields implemented.

## Data

Type: [src/ts/types/Monster.ts](../../../src/ts/types/Monster.ts) — see
[../data-model.md](../data-model.md). Free-text stat-block fields plus ability
scores, `Challenge` (CR + XP), and an image URL.

## Target behavior

- Implement the `MonsterEditor` with the full stat-block fields (the largest of
  the editors).
- Persist via `POST /api/v1/monsters`; list via `GET /api/v1/monsters`
  ([../api.md](../api.md)).
- Replace the static-JSON read with an API read.
- Homebrew monsters carry `provenance=homebrew` and an owner.

## Related

The encounter generator consumes monster CR/XP — see
[encounters.md](encounters.md). Numeric CR/XP helper fields (data-model) make
budgeting robust.

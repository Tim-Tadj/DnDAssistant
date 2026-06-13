# Feature: Spells

## Current behavior ✅

- Browser: [src/ts/spells/spell-table.tsx](../../../src/ts/spells/spell-table.tsx)
  — DataGrid with search, pagination, and a detail dialog.
- Creation: [src/ts/spells/create-spell.tsx](../../../src/ts/spells/create-spell.tsx)
  opens a dialog containing
  [spell-editor.tsx](../../../src/ts/spells/spell-editor.tsx), a **complete**
  editor (name, classes multi-select, components, school, range, level, duration,
  casting time, ritual, description, higher levels). It auto-computes `tags`,
  `type`, and the component `raw` string, then emits formatted JSON for review.
- Data source: bundled spell JSON; `custom_spells.json` for homebrew (empty).

## Data

Types: [src/ts/types/Spell.ts](../../../src/ts/types/Spell.ts) (`Spell`,
`SpellComponent`) — see [../data-model.md](../data-model.md).

## Target behavior

Spells are the **Phase 1 vertical slice** because the editor is already done:

1. `GET /api/v1/spells` backs the browser.
2. `POST /api/v1/spells` backs the editor (replacing "emit JSON").
3. Persist to / read from PostgreSQL; model `SpellComponent` as a related table.
4. Homebrew spells carry `provenance=homebrew` and an owner.

Done when a spell created in the UI persists and reloads from the API.

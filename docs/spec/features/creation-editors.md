# Feature: Creation Editors (shared pattern)

The spell, monster, gear, weapon, and armour editors share one pattern. This spec
captures it once so new editors stay consistent.

## Current pattern ✅ (except monster editor ⛔)

1. A `Create X` button toggles a MUI `Dialog` open
   (`useState(false)`) — e.g. [create-spell.tsx](../../../src/ts/spells/create-spell.tsx).
2. The dialog hosts an editor component seeded from a `default*` object
   (`useState(defaultSpell)` etc.).
3. On every field change, the new object is serialized to formatted JSON via
   `useCallback` + `useEffect` and shown in a read-only field, with a note to send
   the JSON to developers for review.

Reference implementations:
- ✅ [spell-editor.tsx](../../../src/ts/spells/spell-editor.tsx) — complete; also
  auto-computes `tags`, `type`, component `raw`.
- ✅ [gear-editor.tsx](../../../src/ts/gear/gear-editor.tsx),
  [weapon-editor.tsx](../../../src/ts/gear/weapon-editor.tsx),
  [armour-editor.tsx](../../../src/ts/gear/armour-editor.tsx).
- ⛔ [monster-editor.tsx](../../../src/ts/monsters/monster-editor.tsx) — stub.

The emitted JSON matches the bundled-resource shapes, so editor output doubles as
importer input ([../content-ingestion.md](../content-ingestion.md)).

## Target pattern (Phase 2)

Replace "emit JSON for review" with real persistence:

- On save, `POST`/`PUT` to the relevant endpoint ([../api.md](../api.md)) instead
  of just showing JSON.
- Stamp `provenance=homebrew` and the owning user.
- Provide edit/delete for existing homebrew records.
- Keep the `default*` seed objects and computed-field logic.

## Guidance for new editors

- Follow the dialog + `default*` + serialize pattern.
- Keep the entity's TypeScript type ([src/ts/types/](../../../src/ts/types/)) as
  the contract; computed fields derive from user input on change.
- Match field naming to the existing JSON shape so output stays importable.

# Feature: Encounters

## Current behavior ✅

Route `encounter` → [src/ts/encounters/encounter-generator.tsx](../../../src/ts/encounters/encounter-generator.tsx).

### Generator
[use-generate-encounter.ts](../../../src/ts/encounters/use-generate-encounter.ts):
1. Filter the monster pool by type, alignment, size, keyword, and XP range.
2. Compute the XP budget from party level + size + difficulty using
   `EXPERIENCE_THRESHOLDS` in [src/ts/constants.ts](../../../src/ts/constants.ts).
3. Add random monsters until the budget is exceeded, applying
   `ENCOUNTER_MULTIPLIERS` (scales XP by group size).

### Combat tracker
[use-track-encounter.ts](../../../src/ts/encounters/use-track-encounter.ts):
tracks each combatant by UUID with initiative (DEX mod + d20), editable per-monster
HP, deletion mid-combat, and pagination. State shape `RemainingMonster`
(`uuid`, `name`, `maxHP`, `hp`, `ac`, `initiative`).

## Data

Consumes monster data (CR/XP) and the constants tables. No persistence — encounter
state is in-memory for the session.

## Target behavior

- Source monsters from the API instead of bundled JSON once the monster endpoint
  exists ([../api.md](../api.md)).
- Robust XP/CR budgeting via numeric helper fields (see [../data-model.md](../data-model.md)).
- (Later) optionally save encounters to a campaign once campaigns are persisted
  ([campaigns.md](campaigns.md), Phase 5).

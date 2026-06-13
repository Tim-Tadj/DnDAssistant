# Feature: Campaigns

## Current behavior ✅ (viewer)

Route `campaign` → [src/ts/campaigns/campaign-manager.tsx](../../../src/ts/campaigns/campaign-manager.tsx).
Provides an interactive world map and a lore viewer for the bundled "Tales of
Avandria" world.

- World data: [src/res/talesOfAvandria/](../../../src/res/talesOfAvandria/) —
  `Avandria.json` (map + location markers) and `AvandriaLore.json` (lore).
- Map: generated via Azgaar's Fantasy Map Generator; markers are pixel
  coordinates from `Avandria.json` read at runtime; city images via Watabou's City
  Generator (see the README *Resources* section).

## Target behavior (Phase 5 — multi-user)

Campaigns become the central, **user-owned** organizing unit:

- A campaign references an owning `userId` ([../data-model.md](../data-model.md)).
- Each user creates and manages their own campaigns (world map, lore, and
  campaign-scoped homebrew content).
- Persisted and served user-scoped via `/api/v1/campaigns`
  ([../api.md](../api.md)); a user sees only their own campaigns.
- Bundled Avandria becomes example/seed data rather than the only campaign.

## Open questions

- How much campaign-scoped content (encounters, NPCs, custom monsters/spells) is
  attached to a campaign vs. the global homebrew pool.
- Map authoring workflow inside the app vs. continuing to import generator output.

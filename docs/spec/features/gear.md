# Feature: Gear (Weapons / Armour / Gear)

## Current behavior ✅

- Browser/shop: [src/ts/gear/gear.tsx](../../../src/ts/gear/gear.tsx) presents
  weapons, armour, and general gear.
- Creation: [src/ts/gear/create-gear.tsx](../../../src/ts/gear/create-gear.tsx)
  offers a type selector (Weapon / Armour / Gear) and shows the matching editor:
  - [weapon-editor.tsx](../../../src/ts/gear/weapon-editor.tsx) — name, damage,
    type, cost, weight, properties, description.
  - [armour-editor.tsx](../../../src/ts/gear/armour-editor.tsx) — name, AC, armour
    type (Light/Medium/Heavy/Shield), strength req, cost, weight, description;
    computes AC by type.
  - [gear-editor.tsx](../../../src/ts/gear/gear-editor.tsx) — name, type, cost,
    weight, description.
  All emit formatted JSON for review.
- Data source: bundled JSON (`custom_weapons.json`, `custom_armour.json`,
  `custom_gear.json`, `homebrew_weapons.json`).

## Data

Types: [src/ts/types/Gear.ts](../../../src/ts/types/Gear.ts) (`Gear`, `Weapon`,
`Armour`) — see [../data-model.md](../data-model.md).

## Target behavior

- Persist via `POST /api/v1/{weapons|armour|gear}`; list via the matching `GET`
  ([../api.md](../api.md)).
- Replace static-JSON reads with API reads.
- Homebrew items carry `provenance=homebrew` and an owner.

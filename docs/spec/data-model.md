# Data Model

Defines the domain entities, their current shapes, the target database schema,
**user ownership**, and the **provenance** convention. The TypeScript types in
[src/ts/types/](../../src/ts/types/) are today's authoritative contract; the
backend schema must converge on them.

## Provenance

Every piece of game content carries a `provenance` indicating its origin:

| Value | Meaning |
| --- | --- |
| `srd` | From the System Reference Document (open content) |
| `derived` | Stats/descriptions adapted from a published book (transformative reuse) |
| `homebrew` | User-created |

Provenance drives filtering, attribution, and what may be shared publicly. It is
the owner's decision how derived content is handled; the model simply records it.

## User ownership

The app is multi-user (roadmap Phase 5). The model is designed for it from the
start:

- A **User** owns **Campaigns** and any **homebrew** content they create.
- `srd` and `derived` reference content is global (not owned); homebrew content
  references an owning `userId`.
- API access is scoped by user (see [api.md](api.md)).

## Entities

### User *(planned)*

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| username | string | unique |
| email | string | unique |
| passwordHash | string | never returned by the API |
| createdAt | timestamp | |

### Monster

Current TS type: [src/ts/types/Monster.ts](../../src/ts/types/Monster.ts).

Fields: `name`, `meta` (e.g. "Large aberration, lawful evil"), `AC`, `HP`,
`Speed`, ability scores `STR/DEX/CON/INT/WIS/CHA` and their `_mod` strings,
optional `Saving_Throws`, `Skills`, `Damage_Vulnerabilities`,
`Damage_Resistances`, `Damage_Immunities`, `Condition_Immunities`, `Senses`,
`Languages`, `Challenge` (e.g. "10 (5,900 XP)"), optional `Traits`, `Actions`,
optional `Reactions`, `Legendary_Actions`, optional `description` (flavor
lore, HTML), optional `Lair_Actions` (HTML), optional `Regional_Effects`
(HTML), `img_url`, and a required `provenance` (one of `srd`, `derived`,
`homebrew`).

The Monster Manual is the current source for stat blocks, flavor, and
lair/regional effects — see
[monster-manual-ingestion.md](monster-manual-ingestion.md) and
[monster-manual-ingestion-notes.md](monster-manual-ingestion-notes.md) for
the ingestion pipeline.  All Monster Manual records are tagged
`provenance: "derived"`.

> Most fields are free-text strings mirroring scraped stat-block data. The target
> schema keeps these as text but adds typed fields where the app needs to compute
> (e.g. numeric CR/XP for encounter budgeting).

### Spell

Current TS type: [src/ts/types/Spell.ts](../../src/ts/types/Spell.ts).

`Spell`: `name`, `level` (`cantrip`, `1`–`9`), `school`, `type`, `casting_time`,
`range`, `duration`, `ritual` (bool), `description`, `higher_levels`,
`classes` (string[]), `tags` (string[]), `components`.

`SpellComponent`: `material` (bool), `materials_needed` (string[]), `raw`,
`somatic` (bool), `verbal` (bool).

### Gear / Weapon / Armour

Current TS types: [src/ts/types/Gear.ts](../../src/ts/types/Gear.ts).

- **Gear:** `name`, `cost`, `weight`, `type`, optional `description`.
- **Weapon:** Gear + `damage` (e.g. "1d4 bludgeoning"), `properties`.
- **Armour:** Gear-ish + `AC` (e.g. "10 + Dex modifier"), `strength`, `stealth`.

### Character, Race, CharacterClass *(planned — Phase 4)*

Not yet modeled. Will back player/non-player characters and richer class/race
rules than the static mechanics pages. To be specified when Phase 4 begins.

### Campaign *(planned — Phase 5)*

Owns world data (currently the bundled Avandria map + lore JSON under
`src/res/talesOfAvandria/`). Will reference an owning `userId` and aggregate
campaign-scoped content.

## Current database schema (as written in DBManager.java)

[src/java/.../DBManager.java](../../src/java/main/java/com/pigishentertainment/dndassistant/DBManager.java)
creates `Monsters`, `Components`, `Spells`, `Armour`, `Weapon`, `Gear` on startup.

> ⚠️ **The current DDL does not run successfully against PostgreSQL.** Known
> problems to fix in Phase 1:
> - `nvarchar` is SQL Server, not Postgres — use `text`/`varchar`.
> - `components Components` references a type that doesn't exist — model spell
>   components as a related table (FK) or columns.
> - `Spells` declares `castingTime` twice.
> - Trailing commas before the closing `)`.
> - `executeQuery` is used for DDL; use `execute`/`executeUpdate`.
> - No primary keys, foreign keys, or `IF NOT EXISTS`.

## Target schema direction

- Proper PK/FK constraints; `IF NOT EXISTS` or managed migrations.
- `provenance` and (for homebrew) `ownerUserId` columns on content tables.
- `spell_components` as a related table keyed to `spells`.
- Numeric helper columns where the app computes (CR/XP).
- Schema managed by migrations, not ad-hoc startup DDL.

The exact column types will be finalized alongside the API contract in
[api.md](api.md) during Phase 1.

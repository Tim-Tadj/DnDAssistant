# Specifications

This directory is the source of truth for DnDAssistant's design: architecture,
data model, the REST API contract, content ingestion, and per-feature behavior.

Keep these documents in sync with the code. When you change behavior, update the
relevant spec in the same change; when you change *plans*, update
[../ROADMAP.md](../ROADMAP.md) and [../PROJECT_STATUS.md](../PROJECT_STATUS.md).

## Index

| Spec | Purpose |
| --- | --- |
| [overview.md](overview.md) | System architecture, current vs. target, routing map |
| [data-model.md](data-model.md) | Entities, DB schema, ownership, provenance |
| [api.md](api.md) | REST endpoint contract, auth, error format |
| [content-ingestion.md](content-ingestion.md) | Book/source → JSON → DB pipeline |
| [features/monsters.md](features/monsters.md) | Monster browser + editor |
| [features/spells.md](features/spells.md) | Spell browser + editor |
| [features/gear.md](features/gear.md) | Gear / weapons / armour |
| [features/encounters.md](features/encounters.md) | Encounter generator + combat tracker |
| [features/campaigns.md](features/campaigns.md) | Campaign map + lore |
| [features/creation-editors.md](features/creation-editors.md) | Shared editor pattern |

## Conventions for these docs

- Each feature spec has **Current behavior** (with file references) and **Target
  behavior** (once persistence/multi-user lands).
- Status notation matches PROJECT_STATUS: ✅ done · 🚧 in progress · ⛔ not started.
- Prefer linking to code (`src/ts/...`) over duplicating it.

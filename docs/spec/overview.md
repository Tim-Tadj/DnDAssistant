# Architecture Overview

## System, current state

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│  React SPA (src/ts)          │        │  Java backend (src/java)     │
│  - MUI components            │        │  - Main.java                 │
│  - Hash routing              │        │  - DBManager (JDBC)          │
│  - Reads bundled JSON ───────┼──┐     │  - prints monsters, exits    │
└─────────────────────────────┘  │     └───────────────┬──────────────┘
                                  │                     │ JDBC (misconfigured)
                       reads at   │                     ▼
                       build time │            ┌──────────────────┐
                                  └──────────► │ src/res/*.json   │
                                               └──────────────────┘
                                               ┌──────────────────┐
                                               │ PostgreSQL (Docker) │  ← not reachable
                                               └──────────────────┘
```

The frontend and backend are **not connected**. The SPA reads bundled JSON from
`src/res/`. The backend can build and start but its JDBC connection points at
Adminer's port and its DDL is invalid (see [../PROJECT_STATUS.md](../PROJECT_STATUS.md)).

## System, target state

```
┌──────────────┐   HTTPS/JSON   ┌──────────────────┐   JDBC   ┌────────────┐
│  React SPA   │ ─────────────► │  REST API (Java) │ ───────► │ PostgreSQL │
│  (browser)   │ ◄───────────── │  user-scoped     │ ◄─────── │            │
└──────────────┘                └──────────────────┘          └────────────┘
        ▲                                ▲
        │ auth token                     │ seed / import
        │                                │
   user sign-in                  content importer (Phase 3)
```

Target: the SPA authenticates, then reads and writes content and campaigns
through a user-scoped REST API persisted in PostgreSQL. Bundled JSON becomes a
seed source rather than the live data source.

## Frontend routing

Hash routes from [src/ts/app-router.tsx](../../src/ts/app-router.tsx), all nested
under `<Header />`:

| Path | Component | Feature |
| --- | --- | --- |
| `` (index) | `Mechanics` | Rules / player guides |
| `monsters` | `MonsterTable` | Monster browser |
| `spells` | `SpellTable` | Spell browser |
| `gear` | `Shop` | Gear / weapons / armour |
| `encounter` | `EncounterGenerate` | Encounter generator + tracker |
| `campaign` | `CampaignManager` | Campaign map + lore |

## Backend package

`com.pigishentertainment.dndassistant` under `src/java` (Maven `sourceDirectory`):
`Main.java` (entry point), `DBManager.java` (connection + table DDL), `classes/`
(Java domain models). The PostgreSQL JDBC driver (42.7.4) is the only dependency.

## Key technical decisions still open

- HTTP framework for the Java service (Spring Boot vs. lightweight) — Phase 1.
- Schema migration tool (e.g. Flyway/Liquibase) vs. hand-rolled — Phase 1.
- Auth mechanism (session vs. token) — Phase 5, but endpoints designed user-aware
  from Phase 1.

These are recorded as they're decided in [api.md](api.md).

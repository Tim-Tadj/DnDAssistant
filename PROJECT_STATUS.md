# Project Status

**Last updated:** 2026-06-14

A living snapshot of what works, what's in progress, and what's outstanding.
Update this file as work lands. For the plan, see [ROADMAP.md](ROADMAP.md).

Legend: ✅ done · 🚧 in progress · ⛔ not started

## Current focus

Phase 0 (Foundation & Docs) is complete. The Monster Manual ingestion
(Phase 3, partial — the monsters portion) is complete on the
`DnDAssistant-MVP-Run` branch. The next milestone is **Phase 1 —
Backend API & Persistence**: making the frontend able to read and write
the PostgreSQL database through a REST API.

## Feature status

### Frontend

| Area | Status | Notes |
| --- | --- | --- |
| Monster browser | ✅ | DataGrid + detail dialog, reads `monster_manual_monsters.json` (409 stat blocks from the Monster Manual, with flavor lore + lair/regional effects) |
| Spell browser | ✅ | DataGrid + detail dialog, pagination |
| Gear / shop | ✅ | Weapons, armour, gear |
| Encounter generator | ✅ | XP-balanced, filters by type/alignment/size; CR/XP parsing verified on the new dataset |
| Combat tracker | ✅ | Initiative, per-monster HP, multi-select |
| Campaign map + lore | ✅ | Interactive Avandria map, lore viewer |
| Mechanics / rules pages | ✅ | Renders bundled rules JSON |
| Spell creation editor | ✅ | Emits JSON for review (not yet persisted) |
| Gear/Weapon/Armour editors | ✅ | Emit JSON for review (not yet persisted) |
| Monster creation editor | ⛔ | Component is a stub (`monster-editor.tsx`) |

### Backend

| Area | Status | Notes |
| --- | --- | --- |
| Maven build | ✅ | Java 11, `mvn clean install` |
| PostgreSQL via Docker | ✅ | `postgres/docker-compose.yml` (Postgres + Adminer) |
| JDBC connection | ⛔ | Connects to `:8080` (Adminer), not Postgres — broken |
| Table creation | 🚧 | Code exists but SQL has dialect bugs; failures swallowed |
| REST API | ⛔ | No HTTP layer / endpoints exist |
| Frontend ↔ DB wiring | ⛔ | Frontend reads static JSON only |
| Auth / multi-user | ⛔ | Planned (Phase 5), designed for from Phase 1 |
| Content importer | 🚧 | Monster Manual portion done (409 monsters, see `docs/spec/monster-manual-ingestion.md`); spells/gear still to come |

## Known issues

- **DB connection misconfigured.** `DBManager.java` uses
  `jdbc:postgresql://localhost:8080/dnd_assistant`, but `:8080` is Adminer and
  Postgres is not published to the host in `docker-compose.yml`.
- **Table-creation SQL is invalid for Postgres.** Uses `nvarchar`, a
  `components Components` column with a non-existent type, a duplicated
  `castingTime` column, trailing commas, and `executeQuery` for DDL. Errors are
  caught and reported as "table already exists".
- **Hardcoded credentials** (`postgres`/`pass`) in `DBManager.java` and
  `docker-compose.yml` — both flagged `TODO: Remove hardcoding`.
- **Old TypeScript** (`^3.4`) pinned against modern React/MUI.
- **Unpinned deps:** several `package.json` entries use `latest` (non-reproducible
  installs).
- **Creation editors don't persist** — they only display generated JSON for manual
  developer review.
- **OCR gaps in Monster Manual dataset:** 7 monsters are missing AC/HP/Speed
  lines because the source book's OCR dropped them — Cyclops, Half-Ogre,
  Specter, Stirge, Treant, Water Weird, Intellect Devourer. They are
  emitted with empty fields and a warning. A handful of monsters (Frog,
  Sea Horse, Shrieker, Winter Wolf) legitimately have no actions section
  in the book. `validate.js` reports these as warnings; the dataset passes
  with 0 errors.

## How to update this file

When you finish a unit of work: flip the relevant status icon, add/remove a known
issue, bump **Last updated**, and add a [CHANGELOG.md](CHANGELOG.md) entry.

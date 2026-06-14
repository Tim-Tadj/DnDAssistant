# Project Status

**Last updated:** 2026-06-14

A living snapshot of what works, what's in progress, and what's outstanding.
Update this file as work lands. For the plan, see [ROADMAP.md](ROADMAP.md).

Legend: ✅ done · 🚧 in progress · ⛔ not started

## Current focus

Phase 1 — Backend API & Persistence is **partially complete**: both
**Spells** and **Monsters** vertical slices work end-to-end. A spell or
monster created in the UI is persisted in Postgres and reloaded from the
API on refresh. The remaining Phase 1 work is the same vertical slice for
Gear/Weapons/Armour, plus tightening the database layer (Flyway, etc.).
Phase 3 (Monster Manual ingestion) is also done — 409 stat blocks shipped
on this branch.

## Feature status

### Frontend

| Area | Status | Notes |
| --- | --- | --- |
| Monster browser | ✅ | DataGrid + detail dialog, pagination, **fetches from `/api/v1/monsters`** (Phase 1 vertical slice; 409 stat blocks seeded from the Monster Manual) |
| Spell browser | ✅ | DataGrid + detail dialog, pagination, **fetches from `/api/v1/spells`** (Phase 1 vertical slice) |
| Gear / shop | ✅ | Weapons, armour, gear (still reads bundled JSON) |
| Encounter generator | ✅ | XP-balanced, filters by type/alignment/size; CR/XP parsing verified on the new dataset |
| Combat tracker | ✅ | Initiative, per-monster HP, multi-select |
| Campaign map + lore | ✅ | Interactive Avandria map, lore viewer |
| Mechanics / rules pages | ✅ | Renders bundled rules JSON |
| Spell creation editor | ✅ | **Posts to `/api/v1/spells` (Phase 1)**; still shows JSON preview alongside |
| Gear/Weapon/Armour editors | 🚧 | Emit JSON for review (still not persisted) |
| Monster creation editor | ⛔ | Component is a stub (`monster-editor.tsx`) |

### Backend

| Area | Status | Notes |
| --- | --- | --- |
| Maven build | ✅ | Java 11, Spring Boot 3.2.5, `mvn clean install` |
| PostgreSQL via Docker | ✅ | `postgres/docker-compose.yml` (Postgres on `55432`, Adminer on `8080`); credentials via env |
| JDBC connection | ✅ | Spring Boot `spring.datasource.*` driven by env vars; defaults to `localhost:55432` |
| Schema management | 🚧 | `schema.sql` runs on startup (`IF NOT EXISTS`); no migration tool yet — Flyway deferred to Phase 6 |
| REST API | 🚧 | **Spells + Monsters complete (list/get/create)**; gear/weapons/armour still not exposed |
| CORS | ✅ | `CorsConfig` allows the dev frontend at `http://localhost:3000` (configurable) |
| Frontend ↔ DB wiring | 🚧 | Spells + Monsters: live. Other features still read bundled JSON. |
| Auth / multi-user | ⛔ | Planned (Phase 5); `owner_user_id` column already on `spells` so the schema doesn't change later |
| Content importer | 🚧 | Monster Manual portion done (409 monsters, see `docs/spec/monster-manual-ingestion.md`); spells are seeded from bundled SRD JSON on backend startup; gear/imports for other content still to come |

## Known issues

- **Port `5432` is occupied on this machine by VS Code**; Postgres is published
  on `55432` instead. Override via `POSTGRES_PORT` and `POSTGRES_URL` env vars.
- **Local dev uses `POSTGRES_HOST_AUTH_METHOD=trust`** in `docker-compose.yml`.
  This is for the dev story only — production must use scram-sha-256 and
  a real password.
- **Old TypeScript** (`^3.4`) pinned against modern React/MUI.
- **Unpinned deps:** several `package.json` entries use `latest` (non-reproducible
  installs).
- **Gear/Weapon/Armour editors don't persist** — they only display generated
  JSON for manual developer review. Same for the monster editor (stub).
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

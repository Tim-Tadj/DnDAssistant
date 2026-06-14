# Project Status

**Last updated:** 2026-06-14

A living snapshot of what works, what's in progress, and what's outstanding.
Update this file as work lands. For the plan, see [ROADMAP.md](ROADMAP.md).

Legend: ✅ done · 🚧 in progress · ⛔ not started

## Current focus

**Phase 1 and Phase 2 are complete.** Spells, Monsters, and
Gear/Weapons/Armour are fully CRUD-able through the UI and backed by
Postgres. SRD/derived rows are read-only; homebrew rows are editable
and deletable with a confirmation dialog. Static JSON is now only a
seed source.

**Phase 3 is the next target.** The Monster Manual is ingested
(409 stat blocks, `provenance='derived'`). Spells and gear still only
have the SRD set; the Player's Handbook ingestion is the next big
content task.

## Feature status

### Frontend

| Area | Status | Notes |
| --- | --- | --- |
| Monster browser | ✅ | DataGrid + detail dialog, pagination, **fetches from `/api/v1/monsters`** (Phase 1 vertical slice; 409 stat blocks seeded from the Monster Manual) |
| Spell browser | ✅ | DataGrid + detail dialog, pagination, **fetches from `/api/v1/spells`** (Phase 1 vertical slice) |
| Gear / shop | ✅ | Weapons, armour, gear; **fetches from `/api/v1/gear`** (Phase 1 vertical slice; 152 rows seeded from SRD + custom). Editor POSTs to the API. |
| Encounter generator | ✅ | XP-balanced, filters by type/alignment/size; **reads monsters from the API** (via `useMonsters` hook) |
| Combat tracker | ✅ | Initiative, per-monster HP, multi-select; **reads monsters from the API** |
| Campaign map + lore | ✅ | Interactive Avandria map, lore viewer |
| Mechanics / rules pages | ✅ | Renders bundled rules JSON |
| Spell creation editor | ✅ | **Posts to `/api/v1/spells`**; still shows JSON preview alongside |
| Gear/Weapon/Armour editors | ✅ | **Post to `/api/v1/gear`**; JSON preview alongside. Per-kind editor (weapon / armour / gear) chosen via the in-dialog picker. |
| Monster creation editor | ✅ | **Posts to `/api/v1/monsters` (Phase 2)**; full form (name, meta, AC, HP, Speed, CR, ability scores + mods, defenses, senses/languages/img_url, traits/actions/reactions/legendary, description/lair/regional). |
| Spell edit / delete UI | ✅ | **Phase 2.** Detail dialog has Edit and Delete buttons (with confirmation). SRD rows are read-only. |
| Monster edit / delete UI | ✅ | **Phase 2.** Detail dialog has Edit (swap to editor) and Delete. SRD rows are read-only. |
| Gear edit / delete UI | ✅ | **Phase 2.** Row-click opens a detail dialog with Edit/Delete. SRD/derived rows are read-only; only homebrew rows expose the buttons. |

### Backend

| Area | Status | Notes |
| --- | --- | --- |
| Maven build | ✅ | Java 11, Spring Boot 3.2.5, `mvn clean install` |
| PostgreSQL via Docker | ✅ | `postgres/docker-compose.yml` (Postgres on `55432`, Adminer on `8080`); credentials via env |
| JDBC connection | ✅ | Spring Boot `spring.datasource.*` driven by env vars; defaults to `localhost:55432`; `DataSourceReadiness` blocks startup until a connection is available (30 × 1s retries) so a slow Postgres boot doesn't kill the JVM |
| Schema management | ✅ | **Flyway 9.x** owns the schema. `V2__add_gear.sql` is the first migration; dev DB baselined at V1 to preserve existing `spells` and `monsters`. `spring.sql.init` disabled. |
| REST API | ✅ | **Spells, Monsters, Gear** all expose `list / get / create / update / delete`. `GET /api/v1/gear?kind=weapon` filters by kind. |
| CORS | ✅ | `CorsConfig` allows the dev frontend at `http://localhost:3000` (configurable) |
| Frontend ↔ DB wiring | ✅ | Spells, Monsters, and Gear all read from the API. Encounter generator and tracker also read from the API. |
| Auth / multi-user | ⛔ | Planned (Phase 5); `owner_user_id` column already on `spells`, `monsters`, and `gear` so the schema doesn't change later |
| Content importer | 🚧 | Monster Manual portion done (409 monsters, see `docs/spec/monster-manual-ingestion.md`); spells seed from bundled SRD JSON on backend startup; gear seeds from SRD + custom; gear/imports for other content still to come |

## Known issues

- **Port `5432` is occupied on this machine by VS Code**; Postgres is published
  on `55432` instead. Override via `POSTGRES_PORT` and `POSTGRES_URL` env vars.
- **Local dev uses `POSTGRES_HOST_AUTH_METHOD=trust`** in `docker-compose.yml`.
  This is for the dev story only — production must use scram-sha-256 and
  a real password.
- **Old TypeScript** (`^3.4`) pinned against modern React/MUI.
- **Unpinned deps:** several `package.json` entries use `latest` (non-reproducible
  installs).
- **Gear/Weapon/Armour editors don't persist** — *resolved by Phase 2;
  editors POST/PUT against the API, deletes go through the table UI
  with a confirmation dialog. The "stub" monster editor is also gone.*
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

# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## How to use this file

Add changes under `[Unreleased]` as you work, grouped by:
**Added**, **Changed**, **Deprecated**, **Removed**, **Fixed**, **Security**.
When you cut a release, rename `[Unreleased]` to the new version with a date and
start a fresh `[Unreleased]` section.

## [Unreleased]

### Added
- Project documentation: `ROADMAP.md`, `PROJECT_STATUS.md`, `AGENTS.md`,
  `CHANGELOG.md`, and a `docs/spec/` specification directory.
- Cross-platform run scripts: `scripts/run-all.ps1` and `scripts/run-all.sh`.
- **Phase 1 — Monsters vertical slice.** The monster browser now talks to
  the backend:
  - **Backend** gained the `monsters` table (`schema.sql`, 36 columns
    mirroring the bundled JSON shape, with `UNIQUE (name, provenance,
    owner_user_id)`), a JdbcTemplate-backed `MonsterRepository`
    (using `NamedParameterJdbcTemplate` to eliminate the
    positional-`?`-bind "No value specified for parameter N" failure
    mode), a `MonsterSeed` that loads 409 stat blocks from
    `monster_manual_monsters.json` on first boot (idempotent — skipped
    when the table already has rows), and a `MonsterController` exposing
    `GET /api/v1/monsters`, `GET /api/v1/monsters/{id}`, and
    `POST /api/v1/monsters` (provenance=homebrew, owner_user_id null for
    now). The Monster domain class maps the PascalCase wire shape (`AC`,
    `HP`, `Speed`, `INT`, `Saving_Throws`, `Legendary_Actions`, …) via
    `@JsonProperty`.
  - **Frontend** has a monsters helper at `src/ts/api/monsters.ts`
    (mirroring `api/spells.ts`). `monster-table.tsx` fetches from
    `/api/v1/monsters` with loading + error states, and the bundled
    JSON import is no longer used by the table or by the Monster type
    (the encounter generator and tracker still read the bundled JSON —
    they will be switched in a follow-up).
  - `scripts/backend-detached.bat` — convenience launcher for dev.
  - **Seed:** 409 monsters load into Postgres on first boot from
    `src/res/resources/monster_manual_monsters.json` with
    `provenance='derived'`.
- **Phase 1 — Spells vertical slice.** The frontend now talks to the
  backend:
  - **Backend** is a Spring Boot 3.2.5 service (`com.pigishentertainment.dndassistant.Application`).
    New `src/main/resources/application.properties` is fully env-driven
    (`SERVER_PORT`, `POSTGRES_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`,
    `FRONTEND_CORS_ORIGINS`). Schema lives in `src/main/resources/schema.sql`
    and runs on startup (`IF NOT EXISTS`). Endpoints:
    - `GET /api/v1/spells` — list (seeded from bundled SRD on first boot)
    - `GET /api/v1/spells/{id}` — fetch one
    - `POST /api/v1/spells` — create (provenance=homebrew, owner_user_id null
      for now; auth lands in Phase 5)
    - `GET /api/v1/health` — liveness check
  - **PostgreSQL** now actually publishes to the host on `:55432`
    (`:5432` is occupied by VS Code's local Postgres on this dev box).
    `POSTGRES_HOST_AUTH_METHOD=trust` for the dev story; externalize via
    env (`POSTGRES_USER`, `POSTGRES_PASSWORD`) before any real deployment.
  - **Frontend** has a small API client at `src/ts/api/api-client.ts` and a
    spells helper at `src/ts/api/spells.ts`. `spell-table.tsx` fetches from
    the API (with loading + error states), and `create-spell.tsx` POSTs
    new spells to the API on Save. The bundle reads
    `REACT_APP_API_BASE` (defaults to `http://localhost:8081/api/v1`).
  - **Seed:** 396 SRD spells load into Postgres on first boot from
    `src/res/resources/srd_5e_spells.json`; the frontend reads them via
    the API instead of importing the JSON.
- **Monster Manual ingestion** (Phase 3, monsters portion):
  - `src/res/resources/monster_manual_monsters.json` — 409 stat blocks
    parsed from the Monster Manual, replacing `srd_5e_monsters.json` as
    the live monster dataset. Each record carries stat-block data, flavor
    lore, lair actions, regional effects, page art (where available), and
    `provenance: "derived"`.
  - `src/ts/types/Monster.ts` — extended with optional `description`,
    `Lair_Actions`, `Regional_Effects` fields, and a required `provenance`
    field. Also adds a `resolveImgUrl()` helper that resolves local
    `monster-manual/...` paths under `process.env.PUBLIC_URL` so images
    work in dev and on GitHub Pages.
  - `src/ts/monsters/monster-card.tsx` — adds `description`, `Lair_Actions`,
    and `Regional_Effects` sections, and uses `resolveImgUrl()` for the
    art.
  - `public/monster-manual/` — 241 page jpegs copied from the source book
    (git-ignored; copyrighted art).
  - `scripts/ingest/` — page index builder, deterministic Markdown
    parser, lore extractor + assembler, batch driver, and validation
    script. See
    [docs/spec/monster-manual-ingestion.md](docs/spec/monster-manual-ingestion.md)
    and
    [docs/spec/monster-manual-ingestion-notes.md](docs/spec/monster-manual-ingestion-notes.md)
    for the full pipeline.
  - `Monster Manual/.page-index.json` and `.ingest-progress.json` — page
    index and resumable progress manifest (both git-ignored).

### Changed
- **`src/ts/monsters/monster-table.tsx`** now fetches from the backend
  API instead of importing the bundled JSON, with loading + error
  states. Search (`+`-delimited) and the detail dialog continue to
  work against the API shape.
- **`src/ts/types/Monster.ts`** no longer imports the bundled JSON; the
  unused `baseMonster` derived type was removed.
- `docs/spec/api.md` — lists the monsters endpoint as currently
  implemented.
- `ROADMAP.md` — Monsters vertical slice ticked off.
- `PROJECT_STATUS.md` — Monster browser + REST API rows updated.
- Rewrote `README.md` as UTF-8 with prerequisites, corrected run instructions,
  a quick-start, and links to the new docs.
- **`src/ts/types/Monster.ts`** default import now points at
  `monster_manual_monsters.json` (was `srd_5e_monsters.json`).
- **`src/ts/monsters/monster-table.tsx`**,
  **`src/ts/encounters/use-generate-encounter.ts`**, and
  **`src/ts/encounters/use-track-encounter.ts`** all now import from
  `monster_manual_monsters.json` instead of the SRD file.
- **`src/ts/types/Spell.ts`** no longer imports the bundled SRD JSON
  directly; the frontend reads spells from the backend API instead.
- `src/ts/app-router.tsx` — fixed pre-existing case-sensitivity issue
  (`./header` → `./Header`) that was breaking the build.
- `docs/spec/data-model.md` — Monster section updated to document the
  new fields and the provenance convention.
- `docs/spec/api.md` — recorded the Spring Boot 3.2.5 decision.
- `postgres/docker-compose.yml` — publishes Postgres on the host, accepts
  env-driven credentials, and uses `POSTGRES_HOST_AUTH_METHOD=trust` for
  the dev story. Default port is `55432` to avoid clashing with VS Code's
  local Postgres.

## [1.0.0] — baseline

Reconstructed from git history to mark the state of the project before the
documentation effort. Dates approximate.

### Added
- React/TypeScript frontend with hash routing: monsters, spells, gear, encounter
  generator, and campaign views.
- Monster, spell, and gear browsers (MUI DataGrid with search and detail dialogs).
- XP-balanced encounter generator and a live combat tracker (initiative,
  per-monster HP, multi-select).
- Interactive campaign map of Avandria with lore viewer.
- Creation editors that emit JSON for review: spells, gear, weapons, armour
  (monster editor stubbed).
- Java/Maven backend skeleton with a PostgreSQL `DBManager` and Docker Compose
  setup (PostgreSQL + Adminer) — initial framework to communicate with the
  database.
- Bundled SRD/D&D resource JSON and rules data under `src/res/`.

[Unreleased]: https://github.com/charteris/DnDAssistant/compare/main...HEAD

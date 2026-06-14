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
- **Phase 3 — Generic content importer.**
  - `POST /api/v1/import` (open admin endpoint) accepts a
    `{kind: spell|monster|gear, provenance: srd|derived|homebrew,
    owner_user_id?, items: [...]}` payload and upserts each item by
    its natural key (`(name, kind?, provenance, owner_user_id)`). The
    response carries a per-item summary:
    `{imported, updated, skipped, errors: [{name, reason}...]}`. Per-item
    failures are caught and recorded; the batch is never aborted by
    a single bad row. Phase 5 auth will close this endpoint; the
    `owner_user_id` column already records the owner.
  - `SpellRepository`, `MonsterRepository`, and `GearRepository` each
    gained a `findByNaturalKey(...)` lookup and an `upsert(...)`
    method that returns `(domain, created)`. `owner_user_id`
    comparison uses `IS NOT DISTINCT FROM` so a NULL owner matches
    another NULL (global reference content keyed by `(name,
    provenance)` is unique).
  - CLI driver at `scripts/import-content.ps1` (PowerShell). Accepts
    either a top-level JSON array or `{items: [...]}`; supports
    `-Dry`, `-OwnerUserId`, and a configurable `-ApiBase`.
  - Sample payload at `scripts/sample-import-spell.json`.
  - `docs/spec/content-ingestion.md` rewritten from "design target"
    to "implemented (generic pipeline) · content corpora pending".
- **Phase 1 — Gear/Weapons/Armour vertical slice.**
- **Phase 1 — Gear/Weapons/Armour vertical slice.** A single `gear`
  table (kind ∈ {weapon, armour, gear}) covers all three; 152 rows
  seed on first boot (37 + 2 + 13 + 0 + 99 + 1 = SRD + custom).
  The frontend `gear.tsx` fetches `/api/v1/gear` (single list,
  client-side `kind` filter) and the `Create Gear` dialog POSTs to the
  API on Save. New files: `src/java/.../domain/Gear.java`,
  `data/GearRepository.java`, `data/GearSeed.java`,
  `web/GearController.java`; `src/ts/api/gear.ts`; updated
  `src/ts/types/Gear.ts` with a unified `GearItem` shape (legacy
  `Weapon`/`Armour`/`Gear` types preserved for the column descriptors
  and editors). Endpoints: `GET /api/v1/gear`,
  `GET /api/v1/gear?kind={weapon|armour|gear}`, `GET /api/v1/gear/{id}`,
  `POST /api/v1/gear`.
- **Phase 3 — Snapshot/backup endpoint.** `GET
  /api/v1/import/snapshot?kind=...&provenance=...` exports the DB in
  the exact shape the importer accepts; re-importing the result of
  a snapshot is a no-op (the importer is idempotent on natural
  key). Closes the snapshot step of the content-ingestion pipeline.
- **Phase 4 — Characters, classes, races (backend + frontend).** V4
  migration adds the classes / races / characters tables (the
  latter with FKs to the first two and to a `users` row); 12 SRD
  classes + 9 SRD races are seeded on first boot via
  `ReferenceDataSeed`. New `DndClass`, `Race`, `Character` domains
  and `*Repository` classes; `ReferenceDataController` exposes
  `GET /api/v1/classes` and `GET /api/v1/races` (public read);
  `CharacterController` exposes the full CRUD for
  `/api/v1/characters` (auth required, owner-scoped). Frontend:
  new `/characters` route with a DataGrid of the signed-in user's
  characters, create/view/edit/delete dialogs, Autocomplete
  pickers for race and class, ability score inputs, HP/AC,
  notes. The Encounter Generator gains a 'Use my party' button
  that, when signed in, fetches the user's characters and
  pre-fills party size + average level.
- **Phase 5 — Multi-user + auth + campaigns.**
  - **V3 migration** adds the `users` table (id UUID, username
    unique, email, password_hash, display_name, timestamps).
  - **V5 migration** adds the `campaigns` table (id UUID, name,
    description, setting, status, notes, owner_user_id,
    timestamps).
  - **Spring Security + JJWT 0.12.6** in a new `security` package:
    `JwtService` (HS256 sign/verify), `JwtAuthFilter`
    (OncePerRequestFilter that reads `Authorization: Bearer
    <jwt>`), `UserAuthentication` (carries the user id through
    the SecurityContext), `CurrentUser` helper, `SecurityConfig`
    (stateless, public reads on the resource browsers, auth
    required for everything else). `AuthController` exposes
    `POST /auth/signup`, `POST /auth/login`, `GET /auth/me`.
    BCrypt-hashed passwords. 24h JWT TTL.
  - **Ownership enforcement.** POST/PUT/DELETE on spells, monsters,
    gear, characters, and campaigns stamp `owner_user_id` from
    the JWT subject. PUT/DELETE require the caller to be the
    owner AND the row to be `homebrew` provenance. SRD and
    derived rows remain read-only. GET filters homebrew rows to
    the calling user; SRD/derived remain visible to everyone.
    Verified end-to-end: anon GET sees 396 spells, alice sees
    397 (her homebrew + global SRD), bob sees 396 only. Anon
    POST/PUT/DELETE returns 403. Cross-user PUT/DELETE returns
    400. SRD PUT returns 400.
  - **Frontend** `auth/` package: `AuthContext` (token + user
    state, localStorage persistence), `AuthDialog` (sign in /
    sign up tabs), `useAuth` hook. `api-client` adds
    `Authorization: Bearer <token>` when a token is present.
    `Header` shows the signed-in user with a Sign out button;
    otherwise a Sign in button. The `/campaigns` route now
    hosts a 'My Campaigns' panel below the Tales of Avandria
    reference (lore/map tabs), with full CRUD and a Sign in
    to manage gating.
- **Phase 6 — Polish.**
  - **V1 migration** (`V1__init_spells_monsters.sql`) introduces
    the pre-Flyway schema (spells, monsters) as a real migration
    so a fresh database has the full table set. The dev DB was
    baselined at V1; the migration is a no-op there but creates
    the full schema on a clean DB.
  - **Backend test suite**: 13 Spring Boot integration tests in
    `src/test/java/.../ApiSmokeTest` covering health, public
    reads, signup/login, ownership enforcement, idempotent
    import, and snapshot export. Runs against a dedicated
    `dnd_assistant_test` Postgres database. All 13 pass.
  - **Dependency hygiene**: 10 `latest` deps pinned to their
    lockfile-resolved versions; TypeScript upgraded from
    `^3.4.0` to `4.9.5` (the 3.x pin predated React 18 + MUI 5).
    Verified with `tsc --noEmit` and `react-scripts build`.
  - **Docker**: multi-stage `Dockerfile` produces a Spring Boot
    image. `postgres/docker-compose.yml` brings up
    `postgres + adminer + backend` together. `scripts/run-all.ps1`
    honours `USE_DOCKER_BACKEND=false` to run the backend as a
    local jar instead.
- **Flyway 9.22** now owns the schema. The legacy `schema.sql` was
  removed; `V2__add_gear.sql` is the first real migration. The dev DB
  was baselined at V1 (Spring Boot `baseline-version=1`,
  `baseline-on-migrate=true`) so the existing `spells` and `monsters`
  tables were preserved. `spring.sql.init.mode=never` so SQL init
  scripts no longer fight Flyway.
- **DataSourceReadiness** — a `BeanPostProcessor` at
  `HIGHEST_PRECEDENCE` that blocks the application context from
  starting until `DataSource.getConnection()` succeeds. 30 attempts ×
  1s backoff. Replaces the previous behavior of exiting the JVM on
  first connection failure.
- **Phase 1 — Monsters vertical slice.** The monster browser now talks to
  the backend:
  - **Backend** gained the `monsters` table (Flyway-equivalent CREATE
    TABLE, 36 columns mirroring the bundled JSON shape, with
    `UNIQUE (name, provenance, owner_user_id)`), a
    JdbcTemplate-backed `MonsterRepository` (using
    `NamedParameterJdbcTemplate` to eliminate the positional-`?`-bind
    "No value specified for parameter N" failure mode), a `MonsterSeed`
    that loads 409 stat blocks from `monster_manual_monsters.json` on
    first boot (idempotent — skipped when the table already has rows),
    and a `MonsterController` exposing `GET /api/v1/monsters`,
    `GET /api/v1/monsters/{id}`, and `POST /api/v1/monsters`
    (provenance=homebrew, owner_user_id null for now). The Monster
    domain class maps the PascalCase wire shape (`AC`, `HP`, `Speed`,
    `INT`, `Saving_Throws`, `Legendary_Actions`, …) via
    `@JsonProperty`.
  - **Frontend** has a monsters helper at `src/ts/api/monsters.ts`
    (mirroring `api/spells.ts`). `monster-table.tsx` fetches from
    `/api/v1/monsters` with loading + error states, and the bundled
    JSON import is no longer used by the table or by the Monster type
    (the encounter generator and tracker were switched to the API in
    Phase 2).
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
- **Phase 2 — Edit/Delete UI in every table.** The detail dialog of
  each browser (spells, monsters, gear) now exposes Edit and Delete
  buttons with a confirmation dialog. Edit swaps the body to the
  editor (seeded with the current record via a new `initial?` prop on
  `SpellEditor` / `MonsterEditor`); Save calls the corresponding
  `update(id, body)` API method and refreshes the table. Delete shows
  a confirmation dialog and calls `delete(id)`. SRD/derived rows
  are read-only by design — only `homebrew` rows expose the buttons.
  `Monster` and `Spell` TypeScript types gained optional `id?` and
  `provenance?` fields so the UI can drive the provenance check.
- **Phase 2 — Monster editor implemented.** The previously-stub
  `src/ts/monsters/monster-editor.tsx` is now a full form covering
  basic stats (name, meta, AC, HP, Speed, Challenge), the six ability
  scores with mods, defenses (saving throws, skills, damage
  vulnerabilities/resistances/immunities, condition immunities),
  senses/languages/img_url, traits/actions/reactions/legendary actions
  (HTML allowed, matching the rest of the monster data), and
  description/lair/regional effects. `create-monster.tsx` POSTs to
  `/api/v1/monsters` on Save (with toast on success, error banner on
  failure) and refreshes the table via an `onCreated` callback.
- **Phase 2 — PUT/DELETE on the API.** Spells, Monsters, and Gear
  controllers all expose `PUT /api/v1/{resource}/{id}` and
  `DELETE /api/v1/{resource}/{id}`. Frontend API helpers
  (`spellsApi.update/delete`, `monstersApi.update/delete`,
  `gearApi.update/delete`) are wired and used by the table UIs (see
  the Edit/Delete UI bullet above).
- **Phase 2 — Encounter hooks read from the API.**
  `use-generate-encounter.ts` and `use-track-encounter.ts` no longer
  import the bundled `monster_manual_monsters.json`; they share a new
  `src/ts/encounters/use-monsters.ts` hook that calls
  `monstersApi.list()`. The encounter generator's Challenge-parsing
  logic continues to work because the API shape matches the bundled
  JSON.
- **`src/ts/monsters/monster-table.tsx`** now fetches from the backend
  API instead of importing the bundled JSON, with loading + error
  states. Search (`+`-delimited) and the detail dialog continue to
  work against the API shape.
- **`src/ts/types/Monster.ts`** no longer imports the bundled JSON; the
  unused `baseMonster` derived type was removed.
- `docs/spec/api.md` — lists the monsters, gear, and CRUD endpoints as
  currently implemented.
- `ROADMAP.md` — Phase 1 and Phase 2 both marked complete.
- `PROJECT_STATUS.md` — Backend / frontend / wiring tables all updated
  to reflect the new state (Gear/Combat/Encounter rows, schema
  management, REST API row, Edit/Delete UI rows, etc.).
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

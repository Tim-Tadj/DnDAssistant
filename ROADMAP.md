# Roadmap

Where DnDAssistant is going and in what order. Phases are sequential but tasks
within a phase can overlap. The current position is marked **← we are here**.

**Vision:** a live, multi-user web app where a Dungeon Master browses and creates
D&D 5e content (monsters, spells, gear), persists it to a database, and manages
per-user campaigns — replacing today's read-only bundled-JSON experience.

For current detailed status see [PROJECT_STATUS.md](PROJECT_STATUS.md); for design
detail see [docs/spec/](docs/spec/).

---

## Phase 0 — Foundation & Docs

Establish the scaffolding to drive the project to completion.

- [x] Roadmap, project status, agents guide, changelog.
- [x] Specification directory (`docs/spec/`).
- [x] Rewrite README (UTF-8) + cross-platform run scripts.

**Done when:** a new contributor can understand the project, run it, and see the
plan from the docs alone.

## Phase 1 — Backend API & Persistence *(core epic)*

Close the biggest gap: the frontend cannot talk to the database.

- [x] Choose an HTTP layer for the Java service — **Spring Boot 3.2.5** (see
      [docs/spec/api.md](docs/spec/api.md)).
- [x] Fix the database connection: publish PostgreSQL to the host in
      `postgres/docker-compose.yml` and point the backend at the correct port
      (`:55432` to avoid clashing with VS Code's local Postgres on this dev box).
- [x] Fix the table-creation SQL (Postgres dialect) and replace ad-hoc startup
      DDL with a single `schema.sql` (`IF NOT EXISTS` everywhere).
- [x] Externalize DB configuration / credentials (env vars), remove hardcoding
      from both the Java code and the compose file.
- [x] Define REST endpoints per the API spec for the resource types; designed
      **user-aware** from the start (`owner_user_id` column on `spells` and
      `monsters`).
- [x] Enable CORS for the dev frontend (`CorsConfig`, configurable origins).
- [x] **Vertical slice — Spells:** wire the spell browser and creation editor
      to `/api/v1/spells` (list + get + create). Bundle a seed of 396 SRD
      spells so the browser has data on first start.
- [x] **Vertical slice — Monsters:** wire the monster browser to
      `/api/v1/monsters` (list + get + create). Seed from
      `monster_manual_monsters.json` (409 stat blocks, `provenance=derived`)
      on first boot. The monster creation editor is still a stub.
- [x] **Vertical slice — Gear/Weapons/Armour:** single `gear` table with a
      `kind` column covering weapons, armour, and gear. 152 rows seeded
      (37 + 2 + 13 + 0 + 99 + 1 = SRD + custom). Frontend table rewritten
      to fetch from `/api/v1/gear` (single list, client-side `kind` filter
      for the existing Weapons / Armour / Gear tabs). Create-gear POSTs
      via the new editor flow.
- [x] Adopt Flyway (or Liquibase) for schema migrations. V1 (initial
      schema) + V2 (gear) + V3 (users) + V4 (characters/classes/races) +
      V5 (campaigns). The dev DB was baselined at V1 before V1__init.sql
      existed; the migration is a no-op there but creates the full
      schema on a fresh DB.
- [x] Backend doesn't fail-fast on a slow DB. `DataSourceReadiness`
      (a `BeanPostProcessor` at `HIGHEST_PRECEDENCE`) blocks startup
      until `DataSource.getConnection()` succeeds, retrying up to 30
      times with 1s backoff. Lets the backend start in environments
      where Postgres is still booting.

**Done when:** a spell, monster, and piece of gear created in the UI are
all persisted in Postgres and reloaded from the API on refresh.

## Phase 2 — Editors → Persistence

Turn the JSON-emitting creation editors into real CRUD.

- [x] Implement the stubbed **Monster editor**
      (`src/ts/monsters/monster-editor.tsx`) — full form covering
      name/meta/AC/HP/Speed/CR, the six ability scores with mods,
      defenses (saves/skills/damage types/condition immunities),
      senses/languages/img_url, traits/actions/reactions/legendary
      actions, and description/lair/regional. POSTs to `/api/v1/monsters`.
- [x] **CRUD on the API:** `PUT /api/v1/{spells,monsters,gear}/{id}` and
      `DELETE /api/v1/{spells,monsters,gear}/{id}` are implemented and
      verified by smoke-test.
- [x] **Edit/Delete UI in the tables.** Each browser's detail dialog
      now has Edit (swaps the body to the editor, populated with the
      current record) and Delete (with a confirmation dialog). The
      SRD/derived provenance is read-only by design — only `homebrew`
      rows expose Edit/Delete. Spells, monsters, and gear all wired.
- [x] **All static-JSON reads replaced:** `monster-table.tsx`,
      `use-generate-encounter.ts`, and `use-track-encounter.ts` now
      fetch from `/api/v1/monsters` (via a shared `useMonsters` hook in
      the encounter flow). `Monster.ts` no longer imports the bundled
      JSON. `gear.tsx` reads from `/api/v1/gear`. Static JSON files
      remain only as seed sources.

**Done when:** monsters, spells and gear are fully CRUD-able through the UI and
backed by the database; static JSON is only a seed source.

## Phase 3 — Content Ingestion

Get real book content into the system.

- [x] Define the canonical JSON formats (match existing `srd_5e_monsters.json`
      shapes) — see [docs/spec/content-ingestion.md](docs/spec/content-ingestion.md).
- [x] **Monsters:** ingest the Monster Manual into
      `src/res/resources/monster_manual_monsters.json` (409 stat blocks,
      with flavor lore + lair/regional effects + page art, tagged
      `provenance: "derived"`). See
      [docs/spec/monster-manual-ingestion.md](docs/spec/monster-manual-ingestion.md).
- [x] Add a `provenance` field (SRD / derived / homebrew) to ingested content.
- [x] **Generic importer infrastructure.** `POST /api/v1/import` accepts
      a `{kind, provenance, items[]}` payload, upserts each item by
      natural key `(name, kind?, provenance, owner_user_id)`, and
      returns a per-item `{imported, updated, errors[]}` summary.
      Per-resource `upsert(...)` and `findByNaturalKey(...)` methods
      on the three repositories. CLI driver at
      `scripts/import-content.ps1` (PowerShell). Verified end-to-end
      with smoke tests: a 1-item payload imports (1) then re-imports
      as an update (1) — idempotent. Spec updated in
      [content-ingestion.md](docs/spec/content-ingestion.md).
- [x] **Snapshot/backup endpoint.** `GET /api/v1/import/snapshot?kind=...&provenance=...`
      exports the DB in the exact shape the importer accepts. Closes
      the snapshot step of the content-ingestion pipeline.
- [ ] Spells: ingest the Player's Handbook (or equivalent) into the spell dataset.
- [ ] Gear: ingest the Player's Handbook equipment into the gear dataset.
- [ ] Build a corpus-specific normalizer for the PHB (the generic importer
      is in place; the normalizer is the missing piece for any new source).

**Done when:** a curated content set loads into a fresh database via the importer,
with provenance recorded. (Monsters done; spells and gear pending corpus +
normalizer. The infrastructure is in place to slot them in when source is
available.)

## Phase 4 — Characters, Classes, Races *(in progress)*

Extend the domain beyond bestiary/spell reference.

- [x] Data model for characters (id UUID, name, race_id, class_id, level,
      alignment, background, ability scores, hp_max, ac, notes,
      owner_user_id, timestamps). FKs to classes/races.
- [x] Class and race entities (12 SRD classes + 9 SRD races seeded
      on first boot via `ReferenceDataSeed`).
- [x] REST endpoints: `GET/POST/PUT/DELETE /api/v1/characters` (auth
      required, owner-scoped); `GET /api/v1/classes` and
      `GET /api/v1/races` (public read).
- [x] Frontend `/characters` page: DataGrid of the signed-in user's
      characters with create/view/edit/delete dialogs. Race and Class
      pickers are Autocompletes populated from the reference API.
- [x] Tie characters into encounters: the Encounter Generator gains
      a 'Use my party' button that, when signed in, fetches the
      user's characters and pre-fills party size + average level.

**Done when:** a DM can create and store characters with class/race data
and see them factor into encounter generation.

## Phase 5 — Multi-user & Campaigns *(in progress)*

Make it genuinely multi-user — a committed requirement, so the API and data model
in Phases 1–2 are designed user-aware up front.

- [x] Authentication: signup / login / me, BCrypt-hashed passwords, JWT
      (HS256, 24h TTL). `JwtService`, `JwtAuthFilter`, `UserAuthentication`,
      `CurrentUser`, `SecurityConfig`. Authenticated routes:
      POST/PUT/DELETE on spells/monsters/gear/characters/campaigns.
- [x] Per-user ownership: every writable row carries `owner_user_id`
      (TEXT). Repositories expose `findByNaturalKey` and `upsert` for
      the import pipeline; controllers call `findVisibleTo(userId)`
      on read so SRD/derived rows remain global and homebrew rows
      are visible only to their owner.
- [x] Each user creates and manages their own campaigns: V5
      migration + `CampaignController` (CRUD scoped to owner).
- [x] Access control enforced on every writable endpoint (403 on
      no-token POST/PUT/DELETE; 400 on cross-user update; 400 on
      SRD/derived write attempts).
- [x] Frontend `AuthContext` + `AuthDialog`; `api-client` adds
      `Authorization: Bearer <token>` when a token is in localStorage.
      Header shows the signed-in user with a Sign out button.
- [ ] Fine-grained role-based access (admin role, banned users, etc.) —
      the broader auth model lands in a future phase.

**Done when:** two users can sign in independently and each sees only their own
campaigns and homebrew content.

## Phase 6 — Polish & Ship *(in progress)* ← we are here

- [x] Error handling and input validation across the API
      (`GlobalExceptionHandler`, per-endpoint argument checks; UI
      surfaces server errors via `Alert`).
- [x] Backend test coverage: 13 Spring Boot integration tests in
      `ApiSmokeTest` covering public reads, auth flows, ownership
      enforcement, idempotent import, and snapshot export. All pass
      with `mvnw.cmd test` against a dedicated `dnd_assistant_test`
      Postgres database.
- [x] Dependency hygiene: 10 `latest` deps pinned to their
      lockfile-resolved versions; TypeScript upgraded from `^3.4.0`
      to `4.9.5` (the 3.x pin predated React 18 and MUI 5). Verified
      with `tsc --noEmit` and `react-scripts build`.
- [x] Full-stack deployment story: multi-stage `Dockerfile` produces
      a Spring Boot image; `postgres/docker-compose.yml` brings up
      `postgres + adminer + backend` together. `scripts/run-all.ps1`
      honours `USE_DOCKER_BACKEND=false` to run the backend as a
      local jar instead.
- [ ] Frontend test coverage (Jest + React Testing Library) — the
      test scaffold is in place via CRA's `react-scripts test` but
      the suite is currently empty. A follow-up session can add
      component tests for the auth flow and the Edit/Delete dialogs.

**Done when:** the full stack deploys reproducibly and is usable in a real session.

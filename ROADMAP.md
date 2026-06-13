# Roadmap

Where DnDAssistant is going and in what order. Phases are sequential but tasks
within a phase can overlap. The current position is marked **← we are here**.

**Vision:** a live, multi-user web app where a Dungeon Master browses and creates
D&D 5e content (monsters, spells, gear), persists it to a database, and manages
per-user campaigns — replacing today's read-only bundled-JSON experience.

For current detailed status see [PROJECT_STATUS.md](PROJECT_STATUS.md); for design
detail see [docs/spec/](docs/spec/).

---

## Phase 0 — Foundation & Docs ← we are here

Establish the scaffolding to drive the project to completion.

- [x] Roadmap, project status, agents guide, changelog.
- [x] Specification directory (`docs/spec/`).
- [x] Rewrite README (UTF-8) + cross-platform run scripts.

**Done when:** a new contributor can understand the project, run it, and see the
plan from the docs alone.

## Phase 1 — Backend API & Persistence *(core epic)*

Close the biggest gap: the frontend cannot talk to the database.

- [ ] Choose an HTTP layer for the Java service (e.g. Spring Boot or a
      lightweight embedded server) — record the decision in
      [docs/spec/api.md](docs/spec/api.md).
- [ ] Fix the database connection: publish PostgreSQL to the host in
      `postgres/docker-compose.yml` and point `DBManager` at the correct port.
- [ ] Fix the table-creation SQL (Postgres dialect) and introduce schema
      migrations instead of `CREATE TABLE` on startup.
- [ ] Externalize DB configuration / credentials (env vars), remove hardcoding.
- [ ] Define REST endpoints (`/api/spells`, `/api/monsters`, `/api/gear`, …) per
      the API spec, designed **user-aware** from the start (see Phase 5).
- [ ] Enable CORS for the dev frontend.
- [ ] **Vertical slice:** wire **Spells** end-to-end (list + create) from the UI
      to Postgres as the reference implementation.

**Done when:** a spell created in the UI is persisted in Postgres and reloaded
from the API on refresh.

## Phase 2 — Editors → Persistence

Turn the JSON-emitting creation editors into real CRUD.

- [ ] Implement the stubbed **Monster editor** (`src/ts/monsters/monster-editor.tsx`).
- [ ] Switch all editors from "emit JSON for review" to POST/PUT against the API.
- [ ] Add read / list / update / delete for monsters, spells, gear.
- [ ] Replace static-JSON reads with API reads, feature by feature.

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
- [ ] Spells: ingest the Player's Handbook (or equivalent) into the spell dataset.
- [ ] Gear: ingest the Player's Handbook equipment into the gear dataset.
- [ ] Build a generic importer: book/source → normalized JSON → DB.
- [ ] Establish a seed/backup strategy (JSON snapshots preloaded as defaults).

**Done when:** a curated content set loads into a fresh database via the importer,
with provenance recorded. (Monsters done; spells and gear still to come.)

## Phase 4 — Characters, Classes, Races

Extend the domain beyond bestiary/spell reference.

- [ ] Data model + UI for player/non-player characters.
- [ ] Class and race entities backing richer rules than the static mechanics pages.
- [ ] Tie characters into encounters (party composition) where useful.

**Done when:** a DM can create and store characters with class/race data.

## Phase 5 — Multi-user & Campaigns

Make it genuinely multi-user — a committed requirement, so the API and data model
in Phases 1–2 are designed user-aware up front.

- [ ] Authentication and user accounts.
- [ ] Per-user ownership: campaigns and created content reference an owning user.
- [ ] Each user creates and manages their own campaigns and homebrew content.
- [ ] Access control enforced on every API endpoint.

**Done when:** two users can sign in independently and each sees only their own
campaigns and homebrew content.

## Phase 6 — Polish & Ship

- [ ] Error handling and input validation across UI and API.
- [ ] Test coverage (frontend + backend).
- [ ] Full-stack deployment story (today only the frontend ships to GitHub Pages).
- [ ] Dependency hygiene: pin `latest` deps, upgrade `typescript ^3.4`.

**Done when:** the full stack deploys reproducibly and is usable in a real session.

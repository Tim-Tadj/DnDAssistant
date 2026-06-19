# Roadmap

Where DnDAssistant has been and where it goes next. Phases 0–6 are
**shipped** (the Cloudflare stack is live on a fresh Cloudflare account
as of 2026-06-19). Phase 7 is the next round of polish.

For current detailed status see [PROJECT_STATUS.md](PROJECT_STATUS.md);
for architecture see [CLOUDFLARE-IMPLEMENTATION.md](CLOUDFLARE-IMPLEMENTATION.md);
for the deploy workflow see [CLOUDFLARE-RUNBOOK.md](CLOUDFLARE-RUNBOOK.md).

**Vision:** a live, multi-user web app where a Dungeon Master browses and
creates D&D 5e content (monsters, spells, gear), persists it to a
database, and manages per-user campaigns. **Achieved** — every user
gets their own content + campaigns, all backed by Cloudflare D1 and
served by a single Hono Worker.

---

## Phase 0 — Foundation & Docs *(shipped)*

Establish the scaffolding to drive the project to completion.

- [x] Roadmap, project status, agents guide, changelog.
- [x] Specification directory (`docs/spec/`).
- [x] Cross-platform run scripts.

## Phase 1 — Backend API & Persistence *(shipped)*

The full Spring Boot + Postgres backend was ported to a Cloudflare
Worker + D1 stack:

- [x] Hono 4.x + TypeScript 5 + Cloudflare D1 (SQLite).
- [x] Consolidated D1 schema (`worker/migrations/0001_initial.sql`) replacing
      the 14 Flyway migrations.
- [x] All REST endpoints (`/api/v1/*`) for auth, monsters, spells, gear,
      characters, character-state, campaigns, parties, sessions, npcs,
      campaign-npcs, campaign-characters, campaign-parties, encounter-saves.
- [x] Reference data: `GET /api/v1/classes`, `/api/v1/races`.
- [x] Bulk import + snapshot: `POST /api/v1/import`, `GET /api/v1/import/snapshot`.
- [x] Health: `GET /api/v1/health`.
- [x] CORS for the dev frontend + Pages origin.
- [x] `attachUser` + `requireAuth` middleware, JWT (HS256, 24h TTL).

## Phase 2 — Editors → Persistence *(shipped)*

- [x] Monster, spell, and gear editors POST/PUT/DELETE against the API.
- [x] Detail dialogs on every browser have Edit + Delete buttons; SRD/derived
      rows are read-only by design — only homebrew rows expose the buttons.
- [x] All static-JSON reads replaced — `monster-table.tsx`,
      `use-generate-encounter.ts`, `use-track-encounter.ts`, and `gear.tsx`
      fetch from the API. Bundled JSON remains only as a seed source.

## Phase 3 — Content Ingestion *(shipped)*

- [x] Generic import pipeline (`POST /api/v1/import`) upserts by natural key
      `(name, kind?, provenance, owner_user_id)` with per-item error
      isolation.
- [x] Snapshot endpoint (`GET /api/v1/import/snapshot`) exports in the
      same shape; re-importing a snapshot is a no-op.
- [x] Monster Manual ingested (409 stat blocks, `provenance='derived'`).
- [ ] **Spells:** PHB (or equivalent) — pending a curated corpus +
      normalizer. The generic importer is ready for it.
- [ ] **Gear:** PHB equipment — same blocker as spells.
- [ ] **PHB normalizer** — script that turns raw book text into the
      JSON shapes the generic importer expects.

## Phase 4 — Characters, Classes, Races *(shipped)*

- [x] Data model for characters (UUID PK, race_id/class_id FKs, ability
      scores, hp_max, ac, notes, owner_user_id, timestamps).
- [x] 12 SRD classes + 9 SRD races seeded on first boot.
- [x] `GET/POST/PUT/DELETE /api/v1/characters` (auth, owner-scoped).
- [x] Frontend `/characters` page: DataGrid + create/view/edit/delete
      dialogs; race + class Autocompletes.
- [x] Encounter Generator "Use my party" button pulls the user's
      characters to pre-fill party size + average level.

## Phase 5 — Multi-user & Campaigns *(shipped)*

- [x] Auth: signup / login / me, PBKDF2-hashed passwords (WebCrypto),
      JWT (HS256, 24h TTL) via `hono/jwt`. Authenticated routes on
      every writable endpoint.
- [x] `owner_user_id` on every writable row; SRD/derived global,
      homebrew visible only to owner (+ NULL-owner global homebrew
      from seeded `custom_*.json`).
- [x] Campaigns + per-campaign tables: sessions, NPCs (globalized
      in V14), per-campaign character overrides, per-campaign
      party junctions.
- [x] `AuthContext` (frontend) uses the shared `api` client — Bearer
      header auto-added, `{error:{code,message}}` parsed.
- [ ] Fine-grained role-based access (admin role, banned users,
      etc.) — defer until needed.

## Phase 6 — Cloudflare Migration + Polish *(shipped)*

- [x] Worker scaffold + auth + monsters + spells + gear + classes +
      races + characters + character-state + campaigns + parties +
      sessions + npcs + campaign-npcs + campaign-characters +
      campaign-parties + encounter-saves + import + reference. Verified
      end-to-end via `wrangler dev` (see
      [CLOUDFLARE-RUNBOOK.md](CLOUDFLARE-RUNBOOK.md)).
- [x] Cloudflare Pages deploy of the React SPA (SHA `Avandria.png`
      compressed to JPEG to fit the 25 MiB per-file limit).
- [x] Idempotent seed pipeline (5 per-table SQL files, all `INSERT
      … WHERE NOT EXISTS`).
- [x] `scripts/deploy.mjs` — one-shot end-to-end deploy script:
      `wrangler login` → `d1 create` → patch `wrangler.toml` → migrate
      → seed → secret → deploy.
- [x] Wrangler upgraded from v3.95 to v4.102 (v3 silently dropped
      freshly-set secrets from subsequent deploys; v4 fixed it).
- [x] Dependency hygiene: TypeScript `^3.4` → `^4.9.5`, `latest`
      pins resolved to lockfile versions.
- [x] Java backend archived to branch `archive/spring-boot-backend`
      (preserves history; main branch is Cloudflare-only).
- [ ] **Frontend Jest/RTL test coverage** — test scaffold via CRA
      is in place but the suite is empty. Follow-up.

## Phase 7 — Next *(not started)*

What we'd add next, roughly in order:

- [ ] **Frontend test coverage** — auth flow, EntityBrowser
      list/detail/edit/delete, monster stat pane. Pick a few high-
      value components and write RTL tests against a mocked api
      client.
- [ ] **Worker test coverage** — `wrangler dev` + curl smoke covered
      the migration. Port the 13 ApiSmokeTest cases from
      `archive/spring-boot-backend/src/test/` to a Vitest or
      `@cloudflare/vitest-pool-workers` setup.
- [ ] **Custom domain + same-origin routing** — point a real
      domain at Pages, add a Worker route `yourdomain.com/api/v1/*`,
      set `REACT_APP_API_BASE=/api/v1`, drop the CORS allow-list.
      See [CLOUDFLARE-IMPLEMENTATION.md](CLOUDFLARE-IMPLEMENTATION.md)
      → "Production routing options".
- [ ] **PHB ingestions** — spells + gear + (eventually) more. Blocked
      on having a curated corpus + normalizer.
- [ ] **Fine-grained roles** — admin/moderator/banned roles on
      `users`. Defer until there's an actual moderation need.
- [ ] **Real-time combat tracker** — WebSocket / Durable Objects
      so multiple devices see the same encounter live.

## Done when

The Cloudflare stack (Phases 0–6) is **done** when two users can sign
in independently and each sees only their own campaigns + homebrew
content, with monsters/spells/gear signed-off by a real DM. Live.
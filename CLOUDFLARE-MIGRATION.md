# Cloudflare Migration — Status

**Goal:** run the D&D Assistant entirely on Cloudflare — the React frontend on
**Cloudflare Pages**, the API as a **Cloudflare Worker** (Hono + TypeScript),
and data in **Cloudflare D1** (SQLite). This replaces the Java/Spring Boot +
PostgreSQL backend, which cannot run on a Worker (no JVM, no raw TCP to Postgres).

**Started:** 2026-06-19 · **Last updated:** 2026-06-19 (Phase 6 complete — full API ported; README documents dev + prod)

Legend: ✅ done · 🚧 in progress · ⛔ not started

---

## Strategy

- The Java backend stays in the repo as the **reference implementation** until the
  Worker reaches parity. Port it endpoint-by-endpoint; verify each against the
  frontend before moving on.
- D1 starts empty, so the 14 Flyway/Postgres migrations are **collapsed into one
  consolidated SQLite schema** (`worker/migrations/0001_initial.sql`) rather than
  ported incrementally. Postgres-specific backfills (e.g. V14) are dropped.
- Frontend contract is preserved exactly: same routes (`/api/v1/...`), same JSON
  field names (snake_case), same `{token, user}` auth response, same
  `{error:{code,message}}` error shape that `src/ts/api/api-client.ts` reads.
- Passwords: the Java side used BCrypt. Since D1 is a fresh database with no users
  to migrate, the Worker uses **PBKDF2 via WebCrypto** (native to Workers, no deps).
  Old BCrypt hashes are not carried over — users re-register.

## Target architecture

```
Browser
  ├─ Cloudflare Pages   →  the CRA build/ (static, hash-routed SPA)
  └─ Cloudflare Worker  →  Hono app at /api/v1/*  ──►  D1 (SQLite)
```

CORS is handled in the Worker (configurable origins). For a true same-origin
setup (no CORS), see "Production routing options" below.

---

## Progress

### Phase 0 — Recon ✅
- [x] Inventoried backend: 17 controllers, 21 repos, 17 domain types, 14 migrations.
- [x] Captured auth contract (HS256 JWT, `sub`/`username` claims, 24h TTL).
- [x] Captured error/response shapes and ownership rules.
- [x] Confirmed frontend uses `createHashRouter` → Pages needs no SPA fallback.

### Phase 1 — Worker scaffold ✅
- [x] `worker/` project: `package.json`, `tsconfig.json`, `wrangler.toml`.
- [x] Hono entrypoint (`src/index.ts`) with CORS, auth middleware, error handler.
- [x] DB helpers (`src/db.ts`), error helpers (`src/lib/errors.ts`), env types.
- [x] `.dev.vars.example`, `.gitignore`, `worker/README.md`.

### Phase 2 — D1 schema ✅
- [x] Consolidated schema `migrations/0001_initial.sql` (all 16 tables, indexes,
      FKs, Postgres→SQLite type mapping).

### Phase 3 — Auth ✅
- [x] PBKDF2 password hash/verify (`src/auth/password.ts`).
- [x] JWT issue/parse via `hono/jwt` (`src/auth/jwt.ts`).
- [x] `attachUser` + `requireAuth` middleware.
- [x] `/api/v1/auth/signup`, `/login`, `/me`.

### Phase 4 — First resource (template) ✅
- [x] `/api/v1/health`.
- [x] `/api/v1/monsters` full CRUD with ownership + visibility rules.
      This is the **pattern** every other resource route copies.

### Verified end-to-end (2026-06-19) ✅
Against a real local D1 via `wrangler dev`:
- [x] `tsc --noEmit` passes.
- [x] `0001_initial.sql` applies cleanly (49 statements, all 16 tables + indexes).
- [x] `GET /health` → `{status:ok, db:up}`.
- [x] signup → login → `/me` round-trip (JWT issued + verified).
- [x] authed monster create/list (owner-scoped; quoted `"int"` column round-trips).
- [x] unauthenticated write → `401`.

### Phase 5 — Frontend wiring ✅
- [x] `.env.development` → `http://localhost:8787/api/v1` (local Worker).
- [x] `.env.production` → `/api/v1` (adjust per routing choice).
- [x] Fixed hardcoded `localhost:8081` URLs in `src/ts/auth/AuthContext.tsx`
      to use `apiBase` from the api-client.

### Phase 6 — Remaining resource routes ✅
All resource routes ported and verified end-to-end via `wrangler dev`. The full
API surface (below) is now served by the Worker. Status per resource:

| Resource | Route(s) | Status | Notes |
| --- | --- | --- | --- |
| Spells | `/api/v1/spells` CRUD | ✅ | `range`↔`spell_range`, `ritual` bool↔int, `classes`/`tags` []↔CSV, `components` obj↔JSON — verified round-trip |
| Gear | `/api/v1/gear` CRUD + `?kind=` filter | ✅ | PascalCase `Damage`/`AC`/etc., nullable fields omitted (NON_NULL), kind filter verified |
| Classes | `/api/v1/classes` (read) | ✅ | Reference data, public read |
| Races | `/api/v1/races` (read) | ✅ | Reference data, public read |
| Characters | `/api/v1/characters` CRUD | ✅ | UUID PK, owner-scoped, FK→400 on bad race/class; all routes require auth |
| Character state | `/api/v1/characters/{id}/state` | ✅ | GET auto-inits transient (current_hp=hp_max, not persisted); PUT upserts via ON CONFLICT; conditions[]↔JSON — verified |
| Parties | `/api/v1/parties` CRUD + members | ✅ | `member_ids` via party_members join (position-ordered); members validated as owned characters — verified |
| Campaigns | `/api/v1/campaigns` CRUD | ✅ | workflow fields; `archived` int↔bool, nullable dates, NULLS-LAST ordering — verified |
| Campaign sessions | `/api/v1/campaigns/{id}/sessions` | ✅ | nested; auto session_number (MAX+1); attendees[]↔JSON — verified |
| Campaign NPCs | `/api/v1/npcs` (global) + `/campaigns/{id}/npcs` (back-compat) | ✅ | V14 globalized, owner-scoped; `campaign_tags`[]↔JSON, monster_id FK→400; `?campaign=` tag filter — verified |
| Campaign characters | `/api/v1/campaigns/{id}/characters` | ✅ | per-campaign override layer; GET auto-inits from canonical char, PUT upserts by (campaign,char) — verified |
| Campaign parties | `/api/v1/campaigns/{id}/parties` | ✅ | junction (no `id` col → keyed by party_id); link/list/unlink, idempotent link — verified |
| Encounter saves | `/api/v1/encounter-saves` + `/campaigns/{id}/encounters` | ✅ | owner-scoped; verified |
| Import | `POST /api/v1/import`, `GET /api/v1/import/snapshot?kind=` | ✅ | generic upsert by natural key, per-item errors; snapshot is round-trippable — verified |
| Reference data | (covered by `/classes` + `/races`) | ✅ | `ReferenceDataController` was only classes/races |

### Phase 7 — Seed data ⛔
- [ ] Port the `*Seed.java` loaders: read `src/res/*.json` (SRD spells, gear,
      reference data) + the 409-monster Monster Manual dataset into D1.
- [ ] Decide seed mechanism: a `worker/seed/` script run via
      `wrangler d1 execute --file`, or a one-off `/admin/seed` route.

### Phase 8 — Deploy ⛔
- [ ] `wrangler d1 create dnd-assistant`; paste `database_id` into `wrangler.toml`.
- [ ] `wrangler d1 migrations apply dnd-assistant --remote`.
- [ ] `wrangler secret put JWT_SECRET`.
- [ ] `wrangler deploy` (the Worker).
- [ ] Create the Pages project (connect GitHub repo): build `npm run build`,
      output `build`, env `REACT_APP_API_BASE`.
- [ ] Retire the `gh-pages` deploy + `homepage` field once Pages is live.

### Phase 9 — Cleanup ⛔
- [ ] Migrate `AuthContext.tsx` to use the shared `api` client (currently raw fetch).
- [ ] Delete/retire Java backend, `pom.xml`, `Dockerfile`, `postgres/` once parity
      is confirmed (or archive on a branch).
- [ ] Update `README.md`, `PROJECT_STATUS.md`, `ROADMAP.md`.

---

## How to run it locally (once set up)

No Docker / Postgres / JVM needed — two Node processes:

```bash
# Terminal 1 — the API (Worker) on http://localhost:8787
cd worker
npm install                                   # first time only
cp .dev.vars.example .dev.vars                # set JWT_SECRET for local
npm run db:migrate:local                      # create local D1 + apply schema
npm run dev                                   # wrangler dev

# Terminal 2 — the React app on http://localhost:3000
npm start                                     # reads .env.development → :8787
```

`wrangler dev` keeps a local SQLite copy of D1 under `worker/.wrangler/`. Reset it
by deleting that folder and re-running the migrate step.

## Production routing options (no CORS)

The Worker currently allows CORS from the Pages origin. To serve everything on one
origin instead:
- **Custom domain:** add your domain to Cloudflare, point Pages at the root, and
  add a Worker route `yourdomain.com/api/v1/*`. Set `REACT_APP_API_BASE=/api/v1`.
- **Pages Functions:** move the Hono app into the Pages project's `functions/` dir
  (Hono ships a `hono/cloudflare-pages` adapter) so it deploys *with* Pages on the
  same `*.pages.dev` host. The Hono app code is identical; only the entry adapter
  changes.

Until a custom domain exists, the simplest working setup is: deploy the Worker to
`*.workers.dev`, set `REACT_APP_API_BASE` to that URL, and keep CORS on.
</content>
</invoke>

# Project Status

**Last updated:** 2026-06-19

A living snapshot of what works, what's in progress, and what's outstanding.
Update this file as work lands. For the plan, see [ROADMAP.md](ROADMAP.md).

Legend: ✅ done · 🚧 in progress · ⛔ not started

## Current focus

**Cloudflare migration is complete.** The full Spring Boot + Postgres
backend was ported to a Cloudflare Worker (Hono + TypeScript) + D1
(SQLite) stack and went live on 2026-06-19. The Java backend was
archived to branch `archive/spring-boot-backend` (preserves history);
no further work is planned on it. See
[cloudflare/IMPLEMENTATION.md](cloudflare/IMPLEMENTATION.md) for the
architecture, [cloudflare/RUNBOOK.md](cloudflare/RUNBOOK.md) for the
deploy workflow + lessons, and
[CHANGELOG.md](CHANGELOG.md) for the migration log.

**Local dev + production runs entirely on two Node processes** (Worker
+ React). No Docker, Postgres, or JVM is needed.

## Feature status

### Frontend (React + TypeScript SPA on Cloudflare Pages)

| Area | Status | Notes |
| --- | --- | --- |
| Monster browser | ✅ | DataGrid + detail dialog, pagination, `useMonsters` hook reads from `/api/v1/monsters` (409 stat blocks from the Monster Manual) |
| Spell browser | ✅ | DataGrid + detail dialog, pagination, reads from `/api/v1/spells` (396 SRD + custom) |
| Gear / shop | ✅ | Weapons, armour, gear; reads from `/api/v1/gear` (152 rows). Per-kind editor POSTs/PUTs/DELETEs via the api client. |
| Encounter generator | ✅ | XP-balanced, filters by type/alignment/size; reads monsters from the API |
| Combat tracker | ✅ | Initiative, per-monster HP, multi-select; reads monsters from the API; 3-tab page (Live / Builder / Library) |
| Campaign hub | ✅ | Interactive Avandria map, lore viewer, workflow bar, 6-tab hub (Overview / Parties / Characters / Sessions / NPCs / Encounters) |
| Mechanics / rules pages | ✅ | Sticky left-rail TOC + right pane, renders bundled rules JSON |
| Spell creation editor | ✅ | Posts to `/api/v1/spells`; JSON preview alongside |
| Gear/Weapon/Armour editors | ✅ | POST/PUT/DELETE on `/api/v1/gear`; per-kind picker |
| Monster creation editor | ✅ | Full form (name, meta, AC, HP, Speed, CR, ability scores + mods, defenses, traits/actions/reactions/legendary, description/lair/regional) |
| Edit/Delete UI | ✅ | Every browser's detail dialog has Edit (swap to editor) and Delete (confirmation). SRD/derived read-only. |
| AuthContext → api client | ✅ | No raw `fetch` — uses the shared `src/ts/api/api-client.ts` for Bearer header + `{error:{code,message}}` parsing. |
| Cmd-K global search | ✅ | Fuzzy search across monsters, spells, gear, characters, campaigns |
| Frontend Jest/RTL tests | ⛔ | Test scaffold via CRA is in place; suite is empty. Follow-up. |

### Backend (Cloudflare Worker + D1)

| Area | Status | Notes |
| --- | --- | --- |
| Worker build | ✅ | Hono 4.x, TypeScript 5, deployed via `wrangler deploy` (pinned `wrangler@4.102.0`) |
| D1 binding | ✅ | `worker/migrations/0001_initial.sql` consolidates the 14 Flyway migrations into one SQLite schema (16 tables, 49 statements) |
| Seed pipeline | ✅ | `worker/seed/generate.mjs` + `apply.mjs` — 12 classes, 9 races, 396 spells, 152 gear, 409 monsters, all `INSERT … WHERE NOT EXISTS` (idempotent) |
| REST API surface | ✅ | `GET/POST/PUT/DELETE` for every resource: auth, monsters, spells, gear, characters, character-state, campaigns, parties, sessions, npcs, campaign-npcs, campaign-characters, campaign-parties, encounter-saves. Reference reads: `/api/v1/classes`, `/api/v1/races`. Import: `POST /api/v1/import`, `GET /api/v1/import/snapshot`. Health: `GET /api/v1/health`. |
| CORS | ✅ | `FRONTEND_CORS_ORIGINS` env var (comma-separated). Pages preview + alias URLs both whitelisted. |
| Auth / multi-user | ✅ | PBKDF2 password hashing (WebCrypto), HS256 JWT (24h TTL) via `hono/jwt`, `attachUser` + `requireAuth` middleware. `wrangler secret put JWT_SECRET`. |
| Ownership | ✅ | `owner_user_id` on spells/monsters/gear/characters/campaigns/sessions/npcs/encounters. SRD/derived read-only; homebrew visible only to owner (plus NULL-owner global homebrew from seeded custom_* corpora). |
| Content import | ✅ | Generic upsert pipeline (spells/monsters/gear) by natural key. Per-item error isolation. Snapshot endpoint exports in the same shape for backups. |
| Backend smoke tests | ✅ | 13 Spring Boot integration tests in `archive/spring-boot-backend/src/test/`. Worker-side equivalent: `wrangler dev` + `curl` smoke verified for every resource route during the migration (see [cloudflare/RUNBOOK.md](cloudflare/RUNBOOK.md)). Jest equivalents for Worker code: not yet written. |

## Live URLs (after first deploy)

| Layer | URL |
| --- | --- |
| Worker API | `https://dnd-assistant-api.<your-subdomain>.workers.dev` |
| Pages SPA | `https://dndassistant-mvp-run.dnd-assistant-1dx.pages.dev` |
| D1 database | `dnd-assistant` (id printed by `wrangler d1 create dnd-assistant`) |

## Known issues / follow-ups

- **Frontend Jest/RTL tests are still empty.** The test scaffold via
  CRA's `react-scripts test` is in place, but the suite has zero
  tests. Phase 6 follow-up. Backend coverage is currently
  `wrangler dev` + manual curl smoke.
- **OCR gaps in the Monster Manual dataset:** 7 monsters (Cyclops,
  Half-Ogre, Specter, Stirge, Treant, Water Weird, Intellect Devourer)
  are missing AC/HP/Speed lines because the source book's OCR dropped
  them. They emit with empty fields + a warning; the dataset passes
  with 0 errors. Handful of monsters (Frog, Sea Horse, Shrieker,
  Winter Wolf) legitimately have no actions section.
- **`wrangler pages deploy` URL contains a project-hash prefix** so
  the alias URL changes per branch / per worker. Bake
  `REACT_APP_API_BASE` into the build at deploy time
  (`cmd /c "set REACT_APP_API_BASE=...&& npm run build"`) so it matches
  the live Worker. See [cloudflare/RUNBOOK.md](cloudflare/RUNBOOK.md) → "What broke" #7.
- **Old TypeScript** was upgraded to `^4.9.5` (from `^3.4`) but is
  still one major version behind current. Works fine; tracked for a
  future bump.

## How to update this file

When you finish a unit of work: flip the relevant status icon, add/remove a known
issue, bump **Last updated**, and add a [CHANGELOG.md](CHANGELOG.md) entry.
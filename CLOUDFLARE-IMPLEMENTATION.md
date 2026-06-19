# Cloudflare Implementation

The D&D Assistant API runs on **Cloudflare Workers** (Hono + TypeScript) and
data lives in **Cloudflare D1** (SQLite). The React SPA ships from
**Cloudflare Pages**. This document covers how it's wired up — for the
deploy runbook (commands, pitfalls, gotchas), see
[CLOUDFLARE-RUNBOOK.md](CLOUDFLARE-RUNBOOK.md).

## Architecture

```
Browser
  ├─ Cloudflare Pages   →  the CRA build/ (static, hash-routed SPA)
  └─ Cloudflare Worker  →  Hono app at /api/v1/*  ──►  D1 (SQLite)
```

CORS is handled in the Worker (`FRONTEND_CORS_ORIGINS` env var). For a
true same-origin setup (no CORS), see [Production routing options](#production-routing-options-no-cors) below.

## Repo layout

```
worker/
  src/
    index.ts                 Hono app entry: CORS, auth, error handler, route mounts
    types.ts                 Env bindings (DB / JWT_SECRET / FRONTEND_CORS_ORIGINS)
    db.ts                    Tiny D1 query helpers (all / first / run)
    auth/
      jwt.ts                 HS256 issue/parse via hono/jwt
      password.ts            PBKDF2 hash/verify via WebCrypto
    middleware/auth.ts       attachUser (Bearer) + requireAuth
    lib/
      errors.ts              HttpError + {error:{code,message}} mapper
      ownership.ts           ownedCampaign() guard shared by campaign-nested routes
    routes/                  One file per resource (auth, monsters, spells, gear,
                             characters, character-state, campaigns, parties,
                             sessions, npcs, campaign-npcs, campaign-characters,
                             campaign-parties, encounter-saves, import, reference,
                             health)
  migrations/
    0001_initial.sql         Consolidated schema (16 tables; all Flyway migrations
                             collapsed into one since D1 starts empty)
  seed/
    generate.mjs             Reads src/res/resources/*.json → per-table SQL
    apply.mjs                wrangler d1 execute --file=… once per table
    seed-*.sql               Generated output (git-ignored)
scripts/
  deploy.mjs                 One-shot end-to-end deploy (wrangler login → d1 create
                             → migrate → seed → secret → deploy)
src/ts/
  api/
    api-client.ts            Shared client (api.get/post/put/delete + ApiError +
                             auto Authorization header)
  auth/
    AuthContext.tsx          Talks to the api client (no raw fetch)
```

## Auth

- **Password hashing:** PBKDF2-SHA256, 100k iterations, 16-byte salt,
  32-byte key. Stored format: `pbkdf2$<iterations>$<saltHex>$<hashHex>`.
  The earlier Java side used BCrypt; since D1 started empty there's no
  hash migration — users re-register.
- **JWT:** HS256, 24h TTL, claims `{sub, username, iat, exp, jti}`.
  Sign/verify via `hono/jwt` (WebCrypto under the hood, no Node deps).
- **Secret:** `JWT_SECRET` set via `wrangler secret put`. The frontend
  sends it as `Authorization: Bearer <jwt>`; the api client auto-adds
  it from `localStorage`.

## Wire contract

The frontend contract is preserved across the Worker port — the API
client in `src/ts/api/api-client.ts` is the single source of truth:

- **Routes:** `/api/v1/...` exactly.
- **JSON field names:** snake_case to match the Java wire shape.
- **Auth response:** `{token, user: {id, username, email, display_name}}`.
- **Error shape:** `{error: {code, message}}` with HTTP status — the
  client parses this and throws `ApiError(status, code, message)`.

Adding a new endpoint means adding a row in `src/ts/api/<resource>.ts`
plus the corresponding route under `worker/src/routes/`.

## D1 schema

All 16 tables (users, classes, races, characters, character_state,
campaigns, parties, party_members, campaign_sessions, campaign_npcs,
campaign_characters, campaign_parties, encounter_saves, monsters,
spells, gear) are created by a single migration
`worker/migrations/0001_initial.sql`. Postgres types map to SQLite:

| Postgres | SQLite |
| --- | --- |
| BIGSERIAL PK | INTEGER PRIMARY KEY (auto rowid) |
| UUID PK | TEXT PRIMARY KEY (app-generated via `crypto.randomUUID()`) |
| BOOLEAN | INTEGER (0/1) |
| JSONB | TEXT (JSON string) |
| TIMESTAMPTZ | TEXT (`CURRENT_TIMESTAMP` default; ISO-8601 from the app) |
| DATE | TEXT |

D1 enforces foreign keys during normal operation (and defers them
during migration apply).

### Ownership model

Three provenance classes:

- `srd` / `derived` — bundled reference content (12 classes, 9 races,
  396 spells, 152 gear, 409 monsters after seed). Visible to every
  user, no `owner_user_id`.
- `homebrew` + `owner_user_id = NULL` — global homebrew content seeded
  from `custom_*.json` files. Visible to every user via a visibility
  carve-out (`owner_user_id IS NULL` matches).
- `homebrew` + `owner_user_id = <user>` — user-created. Visible only to
  that user. Only the owner can PUT/DELETE; SRD/derived rows are
  read-only.

Visibility rule (every list endpoint):
```sql
WHERE provenance <> 'homebrew'
   OR owner_user_id = :userId
   OR owner_user_id IS NULL
```

Writes (POST/PUT/DELETE):
- POST always sets `provenance = 'homebrew'` and `owner_user_id = userId`.
- PUT/DELETE require `provenance = 'homebrew'` AND `owner_user_id = userId`
  (else 403).

The `shared/ownedCampaign()` guard in `worker/src/lib/ownership.ts`
loads a campaign and asserts the caller owns it — used by every
campaign-nested route so the ownership check isn't duplicated.

## Seeding

`worker/seed/generate.mjs` reads the bundled corpora and writes
5 per-table SQL files (`seed-classes.sql`, `seed-races.sql`,
`seed-spells.sql`, `seed-gear.sql`, `seed-monsters.sql`).
`worker/seed/apply.mjs` invokes `wrangler d1 execute --file=…` once per
table.

Every INSERT is `INSERT INTO … SELECT … WHERE NOT EXISTS (…)` against
the natural key (NULL-owner-aware via `IS NULL`) so re-running is a
no-op. Verified via the API: 12 classes, 9 races, 396 spells, 152 gear,
409 monsters.

## Import + snapshot

`POST /api/v1/import` accepts `{kind, provenance, owner_user_id?, items[]}`
and upserts each item by its natural key. Per-item errors are isolated —
a bad row never aborts the batch. `GET /api/v1/import/snapshot?kind=…&provenance=…`
exports the DB in the exact shape the importer accepts (round-trippable
backup).

Use these for backups, content audits, and bulk content migrations.

## Local development

Two Node processes — no Docker, Postgres, or JVM:

```bash
# Terminal 1 — the API (Worker) on http://127.0.0.1:8787
cd worker
npm install                                   # first time only
cp .dev.vars.example .dev.vars                # set JWT_SECRET for local
npm run db:migrate:local                      # create local D1 + apply schema
npm run seed:local                            # seed the 12/9/396/152/409
npm run dev                                   # wrangler dev

# Terminal 2 — the React app on http://localhost:3000
cd ..
npm start                                     # reads .env.development → :8787
```

`wrangler dev` keeps a local SQLite copy of D1 under `worker/.wrangler/`.
Reset it by deleting that folder and re-running migrate + seed.

## Configuration

The frontend's API base is build-time config (Create React App `.env*` files):

| File | Used by | Value |
| --- | --- | --- |
| [`.env.development`](.env.development) | `npm start` | `http://127.0.0.1:8787/api/v1` (local Worker) |
| [`.env.production`](.env.production) | `npm run build` | absolute Worker URL or `/api/v1` for same-origin |

The Worker's config lives in [`worker/wrangler.toml`](worker/wrangler.toml):

| Setting | Purpose |
| --- | --- |
| `database_id` | Cloudflare D1 id for `dnd-assistant` (per-environment) |
| `[vars] FRONTEND_CORS_ORIGINS` | Comma-separated allowed CORS origins |
| `JWT_SECRET` | Set via `wrangler secret put` (never in `wrangler.toml`) |

## Deploy

End-to-end deploy lives in [README.md](README.md) → "Deploy to production"
and [CLOUDFLARE-RUNBOOK.md](CLOUDFLARE-RUNBOOK.md) → "How to redeploy".

The single-command workflow:

```bash
cd worker
npm run deploy:prod          # scripts/deploy.mjs — every step idempotent
```

Or, after initial setup, just:

```bash
cd worker
npm run db:migrate:remote    # schema changes only
npm run seed:remote          # seed additions only (no-op on existing rows)
npm run deploy               # Worker code changes
# + rebuild Pages and `wrangler pages deploy build/`
```

## Production routing options (no CORS)

The Worker currently allows CORS from the Pages origin. To serve
everything on one origin instead:

- **Custom domain:** add your domain to Cloudflare, point Pages at the
  root, and add a Worker route `yourdomain.com/api/v1/*`. Set
  `REACT_APP_API_BASE=/api/v1`.
- **Pages Functions:** move the Hono app into the Pages project's
  `functions/` dir (Hono ships a `hono/cloudflare-pages` adapter) so it
  deploys *with* Pages on the same `*.pages.dev` host. The Hono app
  code is identical; only the entry adapter changes.

Until a custom domain exists, the simplest working setup is: deploy
the Worker to `*.workers.dev`, set `REACT_APP_API_BASE` to that URL,
and keep CORS on.
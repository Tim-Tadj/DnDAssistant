# Dungeons & Dragons Assistant

A full-stack assistant for the Dungeon Master running D&D 5e sessions: browse
monsters, spells and gear; generate XP-balanced encounters and track combat live;
and manage a campaign world with characters, parties, sessions, NPCs and an
interactive map.

- **Frontend:** React + TypeScript (Material-UI), single-page app → **Cloudflare Pages**.
- **API:** **Cloudflare Worker** (Hono + TypeScript) → **Cloudflare D1** (SQLite).
- **Auth:** stateless JWT (HS256); passwords hashed with PBKDF2 (WebCrypto).

> **Migrating from the old stack.** This project originally ran a Java / Spring
> Boot backend on PostgreSQL (still under [`src/java/`](src/java) as the reference
> implementation). It is being ported to a Cloudflare Worker + D1. See
> [CLOUDFLARE-IMPLEMENTATION.md](CLOUDFLARE-IMPLEMENTATION.md) for the architecture / wire contract
> endpoints have moved over.

> New here? Read [AGENTS.md](AGENTS.md) for conventions and [docs/spec/](docs/spec/)
> for design specs.

## Architecture

```
Browser
  ├─ Cloudflare Pages   →  the React build/ (static, hash-routed SPA)
  └─ Cloudflare Worker  →  Hono API at /api/v1/*  ──►  Cloudflare D1 (SQLite)
```

The frontend reads its API base from `REACT_APP_API_BASE` (see
[Configuration](#configuration)), so the same build runs against a local Worker in
dev and the deployed Worker in production.

## Prerequisites

| Tool | Version | Used for |
| --- | --- | --- |
| [Node.js](https://nodejs.org/) + npm | LTS (18+) | Frontend **and** Worker |
| [Wrangler](https://developers.cloudflare.com/workers/wrangler/) | 3.9x+ (run via `npx`, pinned in `worker/`) | Worker dev + deploy, D1 |
| A [Cloudflare account](https://dash.cloudflare.com/sign-up) | — | **Production deploy only** — local dev is fully offline |

No Docker, Postgres, or JDK is needed for the Cloudflare stack.

## Run locally (development)

Two processes: the API (Worker + a local SQLite copy of D1) and the React app.
Local dev never touches your Cloudflare account.

**Terminal 1 — the API** (`http://127.0.0.1:8787`):

```bash
cd worker
npm install                          # first time only
cp .dev.vars.example .dev.vars       # local JWT secret (any 32+ char string)
npm run db:migrate:local             # create the local D1 and apply the schema
npm run dev                          # wrangler dev on 127.0.0.1:8787
```

**Terminal 2 — the React app** (`http://localhost:3000`):

```bash
npm install                          # first time only (repo root)
npm start                            # reads .env.development → the local Worker
```

Open <http://localhost:3000>, sign up, and go. Quick API smoke test:

```bash
curl http://127.0.0.1:8787/api/v1/health
# → {"status":"ok","db":"up", ...}
```

Notes:
- `wrangler dev` keeps the local D1 under `worker/.wrangler/`. Delete that folder
  and re-run `npm run db:migrate:local` to reset to an empty database.
- Use `127.0.0.1`, not `localhost`, for the API — `localhost` can resolve to IPv6
  and return nothing. The `npm run dev` script already binds `127.0.0.1`.

## Deploy to production

End-to-end deploy of the D1-backed API (Cloudflare Worker) and the React SPA
(Cloudflare Pages).

### One-shot deploy script (recommended for first-timers)

From the repo root, run:

```bash
cd worker
npm run deploy:prod
```

This walks you through every step and re-runs idempotently until the cloud
state matches:

1. **`wrangler login`** — opens a browser the first time; subsequent runs
   detect the cached session and skip.
2. **`wrangler d1 create dnd-assistant`** — creates the production D1 and
   patches `worker/wrangler.toml` with the printed `database_id`.
3. **`wrangler d1 migrations apply --remote`** — applies the schema.
4. **`npm run seed:remote`** — loads 12 classes, 9 races, 396 spells,
   152 gear, 409 monsters.
5. **`wrangler secret put JWT_SECRET`** — generates one if you don't supply
   one (and pipes it via stdin so it's not echoed on the command line).
6. **`wrangler deploy`** — Worker live at
   `https://dnd-assistant-api.<subdomain>.workers.dev`.
7. **Post-deploy health check** (if `CLOUDFLARE_ACCOUNT_SUBDOMAIN` is set).

Each step is idempotent: if you re-run the script after a partial deploy, it
picks up where it left off.

### Manual step-by-step (if you'd rather see what's happening)

### 0. Prerequisites

```bash
npx wrangler login                   # opens a browser to authenticate this machine
```

You need a Cloudflare account with Workers + Pages + D1 enabled (free tier is
enough for this app).

### 1. Create the production D1 database

```bash
cd worker
npm run db:create                    # creates the D1; prints database_id +
                                     # binding hints. Paste the id into
                                     # worker/wrangler.toml (the
                                     # `database_id = "REPLACE_…"` line).
```

### 2. Apply the schema + seed the bundled content

```bash
cd worker
npm run db:migrate:remote            # apply migrations/0001_initial.sql to the cloud D1
npm run seed:remote                  # writes seed-*.sql from src/res JSON and
                                     # applies them via wrangler d1 execute
```

After this, the production D1 has the same contents as a fresh local D1: 12
classes, 9 races, 396 spells, 152 gear, 409 monsters (Monster Manual). See
[worker/seed/README.md](worker/seed/README.md) for details and idempotency
guarantees.

### 3. Set the Worker secret + deploy the API

```bash
cd worker
npx wrangler secret put JWT_SECRET   # prompts for a 32+ byte production secret
npm run deploy                       # → https://dnd-assistant-api.<subdomain>.workers.dev
```

`<subdomain>` is your Cloudflare Workers subdomain (visible in the dashboard
URL after the first deploy). Copy the URL — the Pages frontend needs it.

### 4. Update CORS allowed origins

Edit [`worker/wrangler.toml`](worker/wrangler.toml) and add your Pages URL to
`FRONTEND_CORS_ORIGINS` (comma-separated), then re-deploy:

```bash
cd worker
npm run deploy
```

### 5. Deploy the frontend to **Pages**

**Easiest — via the dashboard:**

1. Cloudflare dashboard → **Workers & Pages** → **Create application** →
   **Pages** → **Connect to Git**.
2. Pick this repo.
3. **Project name:** `dnd-assistant` (or anything you like).
4. **Build command:** `npm run build`
5. **Build output directory:** `build`
6. **Environment variables** (Production):
   - `REACT_APP_API_BASE` = `https://dnd-assistant-api.<subdomain>.workers.dev/api/v1`
7. Save and deploy.

The first build runs on the dashboard. Subsequent deploys happen automatically
on every push to the connected branch.

**Or from the CLI** (one-shot, no Git integration):

```bash
npm run build
npx wrangler pages deploy build --project-name=dnd-assistant
```

### 6. Verify the deploy

1. Visit the Pages URL — the SPA loads and talks to the Worker.
2. Sign up, create a character — it should persist in D1.
3. Tail the Worker logs if anything's off:

```bash
cd worker
npx wrangler tail
```

### Schema changes after first deploy

When you change the schema:

```bash
cd worker
npm run db:migrate:remote            # applies any new migrations/*.sql
npm run seed:remote                  # safe to re-run; INSERTs are no-ops on existing rows
npm run deploy                       # only needed if you also changed Worker code
```

### Same-origin vs. CORS

- **Separate Worker URL (default, simplest):** `REACT_APP_API_BASE` is the full
  Worker URL. The Worker allows cross-origin requests from the origins listed
  in `FRONTEND_CORS_ORIGINS` (`worker/wrangler.toml`).
- **Same origin (no CORS):** put the API on the same domain as Pages via a
  custom domain + a Worker route `yourdomain.com/api/v1/*`, then set
  `REACT_APP_API_BASE=/api/v1`. See [CLOUDFLARE-IMPLEMENTATION.md](CLOUDFLARE-IMPLEMENTATION.md)
  for the production-routing notes.

## Configuration

The frontend's API base is build-time config (Create React App `.env*` files):

| File | Used by | Value |
| --- | --- | --- |
| [`.env.development`](.env.development) | `npm start` | `http://localhost:8787/api/v1` (local Worker) |
| [`.env.production`](.env.production) | `npm run build` | `/api/v1`, or your full Worker URL |

The Worker's config lives in [`worker/wrangler.toml`](worker/wrangler.toml):
`FRONTEND_CORS_ORIGINS` (var) and the `DB` D1 binding; `JWT_SECRET` is a secret
(`.dev.vars` locally, `wrangler secret put` in prod).

## Seeding content

D1 starts empty. Load SRD content / homebrew through the bulk import endpoint:

```bash
curl -X POST http://127.0.0.1:8787/api/v1/import \
  -H 'Content-Type: application/json' \
  -d '{"kind":"spell","provenance":"srd","items":[ ... ]}'
```

`GET /api/v1/import/snapshot?kind=monster` exports rows back out in the same shape
(round-trippable). The bundled seed of the SRD data + the 409-monster Monster Manual
runs via `npm run seed:remote` — see
[CLOUDFLARE-IMPLEMENTATION.md](CLOUDFLARE-IMPLEMENTATION.md).

## Project layout

```
src/ts/        React + TypeScript frontend (features under monsters/, spells/, gear/, ...)
worker/        Cloudflare Worker API (Hono + D1)
  src/routes/  one file per resource (monsters, spells, gear, characters, campaigns, ...)
  migrations/  D1 (SQLite) schema
src/res/       Bundled JSON data (SRD content, rules, campaign world)
src/java/      Legacy Java/Spring Boot backend (reference during the migration)
docs/spec/     Design specifications
```

## Resources

Maps are generated through [Azgaar's Fantasy Map Generator](https://azgaar.github.io/Fantasy-Map-Generator/).
Markers on the interactive map are generated via simple locational metadata in the
`Avandria.json` file which is read at runtime. The locations of these markers are
the relevant pixel coordinates of the generated map where city images are generated
through [Watabou's City Generator](https://watabou.github.io/city-generator/) which
uses the `outskirts.json` and `charred.json` styles respectively loaded through the
*Color Scheme* menu. Other settings applied through the *Style* menu include
*Misc -> Show trees & Show Alleys*; *Elements -> Districts -> Legend*; and
*Graphics -> Thin Lines & Tint Districts & Weathered roofs*.

Other Dungeons & Dragons resources are adapted from publicly available data and
re-used as the data structure for defining new resources.

## License

ISC. See package metadata. Authors: Lachlan Charteris, Lachlan Crews.
</content>

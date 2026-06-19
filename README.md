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
> [CLOUDFLARE-MIGRATION.md](CLOUDFLARE-MIGRATION.md) for the live status of which
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

One-time setup (creates real, billable Cloudflare resources):

```bash
cd worker
npx wrangler login                   # authenticate this machine
npm run db:create                    # creates the D1 db; copy the printed
                                     # database_id into worker/wrangler.toml
npm run db:migrate:remote            # apply the schema to the cloud D1
npx wrangler secret put JWT_SECRET   # set a real 32+ byte production secret
```

Deploy the API:

```bash
cd worker
npm run deploy                       # → https://dnd-assistant-api.<subdomain>.workers.dev
```

Deploy the frontend to **Pages** — easiest via the dashboard (Workers & Pages →
Create → Pages → connect this Git repo):

- **Build command:** `npm run build`
- **Build output directory:** `build`
- **Environment variable:** `REACT_APP_API_BASE` (see below)

…or from the CLI:

```bash
npm run build
npx wrangler pages deploy build --project-name=dnd-assistant
```

### Same-origin vs. CORS

- **Separate Worker URL (simplest):** set `REACT_APP_API_BASE` to the full Worker
  URL, e.g. `https://dnd-assistant-api.<subdomain>.workers.dev/api/v1`. The Worker
  allows cross-origin requests from the origins in `FRONTEND_CORS_ORIGINS`
  (`worker/wrangler.toml`) — add your Pages URL there.
- **Same origin (no CORS):** put the API on the same domain as Pages via a custom
  domain + a Worker route `yourdomain.com/api/v1/*`, then set
  `REACT_APP_API_BASE=/api/v1`. See [CLOUDFLARE-MIGRATION.md](CLOUDFLARE-MIGRATION.md).

When the schema changes, ship it with `npm run db:migrate:remote` before/with the
deploy.

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
(round-trippable). A bundled seed of the SRD data + the 409-monster Monster Manual
is still being ported — tracked as Phase 7 in
[CLOUDFLARE-MIGRATION.md](CLOUDFLARE-MIGRATION.md).

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

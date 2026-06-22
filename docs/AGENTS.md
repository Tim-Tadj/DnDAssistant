# AGENTS.md

Guidance for AI assistants and human contributors working in this repository.
For *what we're building and why*, see [docs/spec/](spec/); for *where it's
going*, see [ROADMAP.md](ROADMAP.md); for *current state*, see
[PROJECT_STATUS.md](PROJECT_STATUS.md).

## Branches

- `main` — the published mirror. Don't push work-in-progress here.
- `DnDAssistant-MVP-Run` — the **live work branch** the app is being built
  up to MVP quality on. Day-to-day commits and feature work land here
  until the app reaches a state ready for use, at which point this
  branch is promoted to `main`. Pushing a half-baked feature straight
  to `main` defeats the purpose — keep the MVP run branch's history
  linear and reviewable.
- `archive/spring-boot-backend` — frozen snapshot of the original
  Java/Spring Boot + Postgres backend, kept for historical
  reference. The Cloudflare Worker + D1 stack is the only live API;
  do not merge from this branch.

## What this is

DnDAssistant is a full-stack D&D 5e Dungeon Master tool: a React/TypeScript
SPA frontend and a Cloudflare Worker (Hono + TypeScript) + D1 (SQLite)
backend. Users browse SRD content (monsters, spells, gear, classes,
races), generate XP-balanced encounters, track combat live, and
manage their own campaigns with characters, parties, sessions, and
NPCs. The whole stack runs end-to-end on two Node processes
(`wrangler dev` + `npm start`); no Docker, Postgres, or JVM is needed.

## Tech stack

- **Frontend:** React 18 + TypeScript, Material-UI (`@mui/material`,
  `@mui/x-data-grid`), React Router (hash routing), Leaflet maps.
  Built with Create React App (`react-scripts`).
- **API:** Hono 4 + TypeScript 5 on Cloudflare Workers
  (`worker/src/`), backed by Cloudflare D1 (SQLite) — see
  [docs/cloudflare/IMPLEMENTATION.md](cloudflare/IMPLEMENTATION.md).
- **Auth:** stateless JWT (HS256, 24h TTL) issued by `hono/jwt`; passwords
  hashed with PBKDF2 (WebCrypto, no native deps).
- **Frontend ↔ API:** one shared `api` client in
  `src/ts/api/api-client.ts` (auth header, `{error:{code,message}}`
  parsing). Every component goes through it; raw `fetch` is forbidden.

## Repository map

```
src/ts/                Frontend
  app-router.tsx       Hash routes: '', monsters, spells, gear, encounter, characters, campaign
  types/               Domain types (Monster, Spell, Gear, Character, ...)
  api/                 api-client (api.get/post/put/delete + ApiError)
  auth/                AuthContext, AuthDialog
  monsters/ spells/ gear/ encounters/ campaigns/ mechanics/ characters/   Feature folders
  shared/              Reusable components (EntityBrowser, ContextBar, LinkedText, ...)

worker/                Cloudflare Worker API
  src/
    index.ts           Hono app entry: CORS, auth middleware, error handler, route mounts
    routes/            One file per resource (auth, monsters, spells, gear, characters, campaigns, ...)
    auth/              jwt.ts (HS256), password.ts (PBKDF2)
    middleware/auth.ts attachUser + requireAuth
    lib/               errors.ts, ownership.ts (ownedCampaign guard)
    db.ts              D1 query helpers (all/first/run)
    types.ts           Env bindings (DB, JWT_SECRET, FRONTEND_CORS_ORIGINS)
  migrations/
    0001_initial.sql   Consolidated D1 schema (all 16 tables, indexes, FKs)
  seed/
    generate.mjs       Reads src/res/resources/*.json → per-table SQL
    apply.mjs          wrangler d1 execute --file=… once per table

src/res/               Bundled data
  resources/           SRD + Monster Manual + custom_* corpora (used as seed source)
  rules/               Game rules (mechanics, combat, conditions, ...)
  talesOfAvandria/     Example campaign world (JSON + map image)

scripts/
  deploy.mjs           One-shot end-to-end deploy (wrangler login → d1 create → migrate → seed → secret → deploy)
  run-all.sh           Local dev helper (starts the Worker + the React app)

docs/                  Living project docs
  ROADMAP.md           Phases 0-6 (shipped), Phase 7 (next)
  PROJECT_STATUS.md    Feature status, known issues
  CHANGELOG.md         All notable changes
  AGENTS.md            (this file)
  cloudflare/          Architecture (IMPLEMENTATION.md) + deploy workflow (RUNBOOK.md)
  spec/                Design specifications (architecture, data model, API, per-feature specs)
```

## Commands

| Task | Command (cwd) |
| --- | --- |
| Install frontend deps | `npm install` (repo root) |
| Run frontend (dev) | `npm start` (repo root, → http://localhost:3000) |
| Build frontend | `npm run build` (repo root) |
| Test frontend | `npm test` (CRA's `react-scripts test`) |
| Install Worker deps | `cd worker && npm install` |
| Apply migrations to local D1 | `cd worker && npm run db:migrate:local` |
| Seed local D1 | `cd worker && npm run seed:local` |
| Run the API (dev) | `cd worker && npm run dev` (→ http://127.0.0.1:8787) |
| Apply migrations to remote D1 | `cd worker && npm run db:migrate:remote` |
| Seed remote D1 | `cd worker && npm run seed:remote` |
| Deploy the Worker | `cd worker && npm run deploy` |
| One-shot end-to-end deploy (Worker + Pages) | `cd worker && npm run deploy:prod` |
| Build SPA + deploy to Pages | `npm run build` then `cd worker && npx wrangler pages deploy ../build --project-name=dnd-assistant` |
| Typecheck | `npx tsc --noEmit` (root) and `cd worker && npx tsc --noEmit` |
| Worker logs (tail) | `cd worker && npx wrangler tail` |

## Deploying

Two deploys: the **Worker** (API) and **Pages** (SPA). Both use `wrangler`,
which reads the cached OAuth token from your terminal — no API token needed
once `wrangler login` has been run at least once. The full story (every
deploy-time bug, in order) is in [docs/cloudflare/RUNBOOK.md](cloudflare/RUNBOOK.md);
this section is just the copy-paste.

### Daily: frontend-only change (most common)

The build embeds the API URL, so `REACT_APP_API_BASE` must be set. Use
PowerShell-native env (avoids the `cmd /c "set X=Y&&…"` trailing-space bug
documented in RUNBOOK.md → "What broke" #7).

```powershell
# From repo root
$env:REACT_APP_API_BASE = "https://dnd-assistant-api.ttimtadj.workers.dev/api/v1"
npm run build
cd worker
npx wrangler pages deploy ../build --project-name=dnd-assistant --commit-dirty=true
```

The Pages project name is **`dnd-assistant`** (the alias URL
`dndassistant-mvp-run.dnd-assistant-1dx.pages.dev` includes a git-branch
+ project-hash suffix — that's the *deployed* URL, not the project name).
Don't pass `--project-name=dndassistant-mvp-run`; wrangler will ask you to
create it.

### Worker code change

```powershell
cd worker
npm run deploy            # wrangler deploy, picks up wrangler.toml
```

That's it if only Worker code changed. Schema/content changes need a
migrate + seed first (see the table above for `db:migrate:remote` and
`seed:remote`).

### First-time / full stack / after schema or seed changes

Idempotent end-to-end — walks D1 → migrations → seed → JWT secret → Worker
deploy, picks up where the previous run bailed.

```powershell
cd worker
npm run deploy:prod
```

### Verify it's live

```powershell
cd worker
npx wrangler tail                       # live request stream
# or in another terminal:
curl https://dnd-assistant-api.ttimtadj.workers.dev/api/v1/health
```

### Pre-deploy checklist

- [ ] `npx tsc --noEmit` clean at repo root
- [ ] `cd worker && npx tsc --noEmit` clean
- [ ] `git status` shows only the files you meant to change
- [ ] Committed (Pages deploys with `--commit-dirty=true`, but the source
      should still be in git before you ship)

## Conventions

**Naming**
- Components: `kebab-case.tsx` (e.g. `monster-table.tsx`).
- Types: `PascalCase.ts` in `src/ts/types/`.
- Hooks: `use-*.ts` or `use-*.tsx` (e.g. `use-track-encounter.ts`).
- Constants: `UPPER_SNAKE_CASE`.
- JSON resources: `snake_case.json` (e.g. `srd_5e_monsters.json`).

**Code style**
- Functional React components with hooks. Per-feature React Context
  (`AuthContext`, `CampaignContext`, `MonsterStatPaneProvider`, ...)
  — no Redux.
- Each entity type has a `default*` object used to initialize forms.
- Prettier (`.prettierrc.json`, single quotes) + ESLint (`.eslintrc.json`).
- TypeScript strict mode; `tsc --noEmit` clean before commit.

**Recurring patterns** (study these before adding similar features)
- **API calls:** always through `src/ts/api/api-client.ts`. The
  client adds the Bearer token from `localStorage`, parses
  `{error:{code,message}}`, and throws `ApiError(status, code, message)`.
  Never `fetch()` directly.
- **Editor pattern:** `useState(default*)` → on every change, serialize
  to JSON via `useCallback` + `useEffect`. See
  `src/ts/monsters/monster-editor.tsx` and
  `src/ts/spells/spell-editor.tsx`.
- **Dialog pattern:** a `Create X` button toggles `useState(false)`
  open state on a MUI `Dialog`. See
  `src/ts/spells/create-spell.tsx`.
- **Table pattern:** `@mui/x-data-grid` with whitespace-delimited
  multi-keyword search (all words must appear). Row click opens a
  detail `Drawer` (right on desktop, bottom on mobile). See the
  shared `EntityBrowser` shell — most browsers extend it.
- **New Worker route:** copy `worker/src/routes/monsters.ts`, mount
  it in `worker/src/index.ts`, add a column in
  `src/ts/api/<resource>.ts` for the frontend.
- **New shared provider:** providers that call router hooks
  (`useNavigate`, `useLocation`) must live *inside* `<AppLayout>`,
  which is inside `<RouterProvider>`. Mounting them at the top
  level (outside `AppRouter`) throws "useNavigate may be used only
  in the context of a <Router>" and white-screens the SPA. See
  `src/index.tsx` + `src/ts/AppLayout.tsx`.

## Adding content

Bundled data lives in `src/res/resources/` (SRD + `custom_*.json`).
`worker/seed/generate.mjs` reads these and emits per-table SQL;
`worker/seed/apply.mjs` runs the SQL via `wrangler d1 execute
--file=…`. New content must match the existing JSON shapes (the
TypeScript types in `src/ts/types/` are the contract). See
[docs/spec/content-ingestion.md](spec/content-ingestion.md) and
[docs/spec/data-model.md](spec/data-model.md).

For content that comes from a book or a one-off source, the
generic `POST /api/v1/import` endpoint upserts by natural key
(`(name, kind?, provenance, owner_user_id)`) with per-item error
isolation — no schema migration required.

## Gotchas / known issues

- **`REACT_APP_API_BASE` doesn't propagate to `react-scripts build` from
  PowerShell's `$env:`** — use `cmd /c "set REACT_APP_API_BASE=…&& npm run
  build"` to force it through. See
  [docs/cloudflare/RUNBOOK.md](cloudflare/RUNBOOK.md) → "What broke" #7.
- **Cloudflare Pages URLs include a project-hash prefix** when deployed
  via `wrangler pages deploy`. The alias URL is stable; preview URLs
  are not. Add both forms to `FRONTEND_CORS_ORIGINS` if you need
  previews to work.
- **Pages per-file size limit is 25 MiB.** The Avandria map was 26.7 MB
  as a PNG; `scripts/compress-map.py` (Pillow) converts to JPEG q85
  and downscales to 8000px wide → 2.5 MB. Use the same approach for
  any new large media asset.
- **Wrangler 3 silently drops freshly-set secrets from subsequent
  deploys.** The repo pins `wrangler@4` in `worker/package.json`. If
  you `wrangler secret put` and `c.env.JWT_SECRET` is still
  undefined on the live Worker, upgrade: `cd worker && npm install
  --save-dev wrangler@4`.
- **JSON.stringify in the bundle hides `console.error` from wrangler
  tail** — exceptions that are caught and rethrown get logged at
  the `app.onError` global handler ("Unhandled error"), not at the
  route level. Use `wrangler tail --status error` to see them.
- **Workers use `crypto.subtle` (WebCrypto) for PBKDF2** — no
  Node `crypto` import. The Java backend used BCrypt; hashes don't
  carry over, so users re-register on the new stack.
- **Frontend Jest/RTL test suite is empty.** The CRA scaffold is in
  place; tests need to be written. See
  [ROADMAP.md](ROADMAP.md) Phase 7.

## Where design lives

`docs/spec/` is the source of truth for design decisions (architecture,
data model, REST API contract, content ingestion, per-feature specs).
Update the relevant spec when you change behavior, and update
[PROJECT_STATUS.md](PROJECT_STATUS.md) and [CHANGELOG.md](CHANGELOG.md)
as work lands.
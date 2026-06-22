# Cloudflare Runbook

End-to-end log of what was done, what broke, and how it was fixed — written
on 2026-06-19 during the first deploy of the D1 + Workers + Pages stack to
a fresh Cloudflare account.

## Final state

| Layer | URL | Status |
| --- | --- | --- |
| Worker API | https://dnd-assistant-api.ttimtadj.workers.dev | Live |
| Pages SPA | https://dndassistant-mvp-run.dnd-assistant-1dx.pages.dev | Live |
| D1 database | `dnd-assistant` (id `829b6bed-e1f5-4189-9744-069524dceca0`) | Live, seeded |

Seeded counts (verified via `/api/v1/<table>`):
12 classes · 9 races · 396 spells · 152 gear · 409 monsters.

## What worked

1. **`wrangler login`** in the user's terminal — single OAuth browser flow,
   cached thereafter. `wrangler whoami` reports the email and the
   script uses it as the "already logged in" check.

2. **`npm run deploy:prod`** (the `scripts/deploy.mjs` wrapper) — walks
   through every step in order with `wrangler v4`. Each step is
   idempotent: re-running picks up where the previous invocation bailed.
   Specifically:
   - `wrangler d1 create dnd-assistant` (or skip if it exists).
   - Patch `worker/wrangler.toml` with the printed `database_id`
     (regex tolerates both `│`-delimited header rows and whitespace-
     delimited data rows in `wrangler d1 list` output).
   - `npm run db:migrate:remote` (Flyway-equivalent single
     `0001_initial.sql`).
   - `npm run seed:remote` (5 per-table SQL files written by
     `worker/seed/generate.mjs`, applied by `worker/seed/apply.mjs`
     via one `wrangler d1 execute --file=…` per table).
   - `wrangler secret put JWT_SECRET` (auto-generates if blank; pipes
     the value via stdin so it never appears on the command line).
   - `wrangler deploy` (Worker live).
   - Optional health check when `CLOUDFLARE_ACCOUNT_SUBDOMAIN` is set.

3. **`worker/seed/generate.mjs` + `apply.mjs`** — Node scripts that
   port the Java `*Seed.java` loaders to a Workers + D1 friendly
   form. 978 statements across 5 per-table files (12+9+396+152+409).
   Idempotent via `INSERT INTO … SELECT … WHERE NOT EXISTS (…)` so
   re-running is a no-op.

4. **Visibility carve-out** in the monster/spell/gear routes — the
   homebrew visibility rule `provenance <> 'homebrew' OR owner_user_id = ?`
   was extended to also match `owner_user_id IS NULL` so seeded
   custom_* corpora (NULL owner) are visible to every user, not just
   the seed user. Counts after seed: 152 gear visible to all,
   not 149.

5. **`wrangler pages deploy build/`** for the SPA — builds a Pages
   project (auto-named `dnd-assistant-1dx`), uploads static assets,
   and gives a preview + alias URL. Works once wrangler is on v4.

## What broke and how it was fixed

### 1. `wrangler d1 create` failed with "A database with that name already exists" on re-runs

First run of `deploy:prod` created the D1; second run bailed at
step 2 with that error.

**Fix:** `ensureD1` in `scripts/deploy.mjs` detects the "already exists"
error and falls back to `wrangler d1 list` to find the existing id,
then patches `wrangler.toml`. Verified by re-running the script on
a second pass — picks up at step 3.

### 2. The `wrangler d1 list` regex initially didn't match

`wrangler d1 list` renders data rows with plain whitespace between
cells but header rows with `│`. The first regex assumed `│` everywhere.
Then the second regex `^\s*([0-9a-f-]{36})\s+[│\s]\s*…` failed because
JS `\s` only matches ASCII whitespace, not U+2502. The line starts
with `│` (which `\s*` can't eat), so the whole regex fell off the rail.

**Fix:** drop the `^\s*` anchor and use `[\s│]` for the inner separator.
Verified: extracts `829b6bed-e1f5-4189-9744-069524dceca0` from a
real `wrangler d1 list` output.

### 3. Wrangler v3 didn't attach freshly-set secrets to subsequent deploys

After `wrangler secret put JWT_SECRET` and `wrangler deploy`,
`c.env.JWT_SECRET` was `undefined` on the deployed Worker. Signup
returned 500 ("JWT_SECRET is not set on this Worker environment")
even though `wrangler secret list` showed the secret attached.

**Root cause:** known bug in wrangler 3.x where the deploy bundled
before the secret was registered didn't pick it up on later deploys.

**Fix:** `npm install --save-dev wrangler@4` (pinned to ^4.102.0 in
`worker/package.json`). Verified: signup now issues a JWT, `/me`
round-trips, authed `POST /campaigns` persists.

### 4. Avandria map was 26.7 MB (over Pages' 25 MB per-file limit)

`src/res/talesOfAvandria/Avandria.png` was 15360×8112 RGBA, 26.7 MB.
`wrangler pages deploy` aborted with "Pages only supports files up to
25 MiB in size".

**Fix:** `scripts/compress-map.py` (Pillow) converts to JPEG q85 and
downscales to 8000px wide — output is 2.5 MB. Updated the two
references (import in `campaign-manager.tsx`, `map` field in
`Avandria.json`) to use `Avandria.jpg`. Deleted the PNG.

### 5. `homepage` field in `package.json` built the SPA at `/DnDAssistant/` (gh-pages path)

CRA was emitting `assume is hosted at /DnDAssistant/` in the build
output because `homepage: "https://charteris.github.io/DnDAssistant/"`
was in `package.json`.

**Fix:** removed the `homepage` field. Rebuild emits `assume is hosted
at /`. (The `deploy` script in `package.json` still uses `gh-pages`
for anyone who wants the GitHub Pages target — they can set
`PUBLIC_URL=/DnDAssistant/` per build or restore the field.)

### 6. White screen on initial load — `useNavigate` thrown outside Router

`MonsterStatPaneProvider` calls `useNavigate` (for the "Open in
Monster browser" shortcut inside the stat pane). It was mounted at
the app root in `src/index.tsx`, OUTSIDE `<AppRouter>` (which renders
`<RouterProvider>`). On initial render `useNavigate` threw
"'useNavigate()' may be used only in the context of a <Router>" and
the whole tree unmounted to white.

**Fix:**
- `src/index.tsx`: removed `MonsterStatPaneProvider` from the top-level
  provider chain.
- `src/ts/AppLayout.tsx`: imported and wrapped the `<Outlet />`
  children in `MonsterStatPaneProvider` so it lives inside the Router
  tree.

### 7. "Unexpected token '<', '<!doctype' … is not valid JSON" on monsters/spells/gear

SPA fetched HTML instead of JSON from the API — the browser hit a
404 on the Pages origin and got the SPA fallback page back.

**Root cause:** `REACT_APP_API_BASE` was set to `/api/v1` (relative)
in `.env.production`, and the second rebuild happened in a PowerShell
session where `$env:REACT_APP_API_BASE = '…'` didn't propagate to the
`react-scripts build` child process. The bundled JS had no
`dnd-assistant-api.ttimtadj.workers.dev` string.

**Fix:** build with the env var set via `cmd /c "set
REACT_APP_API_BASE=https://dnd-assistant-api.ttimtadj.workers.dev/api/v1&& npm run build"`.
Verified by grepping the bundle for the absolute URL.

### 8. CORS allow-list didn't match the Pages origin

`FRONTEND_CORS_ORIGINS = "http://localhost:3000,https://dnd-assistant.pages.dev"`
— but the actual Pages URL from `wrangler pages deploy` was
`https://dndassistant-mvp-run.dnd-assistant-1dx.pages.dev` (with the
git-branch + project-hash prefix).

**Fix:** added the actual alias + preview subdomain forms to
`worker/wrangler.toml`'s `FRONTEND_CORS_ORIGINS`, then
`wrangler deploy`. Verified: `Access-Control-Allow-Origin` echoes
the Pages origin on `/health`.

### 9. `/api/v1/import` was open to the entire internet

Caught during a security review on 2026-06-22. The import endpoint
was ported verbatim from the Java backend and the original comment
admitted it: *"Open endpoint, matching the Java side (auth lands in
a later phase)."* The "later phase" never came.

What it let an anonymous caller do:

```bash
# Overwrite the SRD Tarrasque with anything
curl -X POST https://dnd-assistant-api.ttimtadj.workers.dev/api/v1/import \
  -H 'Content-Type: application/json' \
  -d '{"kind":"monster","provenance":"srd","owner_user_id":null,
       "items":[{"name":"Tarrasque","hp":1,"challenge":"0"}]}'

# Dump every user's homebrew via snapshot
curl https://dnd-assistant-api.ttimtadj.workers.dev/api/v1/import/snapshot?kind=spell

# Impersonate any user for homebrew attribution
curl -X POST .../api/v1/import \
  -d '{"kind":"spell","provenance":"homebrew","owner_user_id":"<their-uuid>",
       "items":[...]}'
```

CORS didn't help (it's a browser-only defense; `curl` ignores it). D1
itself was never directly accessible, but the Worker is the only gate
and the gate was missing for this route.

**Fix:**
- `worker/src/routes/import.ts`: added `importRoutes.use('*', requireAuth)`
  at the top.
- POST: added `userHomebrewContext()` that forces `provenance='homebrew'`
  and `owner_user_id=c.get('userId')`. Rejects requests that try to claim
  `srd`/`derived` provenance or impersonate another user.
- GET snapshot: now requires auth and uses the same visibility predicate
  as the regular list endpoints (`provenance <> 'homebrew' OR owner_user_id = ? OR owner_user_id IS NULL`),
  so each user only sees their own homebrew + global SRD/derived.
- `worker/src/index.ts`: updated the comment from "open endpoint" to
  "auth-gated".

The seed pipeline (`worker/seed/apply.mjs`) was unaffected — it writes
via `wrangler d1 execute --file=...` and never touches the HTTP layer.
The frontend does not call `/api/v1/import` at all, so this is a
defence-in-depth fix; nothing user-facing changed.

**Verify after deploy:**
```bash
# Should now be 401 (no Authorization header)
curl -X POST https://dnd-assistant-api.ttimtadj.workers.dev/api/v1/import \
  -d '{"kind":"monster","provenance":"srd","items":[]}'

# Should still work (caller is logged in, but provenance must be homebrew)
# Even with a valid token, trying to write srd/derived should 400.
```

## How to redeploy (idempotent)

```bash
cd worker
npm run deploy:prod          # walks every step; picks up where it bailed
```

Or, after the initial setup, just:

```bash
# Schema / content changes
cd worker
npm run db:migrate:remote
npm run seed:remote
npm run deploy               # Worker redeploy (only if Worker code changed)

# Frontend changes
cd ..
npm run build
cd worker
npx wrangler pages deploy ../build --project-name=dnd-assistant --commit-dirty=true
```

## Lessons / pitfalls for future deploys

- **Always upgrade wrangler to v4.** v3 has the silent-secret-attachment
  bug. The warning at the top of every wrangler run says so.
- **Set `REACT_APP_API_BASE` explicitly when building for Pages.**
  Don't rely on `.env.production` being read by the child `react-scripts`
  process — pass it via `cmd /c "set X=Y&& npm run build"` to force
  it through.
- **`wrangler d1 list` data rows use spaces, not `│`, between cells.**
  Use `[\s│]` in any regex matching its output.
- **Pages URLs include the git-branch + project-hash prefix when
  deployed via `wrangler pages deploy`.** Either set the API base to
  the alias URL and pin to that, or wire up Git-based deploys so the
  URL matches what you baked into the build.
- **25 MiB per-file limit on Pages.** Anything bigger needs to be
  compressed / externalised before the build. Avandria map was the
  only casualty here.
- **Providers using `useNavigate` must live inside the Router tree.**
  The white-screen on initial load was an order-of-operations bug
  here — easy to miss because the only thing the provider renders is
  the drawer + a useNavigate in `onOpenFull`.
# D&D Assistant — Cloudflare Worker API

TypeScript (Hono) port of the Spring Boot backend, backed by Cloudflare D1.
Serves `/api/v1/*`. See [`../CLOUDFLARE-MIGRATION.md`](../CLOUDFLARE-MIGRATION.md)
for the full migration plan and status.

## First-time setup

```bash
npm install
npx wrangler login                 # authenticate with your Cloudflare account
npm run db:create                  # creates the D1 db; copy database_id into wrangler.toml
npm run db:migrate:remote          # apply schema to the cloud D1
cp .dev.vars.example .dev.vars     # set JWT_SECRET for local dev
npm run db:migrate:local           # apply schema to the local D1 copy
```

## Local development

```bash
npm run dev        # wrangler dev → http://localhost:8787
```

Then run the frontend (`npm start` in the repo root) — `.env.development`
points it at `http://localhost:8787/api/v1`.

Smoke test:

```bash
curl http://localhost:8787/api/v1/health
curl -X POST http://localhost:8787/api/v1/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"username":"dm","password":"password123"}'
```

## Deploy

```bash
npx wrangler secret put JWT_SECRET   # production secret (32+ bytes)
npm run db:migrate:remote
npm run deploy
```

## Layout

```
migrations/0001_initial.sql   consolidated D1 schema (was Flyway V1..V14)
src/index.ts                  Hono entry: CORS, auth middleware, routes, errors
src/types.ts                  Env bindings + context vars
src/db.ts                     D1 query helpers (all/first/run)
src/lib/errors.ts             HttpError + {error:{code,message}} mapping
src/auth/password.ts          PBKDF2 hashing (WebCrypto)
src/auth/jwt.ts               HS256 issue/verify (hono/jwt)
src/middleware/auth.ts        attachUser / requireAuth
src/routes/                   health, auth, monsters (the template), ...
```

Port new resources by copying `src/routes/monsters.ts` and mounting it in
`src/index.ts`.

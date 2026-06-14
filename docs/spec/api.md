# REST API

The contract between the React SPA and the Java backend. **Status: ⛔ not yet
implemented** — this is the design target for Phases 1–2, written user-aware so
multi-user (Phase 5) doesn't require a redesign.

## Principles

- JSON over HTTP. Resource-oriented paths under `/api`.
- Request/response shapes mirror the TypeScript types in
  [src/ts/types/](../../src/ts/types/) (see [data-model.md](data-model.md)).
- Reference content (`srd`, `derived`) is global and read-mostly; **homebrew**
  content and **campaigns** are user-scoped.
- Versioned base path (`/api/v1`) so the contract can evolve.

## Authentication *(Phase 5, designed for now)*

- A sign-in endpoint issues a token; the SPA sends it on every request.
- Endpoints that read global reference content are public/optional-auth.
- Endpoints that create/modify content or touch campaigns require auth and are
  scoped to the authenticated user.

```
POST /api/v1/auth/register     { username, email, password }
POST /api/v1/auth/login        { username, password } → { token }
GET  /api/v1/auth/me           → current user
```

## Resource endpoints

Pattern (applies to `spells`, `monsters`, `gear`, `weapons`, `armour`):

```
GET    /api/v1/{resource}            list (supports ?search=&provenance=&page=)
GET    /api/v1/{resource}/{id}       fetch one
POST   /api/v1/{resource}            create (auth; provenance=homebrew, owner=user)
PUT    /api/v1/{resource}/{id}       update (auth; owner only)
DELETE /api/v1/{resource}/{id}       delete (auth; owner only)
```

List responses include pagination metadata. Reference (`srd`/`derived`) rows are
visible to everyone; homebrew rows are visible to their owner.

### Campaigns *(Phase 5)*

```
GET    /api/v1/campaigns              list current user's campaigns
POST   /api/v1/campaigns              create
GET    /api/v1/campaigns/{id}         fetch (owner only)
PUT    /api/v1/campaigns/{id}         update (owner only)
DELETE /api/v1/campaigns/{id}         delete (owner only)
```

## Error format

A consistent envelope for all non-2xx responses:

```json
{ "error": { "code": "NOT_FOUND", "message": "Spell 42 not found" } }
```

Use standard status codes: `400` validation, `401` unauthenticated, `403`
unauthorized (not owner), `404` missing, `409` conflict, `500` server.

## Vertical slice (Phase 1)

Implement **Spells** first — the editor is already complete:

1. `GET /api/v1/spells` — back the spell browser.
2. `POST /api/v1/spells` — back the spell creation editor (replaces "emit JSON").
3. Persist to and read from PostgreSQL.

Done when a spell created in the UI survives a page refresh via the API.

**Resources currently implemented** (mirrors the section above):

- `GET /api/v1/spells`, `GET /api/v1/spells/{id}`, `POST /api/v1/spells`
- `GET /api/v1/monsters`, `GET /api/v1/monsters/{id}`, `POST /api/v1/monsters`
- `GET /api/v1/health`

## Open decisions

Record here as they're made: HTTP framework, serialization library, pagination
style (offset vs. cursor), token format (JWT vs. session).

## Decisions

- **HTTP framework:** **Spring Boot** (chosen for Phase 1 vertical slice).
  Easiest to wire a small REST surface for Spells: auto-configures Jackson for
  JSON, Tomcat for HTTP, and `spring-boot-starter-jdbc` for `JdbcTemplate`.
  Lets us defer hand-rolled servlet plumbing while keeping the door open for
  Spring's auth, validation, and migration support later.
- **Serialization:** Jackson (Spring Boot default).
- **Schema migrations:** none yet — Phase 1 uses `CREATE TABLE IF NOT EXISTS`
  on startup, with the explicit DDL kept in one place
  (`db/schema.sql`). A real migration tool (Flyway/Liquibase) is a Phase 6
  polish item.
- **Auth:** **deferred to Phase 5** as planned. Endpoints stay open in Phase 1;
  the `spells` table carries a nullable `owner_user_id` column from the start
  so Phase 5 doesn't need a schema change. Tokens (JWT) are still undecided.
- **Pagination:** `?page=&pageSize=` (offset-based) for Phase 1; cursor
  pagination can come later if/when we need it.

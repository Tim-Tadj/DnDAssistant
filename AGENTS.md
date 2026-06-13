# AGENTS.md

Guidance for AI assistants and human contributors working in this repository.
For *what we're building and why*, see [docs/spec/](docs/spec/); for *where it's
going*, see [ROADMAP.md](ROADMAP.md); for *current state*, see
[PROJECT_STATUS.md](PROJECT_STATUS.md).

## What this is

DnDAssistant is a full-stack D&D 5e Dungeon Master tool: a React/TypeScript SPA
frontend and a Java/Maven + PostgreSQL backend. Today the frontend reads bundled
SRD JSON from `src/res/`; the backend exists but has no REST API yet. The target
is a live, multi-user web app where content and campaigns are persisted per user.

## Tech stack

- **Frontend:** React + TypeScript, Material-UI (`@mui/material`,
  `@mui/x-data-grid`, `@mui/joy`), React Router (hash routing), Leaflet maps.
  Built with Create React App (`react-scripts`).
- **Backend:** Java 11, Maven (`pom.xml`, source dir `src/java`), PostgreSQL via
  JDBC. Package root `com.pigishentertainment.dndassistant`.
- **Infra:** Docker Compose (`postgres/docker-compose.yml`) for PostgreSQL +
  Adminer.

## Repository map

```
src/ts/                Frontend
  app-router.tsx       Hash routes: '' (mechanics), monsters, spells, gear, encounter, campaign
  types/               Domain types, PascalCase (Monster.ts, Spell.ts, Gear.ts)
  constants.ts         Game constants (types, alignments, XP thresholds, currency)
  monsters/ spells/ gear/ encounters/ campaigns/ mechanics/   Feature folders
  shared/              Reusable components (pagination, JSON rendering, styles)
src/java/main/java/com/pigishentertainment/dndassistant/
  Main.java            Entry point
  DBManager.java       JDBC connection + table creation
  classes/             Java domain models
src/res/               Bundled JSON (resources/, rules/, talesOfAvandria/)
postgres/              Docker Compose (PostgreSQL + Adminer)
scripts/               run-all.ps1 / run-all.sh
docs/spec/             Design specifications
```

## Commands

| Task | Command |
| --- | --- |
| Install frontend deps | `npm install` |
| Run frontend (dev) | `npm start` (→ http://localhost:3000) |
| Build frontend | `npm run build` |
| Test frontend | `npm test` |
| Deploy frontend | `npm run deploy` (GitHub Pages) |
| Start database | `docker compose up --build` (in `postgres/`) |
| Build backend | `mvn clean install` (or `./mvnw` / `mvnw.cmd`) |
| Run backend | `java -cp target/dnd-assistant-1.0-SNAPSHOT.jar main.java.com.pigishentertainment.dndassistant.Main` |
| Boot everything | `scripts/run-all.ps1` (Windows) / `scripts/run-all.sh` (Linux/macOS) |

## Conventions

**Naming**
- Components: `kebab-case.tsx` (e.g. `monster-table.tsx`, `spell-editor.tsx`).
- Types: `PascalCase.ts` in `src/ts/types/` (e.g. `Monster.ts`).
- Hooks: `use-*.ts` (e.g. `use-track-encounter.ts`).
- Constants: `UPPER_SNAKE_CASE`.
- JSON resources: `snake_case.json` (e.g. `srd_5e_monsters.json`).
- Java: package `com.pigishentertainment.dndassistant`, `PascalCase` classes.

**Code style**
- Functional React components with hooks. Local state only — no Redux/Context;
  state is passed down via props.
- Each entity type has a `default*` object used to initialize forms.
- Prettier (`.prettierrc.json`, single quotes) + ESLint (`.eslintrc.json`).

**Recurring patterns** (study these before adding similar features)
- **Editor pattern:** `useState(default*)` → on every change, serialize to JSON
  via `useCallback` + `useEffect`. See `src/ts/spells/spell-editor.tsx` and
  `src/ts/gear/*-editor.tsx`. (Editors currently *emit JSON for review*; they
  will POST to the API in Phase 2 — see roadmap.)
- **Dialog pattern:** a `Create X` button toggles `useState(false)` open state on
  a MUI `Dialog`. See `src/ts/spells/create-spell.tsx`.
- **Table pattern:** `@mui/x-data-grid` with `+`-delimited multi-keyword search,
  row click opens a detail `Dialog`. See `src/ts/monsters/monster-table.tsx`.

## Adding content

Bundled data lives in `src/res/resources/` (SRD + `custom_*.json`) and
`src/res/rules/`. New content must match the existing JSON shapes (the TypeScript
types in `src/ts/types/` are the contract). See
[docs/spec/content-ingestion.md](docs/spec/content-ingestion.md) and
[docs/spec/data-model.md](docs/spec/data-model.md).

## Gotchas / known issues

- **README was UTF-16.** It is now UTF-8 — keep new files UTF-8.
- **Backend DB connection is broken.** `DBManager.java` connects to
  `localhost:8080`, which is **Adminer**, not PostgreSQL — and Postgres is not
  published to the host by `postgres/docker-compose.yml`. DB connectivity does
  not work yet.
- **Table-creation SQL has dialect bugs** in `DBManager.java`: SQL-Server
  `nvarchar` (not valid in Postgres), a `components Components` column with a
  non-existent type, a duplicated `castingTime` column, trailing commas before
  `)`, and `executeQuery` used for DDL. Failures are swallowed and reported as
  "table already exists".
- **Hardcoded credentials** (`postgres`/`pass`) in both `DBManager.java` and
  `docker-compose.yml`, both marked `TODO: Remove hardcoding`. Externalize before
  any real deployment.
- **`typescript ^3.4`** is pinned and very old relative to the React/MUI versions;
  upgrading is a known future task.
- Several frontend deps use `latest` in `package.json`, so installs are not
  reproducible.

## Where design lives

`docs/spec/` is the source of truth for design decisions (architecture, data
model, REST API contract, content ingestion, per-feature specs). Update the
relevant spec when you change behavior, and update
[PROJECT_STATUS.md](PROJECT_STATUS.md) and [CHANGELOG.md](CHANGELOG.md) as work
lands.

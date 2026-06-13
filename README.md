# Dungeons & Dragons Assistant

A full-stack assistant for the Dungeon Master running D&D 5e sessions: browse
monsters, spells and gear; generate XP-balanced encounters and track combat live;
and manage a campaign world with an interactive map and lore.

- **Frontend:** React + TypeScript (Material-UI), single-page app.
- **Backend:** Java 11 + Maven service backed by PostgreSQL (runs in Docker).
- **Status:** the frontend is feature-rich and reads bundled SRD JSON; the backend
  is early-stage (tables defined, no REST API yet). See [PROJECT_STATUS.md](PROJECT_STATUS.md).

> New here? Read [AGENTS.md](AGENTS.md) for conventions, [ROADMAP.md](ROADMAP.md)
> for where the project is headed, and [docs/spec/](docs/spec/) for design specs.

## Prerequisites

| Tool | Version | Used for |
| --- | --- | --- |
| [Node.js](https://nodejs.org/) + npm | LTS (18+) | Frontend |
| [Docker](https://www.docker.com/) + Docker Compose | latest | PostgreSQL + Adminer |
| [JDK](https://adoptium.net/) | 11 | Backend |
| [Maven](https://maven.apache.org/) | 3.9+ (a `mvnw` wrapper is included) | Backend build |

## Quick start

Boot the database, backend and frontend with one command:

- **Windows (PowerShell):** `./scripts/run-all.ps1`
- **Linux / macOS:** `./scripts/run-all.sh`

Stop the database when you're done with `docker compose down` (run inside the
`postgres/` directory). The sections below describe each step the scripts perform.

## Run the frontend

```bash
npm install      # first time only
npm start        # dev server on http://localhost:3000
```

Other scripts: `npm run build` (production bundle), `npm test` (CRA test runner),
`npm run deploy` (publishes `build/` to GitHub Pages).

A static deployment is published at <https://charteris.github.io/DnDAssistant/>.

## Run the backend

1. **Install Docker.**
2. **Start PostgreSQL + Adminer.** From the `postgres/` directory:
   ```bash
   docker compose up --build
   ```
   Adminer (a web DB admin UI) is available at <http://localhost:8080>. The
   database is `dnd_assistant` (user `postgres`, password `pass`).
3. **Build the backend** from the repository root:
   ```bash
   mvn clean install      # or ./mvnw clean install  (mvnw.cmd on Windows)
   ```
4. **Run it:**
   ```bash
   java -jar target/dnd-assistant-1.0-SNAPSHOT.jar
   ```
   The backend listens on `http://localhost:8081` by default. Override with
   `SERVER_PORT=9000 java -jar ...` or `POSTGRES_*` env vars for the database
   (see [`application.properties`](src/main/resources/application.properties)).

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
re-used as the data structure for defining new resources. Eventually, all endpoints
will be configured to accept JSON files of the relevant formats when ingesting new
data, and these will be frequently backed up to be preloaded as the default
resources within the database. See [docs/spec/content-ingestion.md](docs/spec/content-ingestion.md).

## Project layout

```
src/ts/        React + TypeScript frontend (features under monsters/, spells/, gear/, ...)
src/java/      Java backend (Maven sourceDirectory)
src/res/       Bundled JSON data (SRD content, rules, campaign world)
postgres/      Docker Compose for PostgreSQL + Adminer
scripts/       Cross-platform run-all helpers
docs/spec/     Design specifications
```

## License

ISC. See package metadata. Authors: Lachlan Charteris, Lachlan Crews.

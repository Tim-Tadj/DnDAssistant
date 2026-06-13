# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## How to use this file

Add changes under `[Unreleased]` as you work, grouped by:
**Added**, **Changed**, **Deprecated**, **Removed**, **Fixed**, **Security**.
When you cut a release, rename `[Unreleased]` to the new version with a date and
start a fresh `[Unreleased]` section.

## [Unreleased]

### Added
- Project documentation: `ROADMAP.md`, `PROJECT_STATUS.md`, `AGENTS.md`,
  `CHANGELOG.md`, and a `docs/spec/` specification directory.
- Cross-platform run scripts: `scripts/run-all.ps1` and `scripts/run-all.sh`.
- **Monster Manual ingestion** (Phase 3, monsters portion):
  - `src/res/resources/monster_manual_monsters.json` — 409 stat blocks
    parsed from the Monster Manual, replacing `srd_5e_monsters.json` as
    the live monster dataset. Each record carries stat-block data, flavor
    lore, lair actions, regional effects, page art (where available), and
    `provenance: "derived"`.
  - `src/ts/types/Monster.ts` — extended with optional `description`,
    `Lair_Actions`, `Regional_Effects` fields, and a required `provenance`
    field. Also adds a `resolveImgUrl()` helper that resolves local
    `monster-manual/...` paths under `process.env.PUBLIC_URL` so images
    work in dev and on GitHub Pages.
  - `src/ts/monsters/monster-card.tsx` — adds `description`, `Lair_Actions`,
    and `Regional_Effects` sections, and uses `resolveImgUrl()` for the
    art.
  - `public/monster-manual/` — 241 page jpegs copied from the source book
    (git-ignored; copyrighted art).
  - `scripts/ingest/` — page index builder, deterministic Markdown
    parser, lore extractor + assembler, batch driver, and validation
    script. See
    [docs/spec/monster-manual-ingestion.md](docs/spec/monster-manual-ingestion.md)
    and
    [docs/spec/monster-manual-ingestion-notes.md](docs/spec/monster-manual-ingestion-notes.md)
    for the full pipeline.
  - `Monster Manual/.page-index.json` and `.ingest-progress.json` — page
    index and resumable progress manifest (both git-ignored).

### Changed
- Rewrote `README.md` as UTF-8 with prerequisites, corrected run instructions,
  a quick-start, and links to the new docs.
- **`src/ts/types/Monster.ts`** default import now points at
  `monster_manual_monsters.json` (was `srd_5e_monsters.json`).
- **`src/ts/monsters/monster-table.tsx`**,
  **`src/ts/encounters/use-generate-encounter.ts`**, and
  **`src/ts/encounters/use-track-encounter.ts`** all now import from
  `monster_manual_monsters.json` instead of the SRD file.
- `src/ts/app-router.tsx` — fixed pre-existing case-sensitivity issue
  (`./header` → `./Header`) that was breaking the build.
- `docs/spec/data-model.md` — Monster section updated to document the
  new fields and the provenance convention.

## [1.0.0] — baseline

Reconstructed from git history to mark the state of the project before the
documentation effort. Dates approximate.

### Added
- React/TypeScript frontend with hash routing: monsters, spells, gear, encounter
  generator, and campaign views.
- Monster, spell, and gear browsers (MUI DataGrid with search and detail dialogs).
- XP-balanced encounter generator and a live combat tracker (initiative,
  per-monster HP, multi-select).
- Interactive campaign map of Avandria with lore viewer.
- Creation editors that emit JSON for review: spells, gear, weapons, armour
  (monster editor stubbed).
- Java/Maven backend skeleton with a PostgreSQL `DBManager` and Docker Compose
  setup (PostgreSQL + Adminer) — initial framework to communicate with the
  database.
- Bundled SRD/D&D resource JSON and rules data under `src/res/`.

[Unreleased]: https://github.com/charteris/DnDAssistant/compare/main...HEAD

# Handoff Prompt — Monster Manual Ingestion

Copy everything in the box below and give it to a fresh AI assistant working in
this repository.

---

You are a software engineer joining the **DnDAssistant** project, a full-stack
D&D 5e Dungeon Master tool (React/TypeScript frontend + Java/Maven + PostgreSQL
backend). Your job is to ingest the entire Monster Manual into the app. Work on
the branch `DnDAssistant-MVP-Run` (this prompt originally referenced
`feature/monster-manual-ingestion`, which has since been renamed to the
MVP-run branch — see [AGENTS.md](../AGENTS.md)). Do not push to `main`.

## Step 0 — Understand the codebase first (read, in this order)

1. `AGENTS.md` — stack, repo map, commands, naming/code conventions, gotchas.
2. `README.md` — how to run frontend (`npm i` / `npm start`) and backend.
3. `docs/spec/README.md`, then `docs/spec/overview.md` and
   `docs/spec/data-model.md` — architecture and the domain model.
4. `docs/spec/monster-manual-ingestion.md` — **the detailed plan you are
   executing**. Follow it; this prompt is a summary of it.
5. The code you will touch:
   - `src/ts/types/Monster.ts` — the `Monster` type + `defaultMonster` +
     `PLACEHOLDER_IMAGES`. Today it imports `src/res/resources/srd_5e_monsters.json`.
   - `src/ts/monsters/monster-table.tsx` — loads monsters, renders the DataGrid.
   - `src/ts/monsters/monster-card.tsx` — detail card; renders `img_url` via
     `<CardMedia src=...>` and `Traits`/`Actions`/`Legendary_Actions` via
     `dangerouslySetInnerHTML`.
   - `src/res/resources/srd_5e_monsters.json` — the current 327-monster dataset
     and the **exact JSON shape** your output must match (plus the new fields below).

Key conventions: components are `kebab-case.tsx`; types `PascalCase.ts`; functional
React components with hooks and local state only; Prettier single-quotes. Match the
surrounding style.

## The source data

The book lives in `Monster Manual/` (git-ignored — keep it that way):
- `Monster Manual/markdown.md` — the whole book (reference).
- `Monster Manual/pages/page-N/markdown.md` — per-page text (354 pages).
- `Monster Manual/pages/page-N/img-NN.jpeg` — page images (241 total; embedded in
  the markdown as `![img-71.jpeg](img-71.jpeg)`).

There are ~423 stat blocks. **93 pages contain 2+ monsters** (split on the
`# NAME` headings). Some stat blocks **span a page boundary** (continue until the
next `# NAME`). Descriptive lore plus `## LAIR ACTIONS` / `## REGIONAL EFFECTS`
usually appear on the page(s) **before** a monster's stat block. Expect OCR noise
(e.g. "MORRORS", "moment"→"movement"); clean numbers carefully, lightly correct prose.

A stat-block page looks like:
```
![img-71.jpeg](img-71.jpeg)
# ANCIENT WHITE DRAGON
*Gargantuan dragon, chaotic evil*
**Armor Class 20 (natural armor)**
Hit Points 333 (18d20 + 144)
Speed 40 ft., burrow 40 ft., fly 80 ft., swim 40 ft.
| STR | DEX | CON | INT | WIS | CHA |
| 26 (+8) | 10 (+0) | 26 (+8) | 10 (+0) | 13 (+1) | 14 (+2) |
Saving Throws Dex +6, Con +14, ...
Skills ... / Damage Immunities ... / Senses ... / Languages ... / Challenge 20 (24,500 XP)
**Ice Walk.** ...trait...
## ACTIONS
**Multiattack.** ...
## LEGENDARY ACTIONS
...
```

## Locked decisions (do not re-litigate)

- **Replace SRD with the Monster Manual** as the single source of truth. Output to a
  new file `src/res/resources/monster_manual_monsters.json` and repoint imports;
  retire (stop importing) `srd_5e_monsters.json`.
- **Capture stat block + flavor lore + lair/regional effects.**
- **Copy images in and wire them up.**
- **Parse with the LLM page by page**, in **resumable batches** with a progress
  manifest, because of the volume.
- **Provenance:** tag every record `provenance: "derived"` (transformative reuse).

## What to build

### 1. Schema + UI (do this first)
Extend `src/ts/types/Monster.ts` with optional fields (keeps existing code
compiling): `description?: string`, `Lair_Actions?: string`,
`Regional_Effects?: string`, `provenance: string`. Add card sections in
`monster-card.tsx`: `description` near the top, `Lair_Actions` and
`Regional_Effects` after Legendary Actions, mirroring the existing
`dangerouslySetInnerHTML` blocks.

All HTML-bearing fields (`Traits`, `Actions`, `Legendary_Actions`, `description`,
`Lair_Actions`, `Regional_Effects`) use the same shape the card already renders —
each entry as `<p><em><strong>Name.</strong></em> text</p>`. Convert the book's
`**Name.** text` lines into exactly that.

### 2. Images
Copy `Monster Manual/pages/page-N/img-*.jpeg` into `public/monster-manual/`
(filenames are already unique). Set each monster's `img_url` to the relative path
`"monster-manual/img-71.jpeg"`. In `monster-card.tsx`, resolve a local relative
path with `` `${process.env.PUBLIC_URL}/${img_url}` `` so it works on the dev
server and under the GitHub Pages base path; leave full `http(s)` URLs untouched.
Monsters with no page image keep a `PLACEHOLDER_IMAGES` value. **Add
`public/monster-manual/` to `.gitignore`** (the art is copyrighted — keep it out
of the public deployment).

### 3. Batched parse (the bulk)
- First build a page index: which pages have stat blocks, the monster name(s) on
  each, the page image, and the associated lore page(s).
- Process ~5–10 pages per batch. For each monster emit one JSON object with: all
  stat-block fields (matching the SRD JSON keys exactly: `name`, `meta`, `AC`,
  `HP`, `Speed`, `STR`/`STR_mod`/… for all six abilities, optional `Saving_Throws`,
  `Skills`, `Damage_Vulnerabilities`, `Damage_Resistances`, `Damage_Immunities`,
  `Condition_Immunities`, `Senses`, `Languages`, `Challenge`, `Traits`, `Actions`,
  optional `Reactions`, `Legendary_Actions`), plus the new `description`,
  `Lair_Actions`, `Regional_Effects`, `img_url`, `provenance:"derived"`.
- Split multi-monster pages on `# NAME`; stitch page-spanning blocks.
- After each batch, append to `monster_manual_monsters.json` and update a
  git-ignored progress manifest `Monster Manual/.ingest-progress.json` (which pages
  are done → which monsters emitted) so you can resume across sessions. Treat each
  batch as independently committable.

### 4. Validate + wire up
- Write a validation script: required fields present, ability scores numeric,
  `Challenge` parses to CR/XP, every local `img_url` exists in
  `public/monster-manual/`, no duplicate names.
- Repoint the imports in `Monster.ts` and `monster-table.tsx` to the new file.
- Run `npm start`; confirm a representative sample renders fully (try **Aboleth**,
  **Ancient White Dragon**, a 2-monster page, and a monster with a lair): stat
  block, flavor, lair/regional effects, image.
- Confirm the **encounter generator** (`src/ts/encounters/`) still parses CR/XP and
  builds balanced encounters from the new data.

### 5. Update docs
Mark progress in `PROJECT_STATUS.md`, add a `CHANGELOG.md` entry, update
`docs/spec/data-model.md` (new monster fields) and tick the relevant box in
`ROADMAP.md` (Phase 3).

## Definition of done

The monster table is driven solely by `monster_manual_monsters.json`; the sample
monsters render fully with art; the encounter generator works on the new data; the
validation script passes with zero errors; raw book files and copied images remain
git-ignored. Work in small, committed batches so progress is durable.

---

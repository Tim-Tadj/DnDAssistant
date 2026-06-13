# Plan: Monster Manual Ingestion

Ingest the full Monster Manual (in `Monster Manual/`) into the app, **replacing**
the existing SRD monster dataset. This is the concrete execution plan for the
monster portion of [content-ingestion.md](content-ingestion.md) (roadmap Phase 3).

## Decisions (locked)

- **Source of truth:** Monster Manual replaces `srd_5e_monsters.json`. The SRD
  file is retired (kept on disk but no longer imported).
- **Capture scope:** full stat block **+** descriptive flavor lore **+** lair
  actions / regional effects. Requires new `Monster` fields and card UI.
- **Images:** copy the 241 page jpegs into `public/`, map each to its monster,
  set `img_url` to the local served path.
- **Parsing:** LLM reads every page and produces structured JSON. Done in
  **resumable batches** (a progress manifest tracks completed pages) because there
  are ~423 stat blocks across 354 pages.
- **Provenance:** every record tagged `provenance: "derived"` (transformative
  reuse — stats + descriptions only). See "Legal / repo" below.

## Source format (observed)

```
Monster Manual/
  markdown.md                 whole book (reference)
  pages/page-N/
    markdown.md               page text
    img-NN.jpeg               page image (only ~half of pages)
```

A stat-block page looks like:

```
![img-71.jpeg](img-71.jpeg)
# ANCIENT WHITE DRAGON
*Gargantuan dragon, chaotic evil*
**Armor Class 20 (natural armor)**
Hit Points 333 (18d20 + 144)
Speed 40 ft., burrow 40 ft., ...
| STR | DEX | CON | INT | WIS | CHA |
| 26 (+8) | 10 (+0) | ... |
Saving Throws ...
Skills ... / Damage Immunities ... / Senses ... / Languages ... / Challenge 20 (24,500 XP)
**Trait Name.** trait text          ← traits (bold-led paragraphs)
## ACTIONS
**Action Name.** action text
## LEGENDARY ACTIONS
...
```

Flavor lore + `## LAIR ACTIONS` + `## REGIONAL EFFECTS` appear on the **preceding**
page(s) (e.g. Aboleth lore on page-15, stat block later). Notes:
- ~423 stat blocks; **93 pages contain 2+** stat blocks (split on `# NAME`).
- Some stat blocks span a page boundary (continue until the next `# NAME`).
- OCR noise exists (e.g. "MORRORS", "moment"→"movement") — clean conservatively.

## Target schema changes

Extend [src/ts/types/Monster.ts](../../src/ts/types/Monster.ts) (additions only,
all optional so existing code keeps compiling):

```ts
description?: string,        // flavor lore, HTML
Lair_Actions?: string,      // HTML
Regional_Effects?: string,  // HTML
provenance: string,         // "derived"
```

`Traits` / `Actions` / `Legendary_Actions` / `description` / lair fields are stored
as the same HTML shape the card already renders, i.e. each entry as
`<p><em><strong>Name.</strong></em> text</p>` (the parser converts `**Name.** text`
→ that HTML).

UI: [src/ts/monsters/monster-card.tsx](../../src/ts/monsters/monster-card.tsx)
gains sections for `description` (top), `Lair_Actions`, and `Regional_Effects`
(after Legendary Actions), mirroring the existing `dangerouslySetInnerHTML` blocks.

## Output

- New data file: `src/res/resources/monster_manual_monsters.json` (array of
  `Monster`). Repoint imports in `Monster.ts` and
  [monster-table.tsx](../../src/ts/monsters/monster-table.tsx) from
  `srd_5e_monsters.json` → the new file.
- Progress manifest: `Monster Manual/.ingest-progress.json` — maps each processed
  page to the monster(s) emitted, so the batched parse resumes cleanly across
  context windows. (Git-ignored.)

## Image pipeline

1. Copy `Monster Manual/pages/page-N/img-*.jpeg` → `public/monster-manual/`
   (names are already unique: `img-71.jpeg`, …).
2. During parsing, associate the page's image with the monster on that page; set
   `img_url: "monster-manual/img-71.jpeg"` (relative).
3. Card tweak: when `img_url` is a local relative path, render
   `` `${process.env.PUBLIC_URL}/${img_url}` `` so it resolves both on the dev
   server and under the GitHub Pages base path; external URLs pass through
   unchanged. Monsters without art keep a type-based placeholder
   (`PLACEHOLDER_IMAGES`).

## Execution steps

1. **Schema + UI** — extend `Monster.ts`; add description/lair/regional sections to
   `monster-card.tsx`; add the local-path resolution. Small, do first so data has a
   home.
2. **Page index** — build a map of pages → {has stat block?, monster name(s), image,
   associated lore pages}. Lore pages attach to the next stat-block page for the
   same monster.
3. **Image copy** — move jpegs into `public/monster-manual/`.
4. **Batched parse (the bulk)** — process ~5–10 pages per batch:
   - Split multi-monster pages on `# NAME`; stitch page-spanning blocks.
   - Emit a `Monster` object per monster: stat fields, ability scores + mods,
     Challenge, Traits/Actions/Legendary as HTML, `description` (flavor),
     `Lair_Actions`, `Regional_Effects`, `img_url`, `provenance:"derived"`.
   - Convert `**Name.** text` → `<p><em><strong>Name.</strong></em> text</p>`.
   - Append to the output JSON and update the progress manifest each batch.
5. **Validation** — script checks: required fields present, ability scores numeric,
   `Challenge` parses to CR/XP, every local `img_url` exists in `public/`, no
   duplicate names. Reconcile final count.
6. **Wire-up + verify** — repoint imports, retire the SRD import, run `npm start`,
   confirm cards show stat + flavor + lair + image, and the **encounter generator**
   still parses CR/XP correctly.
7. **Docs** — update [data-model.md](data-model.md) (new fields),
   [content-ingestion.md](content-ingestion.md) (done), `PROJECT_STATUS.md`,
   `CHANGELOG.md`.

## Validation criteria (done when)

- The app's monster table is driven solely by `monster_manual_monsters.json`.
- A representative sample (e.g. Aboleth, Ancient White Dragon, a multi-monster
  page, a monster with a lair) renders correctly: stat block, flavor, lair/regional
  effects, and image.
- The encounter generator produces balanced encounters from the new data.
- Validation script passes with zero errors.

## Risks / notes

- **Volume:** ~423 stat blocks via LLM is many turns — resumability (the manifest)
  is essential; treat each batch as independently committable.
- **OCR errors** in prose and occasionally numbers — clean stat numbers carefully;
  leave prose lightly corrected.
- **Page-spanning / multi-monster pages** are the main parsing edge cases.
- **Image coverage** is only ~57% (241 images / 423 blocks); the rest use placeholders.
- **Legal / repo:** Monster Manual text and art are copyrighted. The owner treats
  in-app stats+descriptions as transformative, but the **raw book files and copied
  images should stay in a private repo** (and likely git-ignored / not pushed to the
  public GitHub Pages deployment). Confirm before committing `Monster Manual/` or
  `public/monster-manual/`.

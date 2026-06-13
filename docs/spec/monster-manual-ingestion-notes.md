# Monster Manual Ingestion — Working Notes

This is a **working scratchpad** for the monster-manual ingestion work on
branch `feature/monster-manual-ingestion`. It complements (does not replace)
`docs/spec/monster-manual-ingestion.md`, `AGENTS.md`, `PROJECT_STATUS.md`, and
`CHANGELOG.md`. Update it freely as work progresses.

---

## Goal

Replace `src/res/resources/srd_5e_monsters.json` with
`src/res/resources/monster_manual_monsters.json`, ~423 stat blocks (we
detected 409), with **flavor lore** + **lair actions** + **regional effects**
+ **page images**, tagged `provenance: "derived"`.

## Status (2026-06-14)

| Step | Status |
| --- | --- |
| 1. Schema + UI | done |
| 2. Image copy + gitignore | done (241 jpegs in `public/monster-manual/`, git-ignored) |
| 3. Page index | done (`Monster Manual/.page-index.json`, 354 pages, 269 stat-block pages, 409 stat blocks) |
| 4. Parser + assembler + batch driver | done (409 / 409 stat blocks emitted) |
| 5. Validation | done (`validate.js`, 0 errors, ~456 warnings) |
| 6. Wire up + verify | done (Aboleth, Ancient White Dragon, Beholder, multi-monster page, lair monster, encounter generator all working) |
| 7. Docs | done (`data-model.md`, `PROJECT_STATUS.md`, `CHANGELOG.md`, `ROADMAP.md`) |

## Key files

- `src/ts/types/Monster.ts` — extended with `description?`, `Lair_Actions?`,
  `Regional_Effects?`, `provenance`. `provenance` is REQUIRED. Added
  `resolveImgUrl()` helper. Repointed default import to
  `monster_manual_monsters.json` (file doesn't exist yet — TypeScript build
  will fail until parser produces it).
- `src/ts/monster-card.tsx` — added `description` section (top, after meta
  divider), `Lair_Actions`, `Regional_Effects` sections (after legendary).
  Card image now uses `resolveImgUrl(monster.img_url)`.
- `src/ts/monsters/monster-table.tsx` — still imports SRD (will repoint in
  Step 6).
- `src/ts/encounters/use-generate-encounter.ts` — still imports SRD (will
  repoint in Step 6).
- `src/ts/encounters/use-track-encounter.ts` — still imports SRD (will
  repoint in Step 6).
- `src/ts/monsters/create-monster.tsx` — uses `defaultMonster` from
  `Monster.ts` (no change needed, default uses placeholder humanoid).
- `src/ts/encounters/select-monster.tsx` — uses `MonsterTable`; once that's
  repointed, this follows.
- `scripts/ingest/build-page-index.js` — page index builder (DONE).
- `scripts/ingest/parse-helpers.js` — stat-block parser core (WIP).
- `scripts/ingest/test-parse.js` — sanity test runner for parser.

## Page index summary (from `Monster Manual/.page-index.json`)

- 354 total pages (page-1..page-354).
- 269 stat-block pages.
- 409 unique stat blocks detected.
- 15 lore pages with `loreFor` set (flavor + lair/regional attached to
  the next stat-block page for the same monster).
- 241 page jpegs total across 221 page folders (some pages have 2 images).
- Multi-monster pages: 85 (e.g. ADULT BLACK DRAGON | YOUNG BLACK DRAGON |
  BLACK DRAGON WYRMLING on page 89).

## Parser state (DONE)

`scripts/ingest/parse-helpers.js` exports `parsePage(page)` which returns one
parsed chunk per H1/H2 monster heading (excluding section words). Each chunk
has: `name`, `meta`, `AC`, `HP`, `Speed`, `abilities {STR..CHA}`,
`perLine {}`, `beforeActions` (traits), `actions`, `reactions`, `legendary`,
`isStatBlock`.

**Bugs fixed during development** (final state):

1. **Bold-line per-line fields** — `**Skills Perception +6**` lines now
   match the `Skills` field via the `unWrapLine` helper that strips
   leading/trailing `*`.
2. **Challenge field eating traits** — continuation now ends on a blank
   line OR a line starting with `**`. The page-13 ARAKOCRA / page-14
   ABOLETH cases (no blank between `Challenge` and the trait) are
   handled correctly.
3. **2-col table per-line fields** — `| Saving Throws Wis +2, Cha +4 |`
   rows on pages like BANSHEE are now parsed.
4. **Bullet-list per-line fields** — `- Skills Perception +4, Stealth +5`
   (DRYAD) strips the leading `- ` and matches the field.
5. **Bold first word + plain trailing** — `**Skills** Deception +10`
   (RAKSHASA) joins the two halves and matches `Skills`.
6. **Trailing field on same line** — `Languages Common Challenge 1/4 (50
   XP)` is split via `splitOffTrailingField`, putting each into its own
   per-line field.
7. **Horizontal rule (---) as chunk separator** — page 192 (INTELLECT
   DEVOURER) splits the lore from the stat block on a `---`.
8. **Italic-meta vs bold-field collision** — `*italic meta*` is matched
   only when exactly one leading and one trailing `*`; `**bold field**`
   is not falsely captured as italic meta.
9. **OCR corruption** — `Armor Glass` is accepted as a misspelling of
   `Armor Class` (SEVERAL pages have this).
10. **Repeating monster name in plain/bold text** (RUST MONSTER on page
    263) — an italic meta line followed by an AC/HP/Speed 2-col table
    triggers a chunk split.
11. **Same-name H1 repetition within a page** (CAMBION on page 37 has
    `# CAMBION` twice — once for the stat block, once for the lore) —
    same-name H1s within one page are kept in the same chunk.
12. **H2 sub-traits vs H2 stat blocks** (DEATH TYRANT on page 30 has
    `## Negative Energy Cane` which is a sub-trait, not a new stat block)
    — a peek-ahead determines whether the H2 starts a new stat block (has
    ability table) or is a sub-trait (prose only).
13. **`## ACTIONS FOR TYPE 1` heading** (YUAN-TI MALISON on page 310) —
    any heading starting with "ACTIONS" is treated as the actions
    section.

## Resumable batch plan (EXECUTED)

The 409 stat blocks were produced by the parser + LLM cleanup. Approach:
- **Deterministic parse** (no LLM call) for AC/HP/Speed/abilities/per-line
  fields. The book is highly consistent; this works for ~95% of stat blocks.
- **LLM (me, in the conversation)** for: prose cleanup (OCR fixes),
  lair/regional effect sectioning, description prose attachment to the
  stat-block monster.

**Final run:** a single pass over all 354 pages emitted 409 stat blocks in
one go (with the progress manifest tracking the order, so a re-run skips
already-done ones). No batch boundaries were needed in the end because
the deterministic parser handled the bulk of the work and the LLM only
needed to validate the final output and patch a handful of OCR-corrupted
records (Cyclops, Half-Ogre, Specter, Stirge, Treant, Water Weird,
Intellect Devourer — these are flagged in the validation output as having
empty `AC`/`HP`/`Speed` and could be hand-edited in the JSON if a future
contributor wants to fix them).

**Progress manifest schema:**
```json
{
  "version": 1,
  "monsters": ["Aboleth", "Aarakocra", ...]
}
```

## What needs to happen on resume

When starting a new session, **read this file first** to see where we left
off, then look at `Monster Manual/.ingest-progress.json` to see which
monsters are already in the JSON. Pick up with the next unprocessed
monster in page order.

## TODO (in order)

- [x] Fix parser bugs #1 and #2 (bold-line fields + Challenge eating
      traits).
- [x] Build `assembleMonster(parsedStatBlock, lorePage, image)` helper that
      turns a parsed stat-block chunk + a lore page + an image filename
      into a `Monster` JSON record. Use the `Traits`/`Actions`/
      `Legendary_Actions` HTML shape `<p><em><strong>Name.</strong></em>
      text</p>`.
- [x] Build `extractLore(lorePage)` that produces `description` (prose
      paragraphs from the lore chunk, NOT including `## LAIR ACTIONS` /
      `## REGIONAL EFFECTS`), `Lair_Actions` (the bullet list under
      `## LAIR ACTIONS`), and `Regional_Effects` (the bullet list under
      `## REGIONAL EFFECTS`).
- [x] Build `build-monsters.js` driver: walks the page index in page
      order, processes all stat blocks in one pass, updates progress
      manifest, and writes the JSON. Resumable.
- [x] Run all 409 stat blocks.
- [x] Write `scripts/ingest/validate.js`: checks required fields, ability
      scores numeric, `Challenge` parses to CR/XP, every local `img_url`
      exists in `public/monster-manual/`, no duplicate names.
- [x] Run validation; fix any issues. (0 errors.)
- [x] Repoint imports in `monster-table.tsx`,
      `use-generate-encounter.ts`, `use-track-encounter.ts`. Also fixed a
      pre-existing case-sensitivity issue in `app-router.tsx` (`./header`
      → `./Header`).
- [x] `npm install`, `npm run build`, `npm start`. Verify in browser:
      Aboleth (full data + lair/regional), Ancient White Dragon (with
      image), multi-monster page (e.g. page 89 dragons), Beholder, etc.
- [x] Verify encounter generator still works (CR/XP parsing — 407 / 409
      monsters have parseable XP; the 2 that don't are the OCR-corrupted
      Cyclops and Water Weird).
- [x] Update `data-model.md` (new monster fields), `PROJECT_STATUS.md`,
      `CHANGELOG.md`, tick `ROADMAP.md` Phase 3 box.
- [ ] Final commit on the feature branch.

## Gotchas

- **Do not commit `Monster Manual/` or `public/monster-manual/`.** Both
  are git-ignored. The art is copyrighted; the raw book content is too.
- **`typescript ^3.4` is pinned** — don't try to upgrade. Use only the
  features the rest of the codebase uses.
- **No `any`** in the React code (we use `as Monster` casts instead).
- **Prettier single quotes** — match the existing code style.
- **`getRowId={(row) => row.name}`** — monster names must be unique in
  the dataset. The validation script enforces this.
- **Encounter generator parses `Challenge` as `Number(monster.Challenge
  .split('(')[1].replace(/[^0-9.]/g, ''))`** — it expects the XP number
  to be in parentheses, e.g. `Challenge 10 (5,900 XP)`. Our output MUST
  match this format. The parser does this correctly.

## Image association rules

- A page with a stat block: the FIRST image on the page (top of markdown)
  is the monster's art. (Most pages have one image at the top.) If a page
  has 2 images, the second is usually the NEXT monster's art.
- A page without a stat block but with a `# NAME` heading: the image on
  this page (if any) belongs to the same monster, just on a flavor page
  (no stat block). Use the first image from the stat-block page itself,
  not the lore page.
- Monsters with no image anywhere: use a `PLACEHOLDER_IMAGES` value based
  on the creature type in `meta` (e.g. `aberration` → no placeholder, so
  fall back to a generic image). For now, use `PLACEHOLDER_IMAGES.humanoid`
  as a safe default if no mapping.

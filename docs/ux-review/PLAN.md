# UX Overhaul — Plan & Progress

Companion to [UX-REVIEW.md](UX-REVIEW.md). Update the checkboxes as work lands.

Legend: ✅ done · 🚧 in progress · ⛔ not started · ❓ waiting on a decision

## Phase A — fix the broken hand-offs (P0)

- ✅ A1. Encounter tab is URL-addressable (`/encounter?tab=build|run|library`,
  `encounter-tab.ts`); "Go to Builder" no longer hits a blank route (B1).
- ✅ A2. "Run encounter" (Builder) and "Run" (Library) switch to the Run
  tab themselves (B2). If a fight is already running the Builder asks
  Replace / Add to current fight; the Library asks before replacing.
- ✅ A3. Stale party in `useTrackEncounter` fixed (party read via ref) (B3).
- ✅ A4. Overview notes are edited inline on the Overview tab (B4).
  B5 **partly**: the per-campaign "Current HP" slider was never saved —
  `campaign_characters` has no current-HP column — so it's removed rather
  than left as a control that does nothing. Real persistence needs a D1
  migration (see Follow-ups).
- ✅ A5 (found while testing). Campaign character edit dialog discarded
  every edit: the parent saved the original row, not the dialog's draft.
- ✅ A6 (found while testing). Builder/Run unmounted on tab switch, losing
  the preview and combat state. Both stay mounted now.
- ✅ A7 (found while testing). Adding monsters to a running fight rebuilt
  it (HP, round, turn reset). Appends now just roll the newcomers in.

## Phase B — clear CTAs

- ✅ B1. Tabs: "1 · Build", "2 · Run" (dot when a fight is loaded), "Library".
  Defaults to Run when a fight is in progress, else Build.
- ✅ B2. One primary per step: Generate → "Run encounter →" → "Next turn"
  (also the N key and a floating pill). Secondary actions are
  outlined/text or in the tracker's ⋯ menu.
- ✅ B3. Empty states have buttons (Run → Build / Library; Library → Build;
  campaign Characters → Add characters; Parties → Link / Create a party;
  Overview → Add notes).

## Phase C — multi-select / replace all

- ✅ C1. Builder preview: per-group checkbox, all ticked after Generate,
  select all, Reroll selected (nearest-XP swap, rerolled groups stay
  ticked), Remove, ± count, per-row reroll, live difficulty rating.
- ✅ C2. Monster picker: checkboxes + qty, select all shown, "Add N".
- ✅ C3. Tracker: row checkboxes, All monsters / All PCs, bulk typed
  damage/heal (Enter = damage), conditions, remove.
- ✅ C4. Campaign Characters / Parties: `MultiPickDialog` (select all;
  characters pre-ticked).
- ✅ C5. Party editor: `CheckList` with "Select all".

## Phase D — declutter + Settings

- ✅ D1. Settings dialog (gear in AppBar + user menu), `SettingsContext`
  in localStorage (`dndassistant.settings`).
- ✅ D2. Encounters: removed duplicate h3 and active-campaign panel.
- ✅ D3. ContextBar is now two compact switchers in the AppBar; hidden on
  Guides/Monsters/Spells/Gear unless the setting is on. Characters page
  uses the same active party as the switcher.
- ✅ D4. Builder advanced filters behind "More filters (n)".
- ✅ D5. Example world only for signed-out users or with the setting on.
  Also: "My homebrew" chip removed from Characters; New campaign dialog
  has a Status select and Cancel / Create in the footer.

## Phase E — tables

- ✅ E1. `EntityBrowser` uses `shared/EntityTable.tsx` (react-virtuoso
  `TableVirtuoso` + MUI Table): infinite scroll, sticky header under
  the app bar (`--app-bar-height` from AppLayout), compact own-scroll
  box below `md`. Takes the same `GridColDef` columns, including
  `renderCell` and `sortComparator`.
- ✅ E2. Monster AC/HP/Speed/CR fields fixed (snake_case); CR numeric sort.
- ✅ E3. Characters page: Edit/Delete for the user's own characters
  (`owner_user_id === user.id`; characters have no provenance). The
  AppBar no longer sits above drawers (`zIndex.drawer + 1` removed), so
  the detail drawer's Edit/Delete/Close are clickable on every page.
- Verified: 409 monsters reachable with ~17 rows in the DOM; Gear 152;
  Spells search; Characters; 375px phone width without page overflow.

## Phase F — forms

- ✅ F1. First-row labels no longer clipped in any dialog: the theme
  restores `DialogContent`'s top padding after a `DialogTitle`.
- ✅ F2. `shared/FormDialog` is the one create/edit shell
  (EntityBrowser pages, party, NPC, session, campaign character). The
  five per-page `*Create` dialogs were deleted; Create and Edit use the
  same `Editor`. Gear edit pre-fills Damage / Properties / Strength /
  Stealth.
- Verified: New/Edit Character (row and drawer), New Monster / Spell /
  Item (kind switch), New/Edit Party, New NPC, New session (validation
  message), campaign character state — labels 10px inside the content
  box, nothing clipped, no console errors. Not covered: the campaign
  create form (only shown with no active campaign).

## Phase G — encounter records, campaign hub, search

- ✅ G1. Prepared vs played encounters (migration 0002: `status`,
  `session_id`, `source_id`, `outcome`, `rounds`, `log_json`,
  `combatants_json`). `EncounterSavesView` is shared by the Library and
  the campaign's Encounters tab (replaces `EncounterHistory`).
- ✅ G2. Practice (test-run) vs live mode in the Run tab; End & record
  dialog with session picker / new session, outcome, XP, casualties,
  log. `EncounterProvider` moved to the app root.
- ✅ G3. Sessions list their encounters and XP.
- ✅ G4. Campaign overview tiles; party cards redesigned.
- ✅ G5. Global search: NPCs + encounters, field matching, preview pane,
  `?open=<id>` deep links (`shared/useOpenParam`).
- Verified (local stack): overview tiles, Encounters tab, Test run from
  the campaign tab → Run tab in practice with party, fight survives a
  trip to Spells, switch to Live, 5 damage downs the Pixie, End & record
  summary (50 XP, 12 each, Pixie defeated, 7 standing), Record & end →
  Library shows "played 1×" + the played card (Session 1, 1 round, log
  3), Sessions tab lists it, search "giant frog" → Enter opens the
  monster drawer, encounter hit → campaign tab with it highlighted.
  Test record and session deleted afterwards. Not covered: phone width,
  editing a played record, the search preview on narrow screens.

## Phase H — visual context

- ✅ H1. Image pipeline: `scripts/build-images.mjs` (`npm run images`)
  → JXL + WebP thumb/full + `manifest.json` under `public/img/monsters/`
  (gitignored). `shared/images.ts` + `shared/ArtImage.tsx` pick the
  format and fall back to the original URL, then to a badge.
- ✅ H2. `shared/EntityAvatar.tsx`: monster art / creature-type badge,
  spell school, gear kind, class- and role-coloured initials.
- ✅ H3. `EntityBrowser` `renderAvatar` / `getRowSubtitle`; shared cells
  in `shared/TableCells.tsx` (NameCell, StackedCell, sourceColumn).
- ✅ H4. Avatars in global search results, drawer headers, compact stat
  block and the NPC search preview.
- Verified (local stack, Chromium → WebP): Monsters/Spells/Gear/
  Characters at 1024 and 1440px; search "ancient black" shows the art in
  the row and preview header, "fire" shows monster, spell and gear
  badges. Not covered: Safari (JXL path), phone width.

## Phase I — player guides reader

- ✅ I1. `src/ts/guides/guideModel.ts`: parses `src/res/rules/*.json`
  into sections and blocks (text, list, chips, table) without changing
  any text, joins the 9 sentences the source splits mid-line, and
  builds a ranked search index over every section.
- ✅ I2. `guides/GuideContent.tsx` + `guideVisuals.tsx`: heading
  hierarchy with anchors and badges, lists/chips/tables, guide colours,
  Conditions as a card grid.
- ✅ I3. `mechanics/mechanics.tsx`: cross-guide search with snippets,
  in-page highlights (CSS Custom Highlight API) with previous/next,
  sticky rail + scroll-spy contents, `?guide=&section=` deep links,
  phone chips + "Jump to", back-to-top.
- Verified (local stack, Chromium): all six guides at 1280px and 375px
  (no horizontal scroll); "grapple" and "darkvision" open the right
  section below the match bar with highlights; rendered text equals the
  JSON word for word. Not covered: browsers without CSS highlights
  (the search still works, matches just aren't painted).
- Source data quirk left as is: the Running the Game Travel Pace table
  lists Normal 18 / Slow 24 miles a day (the PHB has 24 / 18).

## Verified in the browser (2026-10-23, local stack)

Party auto-sync (4 × L4 → 1,000 XP Medium) · Generate → all ticked ·
untick one → Reroll selected swaps the rest · ± count · Run encounter →
Run tab with party auto-added · All monsters → 3 damage (PCs untouched,
clamped at 0) · Run again → Add to current fight keeps damage ·
Save to library → Library Run → confirm → Run tab · Add 4 of 5
characters to campaign · edit level persists · inline notes save ·
new party with Select all · switcher lists it · Settings toggle persists.

Not covered: phone-width layout, keyboard-only use.

## Follow-ups (not done)

- Persist per-campaign current HP: add `current_hp` to
  `campaign_characters` (migration + worker route + type) and bring the
  slider back.
- `ENCOUNTER_MULTIPLIERS` bands differ from the DMG (3–6 monsters should
  be ×2). The generator also stops under budget, so "Medium" often rates
  as Easy — worth a "fill to budget" pass.

## Decisions log

2026-10-23 — answers from the user:

- **Replace all = select + reroll.** Every monster group in the Builder
  preview has a checkbox (all checked by default); untick the keepers,
  then "Reroll selected" swaps the rest for similar-CR monsters. Plus
  Remove selected and ± count.
- **Multi-select everywhere listed:** monster picker, combat tracker,
  campaign characters/parties, party editor (C1–C5 all in scope).
- **CTA style = big primary buttons**, tabs reordered Build → Run →
  Library, steps move the user automatically (no stepper).
- **Declutter = full pass**: Settings dialog + layout cleanup (D1–D5).
- Not committing unless asked; work stays uncommitted on
  `DnDAssistant-MVP-Run`.

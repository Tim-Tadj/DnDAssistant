# UI/UX Review — DnD Assistant

**Date:** 2026-10-23 · **Branch:** `DnDAssistant-MVP-Run`
**Method:** code read of every page + live walkthrough against a local
Worker/D1 (seeded test account: 5 PCs, 1 party, 1 campaign).

The DM workflow itself is sound: *set up campaign → party → build
encounter → run it → save/re-run*. The friction is all in how the UI
exposes it. Findings fall into four buckets.

Severity: **P0** broken · **P1** confusing / slows the DM down · **P2** polish.

---

## 1. Bugs found during the walkthrough (P0)

| # | Where | What happens | Cause |
| --- | --- | --- | --- |
| B1 | Live tab → "Go to Builder" | Navigates to `#/encounter/encounter`, an unknown route → **blank page**. | `EncounterLive.tsx:46` calls `navigate('encounter')` (relative). Tab state is local to `encounter-page.tsx`, so no URL can select a tab. |
| B2 | Builder → "Send to Live" | Stays on Builder; only toasts "switch to the Live tab". | `EncounterBuilder.tsx:84` — no way to change the parent's tab. Library "Re-run" has the same problem (`EncounterLibrary.tsx:69`). |
| B3 | Live → "Add party (4)" | Button flips to "Remove party" but **0 PCs are added**. | `use-track-encounter.ts:74` `useState(party)` captures the first render's (empty) party; the party loads async. |
| B4 | Campaign → Overview hint | Says "add campaign notes (use the workflow bar)" — the workflow bar has no notes field. | `CampaignHub.tsx:104`. |
| B5 | Campaign → Characters → state dialog | Current HP is editable but never persisted; HP bar always shows max/max. | `CampaignCharacters.tsx`. |

## 2. Unclear next-step CTAs (P1)

- **Encounter tabs are ordered backwards** (Live · Builder · Library) and
  default to *Live*, which is empty on first visit. The natural flow is
  Build → Run, with Library as a side source.
- **No primary action stands out.** Generate, Send to Live, Next turn are
  all medium-weight buttons beside equally-weighted Clear/Reset/Save.
  "Send to Live" is a small text button at the end of a row.
- **Hand-offs rely on toasts** ("switch to the Live tab…") instead of
  moving the user.
- **Empty states point elsewhere without a link** (e.g. Parties panel
  says "go to the Characters page").
- **Campaign create dialog** puts Save in the title bar; status is a
  free-text field (should be a select).

## 3. Selecting many things at once (P1) — the user's main ask

Nothing in the app supports multi-select, select-all, or bulk replace:

| Place | Today | Wanted |
| --- | --- | --- |
| Encounter Builder preview | Read-only list; only "Generate" (rerolls everything). | Checkbox per monster group, **select all / none**, **Reroll selected** (replace with same-CR alternatives), **Remove selected**, **lock** to keep on regenerate, ± count stepper. |
| Monster picker (tracker "Add") | Each click adds one copy; no quantity. | Checkboxes + qty stepper, "select all filtered", one "Add N monsters" CTA. |
| Combat tracker | One combatant at a time. | Select several rows → apply damage/heal amount, add condition, remove. Typed damage instead of a slider. |
| Campaign → Characters | Single-select Autocomplete, one at a time. | Multi-select with "Add all my characters", then uncheck. |
| Campaign → Parties | Single-select "Link party". | Multi-select. |
| Party editor | Multi Autocomplete, no "add all". | "Select all characters" shortcut. |
| EntityBrowser grids | No checkbox column. | Optional checkbox selection + bulk delete (homebrew only). |

## 4. Visual busyness (P1/P2)

- **Three stacked headers on Encounters**: AppBar title "Encounters",
  ContextBar (campaign + party pickers), page `h3` "Encounters", *then* an
  "Active campaign / Active party" panel that repeats the ContextBar.
  ~250px of chrome before content.
- **ContextBar is always a full row** even on Monsters/Spells/Gear, where
  campaign/party is irrelevant.
- **Builder filters**: 10 controls always open; most DMs use difficulty +
  party + maybe keywords.
- **Characters page** stacks Party composition + Parties + My Characters.
  The Parties panel keeps its own *local* "active" party separate from the
  global one — two notions of "active party".
- **Campaign page** always renders the Avandria example world (map + lore)
  under your own campaign.
- "My homebrew" chip shows on Characters (all characters are yours).
- **No Settings anywhere.** Many things that clutter pages are really
  preferences.

### Settings window candidates

| Setting | Currently |
| --- | --- |
| Default encounter difficulty | Builder filter, resets every visit |
| Default XP range / advanced filters shown | Always visible |
| Auto-roll monster initiative | Not configurable |
| Show example world (Avandria) | Always shown |
| Show campaign/party bar on reference pages | Always shown |
| Compact nav / density | Toggle hidden in nav |
| Confirm before destructive actions (Reset, End encounter) | n/a |

### Found during implementation

- B6. Builder and Run unmounted on tab switch — the preview and the whole
  combat state were lost when you peeked at the other tab.
- B7. Campaign character edit dialog saved the original row, not the
  edited draft, so every edit was discarded.
- B8. Appending monsters to a running fight rebuilt it from scratch.
- `ENCOUNTER_MULTIPLIERS` bands don't match the DMG, and the generator
  stops under budget, so a "Medium" request often rates Easy.

---

See [PLAN.md](PLAN.md) for the implementation plan and progress.

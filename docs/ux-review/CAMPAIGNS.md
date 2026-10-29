# Campaigns — workflow audit & proposal

Walked through on the local stack, 2026-10-24, as a DM with one
campaign ("Shadows over Greywater", one party), then creating, switching,
archiving and deleting a second one.

## The question a DM opens this tab with

Almost every time, it's one of three:

1. **Before the game:** "What's on for next session, and am I ready?"
2. **At the table:** "Who's that NPC? What happened to the paladin's
   hand? Run this fight."
3. **After the game:** "Write down what happened before I forget, and
   tell the players."

The tab today is organised around **record types** (parties,
characters, sessions, NPCs, encounters), not around those moments. So
everything is there, but the DM has to know which drawer to open, and
nothing connects one drawer to another. The proposal below keeps the
same records and adds one loop through them: **Prep → Play → Recap**.

---

## Critique

### Fixed in this change

| # | Problem | What changed |
|---|---------|--------------|
| 1 | **You could only ever have one campaign.** Once a campaign was active, `#/campaign` always showed that campaign's hub; the list and the "New campaign" button only rendered when *no* campaign was active, and the context bar's "Manage…" pointed at the same page. | New **My Campaigns** page (`#/campaign?view=all`): a card per campaign, the current one marked, a "Start another campaign" card, an Archived section with Restore, and Delete with a confirm that says what goes with it. Reached from **All campaigns** in the hub, **Manage campaigns…** and the new **New campaign…** item in the top-bar switcher, and the user menu. A new campaign becomes the active one and opens straight into its hub. |
| 2 | The hub had no way to rename a campaign or change its setting or pitch. | Pencil next to the name opens **Edit campaign**. |
| 3 | Two identical pencils side by side in the hub header did different things. | The schedule/status one is now a calendar icon, tooltip "Schedule & status". |

### Still wrong (ordered by how much it hurts)

1. **"Mark played" lies a little.** It moves the next-session date on by
   the cadence but writes nothing down. The button that sounds like
   "the session happened" leaves no session in the log.
2. **Prep lives in the wrong place.** "Prep notes for next session" is a
   field on the *previous* session's record. To find your prep you open
   last week's log entry; the Overview never shows it.
3. **The Overview is counters, not a plan.** Four tiles say `0 parties ·
   0 sessions · 0 encounters · 0 NPCs`. Useful on day one, then noise.
   It doesn't answer "when's the next game, what's ready, what's open,
   what happened last time".
4. **Nothing remembers what the players did.** Running a fight saves an
   encounter record, and that's the only automatic history. HP and
   condition changes, loot, who the party met, what they promised:
   all either lost or typed by hand into one free-text summary.
5. **Encounter prep is on another page and isn't tied to a session.**
   "Prepare an encounter" sends you to Encounters; a planned fight
   belongs to the campaign but not to *next Thursday*.
6. **No answer to "can they survive this?"** The builder rates
   difficulty from the XP budget, which ignores the actual party
   (their HP, AC, how hard they hit, how many fights they've had today).
7. **Campaign notes are one big text box.** Plot threads, house rules,
   secrets and a to-do list all end up in one blob. `[[location:…]]`
   links render as chips but there are no locations to open.
8. **Parties vs Characters is two tabs for one idea.** A DM thinks
   "my players"; the split between a party record and per-campaign
   character state is an implementation detail that shows.
9. **Example world** still says "Adventure log coming soon".

---

## Proposal

> **Status (2026-10-29): built.** All eight steps below shipped; see
> `docs/CHANGELOG.md` and PLAN.md Phase J3 for what was verified.

Principle: **every screen answers "what do I do next?"**, history
writes itself as a side effect of using the app, and nothing new needs
a form unless the DM wants detail.

### 1. The Next Session card (Overview, top) — *S*

The first thing in the hub. It replaces the counter tiles.

```
┌ Session 7 · Thu 30 Oct (in 6 days) ──────────────── [▶ Start session] ┐
│ Strong start:  The bell tower collapses mid-sermon.                   │
│ ☑ Bell tower ambush        (encounter · Hard · 82% win)                │
│ ☐ Sister Maren's confession (NPC · thread "Who rang the bell?")        │
│ ☐ Clue: the ledger in the crypt                                        │
│ + add encounter · NPC · thread · note                                  │
└────────────────────────────────────────────────────────────────────────┘
```

- A **prep checklist**: items point at things that already exist
  (a planned encounter, an NPC, a thread) or are plain text (secrets,
  clues, a strong start).
- Anything left unchecked **rolls over** to the next session when this
  one ends. No more prep stranded on an old record.
- Data: prep moves off `campaign_sessions.prep_notes` onto the
  *upcoming* session row (a session with `played_on = null`), so the
  next session exists as a draft before it's played.

### 2. Start session / End session — *M*

Replaces "Mark played", and makes the session the spine of history.

- **Start session** turns the draft into the live session
  (number, today's date, attendees = the party, editable). A slim
  "Session 7 · live" bar shows across the app until you end it.
- While a session is live, everything that happens is stamped with it:
  encounters run, HP/condition changes, notes jotted, loot handed out.
- **End session** opens a recap screen *pre-filled from the timeline*
  ("Fought the bell-tower cultists, victory in 4 rounds; Brother Aldric
  dropped to 0 HP; met Sister Maren"). The DM edits two lines, sets the
  next date (cadence pre-fills it), and is done.

### 3. Jot: one-tap capture at the table — *S*

The cheapest way to get "a history of everything the players did"
without forms.

- A floating **Jot** button (and the `N` key) whenever a session is
  live. One line of text, optional `[[npc:…]]` / `[[character:…]]`
  links, optional tag (*clue, loot, promise, rule call, funny*).
- Each jot becomes a timeline entry on the live session. Tags give you
  free filters later ("every promise the party made").

### 4. Campaign timeline — *M*

One feed per campaign, newest first, grouped by session:

```
Session 6 · 23 Oct ─────────────────────────────
  ⚔ Crypt ghouls — Victory, 3 rounds
  ❤ Aldric 0 HP → stabilised by Wren
  ✎ Promise: return the ledger to Maren      [promise]
  💰 +120 gp, Cloak of Elvenkind → Wren
  👤 Met Sister Maren (wary)
```

- Filters: by character, NPC, thread or tag. Click a character →
  their personal history in this campaign (sessions attended, fights,
  times dropped, loot, jots about them).
- Data: one `campaign_events` table (`campaign_id, session_id, kind,
  ref_kind, ref_id, text, data_json, created_at`). Existing actions
  (save encounter, change character state, add NPC) write one row
  each. No new screens are needed to *feed* it.

### 5. Threads — *S*

Quests, rumours and mysteries as a short list rather than a paragraph
in notes.

- Title, status (*rumour → active → resolved / failed*), the next step,
  linked NPCs. Shown on the Overview as **Open threads** (3–5 lines).
- Ticking "advanced" during a live session writes a timeline entry, so
  the thread's own history is just the filtered timeline.

### 6. Encounter forecast ("simulation") — *M*

On any planned encounter, and on the Next Session card:

- **Forecast** runs the fight a few hundred times in the browser:
  party HP/AC from per-campaign character state, attack bonus and
  damage estimated from level and class (or the sheet when filled in),
  monsters from their stat blocks, simple focus-fire AI.
- Shows **win chance, typical length in rounds, chance someone drops,
  HP left**, and a one-line verdict ("Likely win, Wren probably goes
  down"). Clearly labelled as an estimate.
- **Adventuring day view:** stack the session's planned fights in order
  and see HP/resources draining across them, so you can spot the fight
  that breaks the party *before* the table does.
- Lives next to the existing XP difficulty rating; doesn't replace it.

### 7. Player recap — *S*

- **Copy recap** on any played session: the summary plus the
  highlights from the timeline, as clean text ready for Discord or a
  group chat. Secrets and DM-only jots stay out (a jot can be marked
  *DM only*).
- Later: a read-only share link per campaign for players.

### 8. Tidy the hub — *S*

- Tabs become **Overview · Players · Sessions · NPCs · Encounters ·
  Notes**. Players merges Parties and Characters (party at the top,
  per-character state below).
- Overview, top to bottom: Next Session card → Open threads →
  Last session (recap + 5 latest timeline entries) → party HP and
  conditions at a glance.
- Campaign notes move to their own **Notes** tab, unchanged.
- My Campaigns cards gain: party name, sessions played, last played.

### Deliberately not proposed

Maps and a full location wiki, an in-world calendar, an XP and
level tracker separate from character sheets, AI-written recaps. Each is
a project of its own, and the loop above is useful without them.

---

## Suggested build order

| Step | Delivers | Size |
|------|----------|------|
| 1 | `campaign_events` table + existing actions writing to it; timeline tab | M |
| 2 | Draft "next session" row, Next Session card with checklist and rollover | S |
| 3 | Start / End session (replaces Mark played), recap pre-filled from events | M |
| 4 | Jot + live-session bar | S |
| 5 | Threads | S |
| 6 | Hub tidy (Players tab, Overview layout, Notes tab), richer campaign cards | S |
| 7 | Encounter forecast + adventuring-day view | M |
| 8 | Copy recap, DM-only jots | S |

Steps 1–3 are the core: after them, the app keeps a history of play
on its own. Everything after can ship in any order.

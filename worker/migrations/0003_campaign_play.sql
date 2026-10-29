-- Prep → Play → Recap.
--
-- A session now moves through three states:
--   planned  the next session, being prepped: a checklist (`prep_json`)
--            and a strong start. At most one per campaign.
--   live     being played right now. Anything that happens meanwhile
--            (encounters, jots, character changes) is stamped with it.
--   played   done; the recap.
-- Every session logged before this migration was played.
--
-- `campaign_events` is the campaign's history: one row per thing that
-- happened, written by the actions that cause it (recording a fight,
-- a character levelling up, meeting an NPC, a thread resolving) and by
-- the DM's quick notes ("jots"). `session_id` is the session it
-- happened in, when one was live.
--
-- `campaign_threads` are quests, rumours and mysteries.

ALTER TABLE campaign_sessions ADD COLUMN status TEXT NOT NULL DEFAULT 'played';
ALTER TABLE campaign_sessions ADD COLUMN prep_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE campaign_sessions ADD COLUMN strong_start TEXT NOT NULL DEFAULT '';
ALTER TABLE campaign_sessions ADD COLUMN started_at TEXT;
ALTER TABLE campaign_sessions ADD COLUMN ended_at TEXT;

CREATE INDEX IF NOT EXISTS campaign_sessions_status_idx ON campaign_sessions (campaign_id, status);

CREATE TABLE IF NOT EXISTS campaign_threads (
  id          TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'active', -- rumour | active | resolved | failed
  next_step   TEXT NOT NULL DEFAULT '',
  notes       TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS campaign_threads_campaign_idx ON campaign_threads (campaign_id, status);

CREATE TABLE IF NOT EXISTS campaign_events (
  id          TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  session_id  TEXT REFERENCES campaign_sessions(id) ON DELETE SET NULL,
  kind        TEXT NOT NULL,              -- jot | encounter | character | npc | thread | session
  text        TEXT NOT NULL DEFAULT '',
  tag         TEXT NOT NULL DEFAULT '',   -- jots: clue | loot | promise | rule | quote | ''
  dm_only     INTEGER NOT NULL DEFAULT 0, -- left out of player recaps
  ref_kind    TEXT NOT NULL DEFAULT '',   -- encounter | character | npc | thread
  ref_id      TEXT NOT NULL DEFAULT '',
  data_json   TEXT NOT NULL DEFAULT '{}',
  created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS campaign_events_campaign_idx ON campaign_events (campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS campaign_events_session_idx ON campaign_events (session_id);
CREATE INDEX IF NOT EXISTS campaign_events_ref_idx ON campaign_events (campaign_id, ref_kind, ref_id);

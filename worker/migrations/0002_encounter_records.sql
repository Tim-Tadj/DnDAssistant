-- Encounters as both prep and history.
--
-- A save is either `planned` (prepared ahead of time: reusable, can be
-- test-run as often as the DM likes) or `played` (the record of a fight
-- that happened: outcome, rounds, the combat log and how every
-- combatant ended up, optionally tied to the session it was played in).
-- `source_id` points a played record back at the planned encounter it
-- was run from.
--
-- Rows from before this migration were all saved from the Build tab,
-- i.e. prep. The Build tab used to stamp them with today's date as
-- `played_on`, which never meant they were played, so they stay
-- `planned` and lose that date.

ALTER TABLE encounter_saves ADD COLUMN status TEXT NOT NULL DEFAULT 'planned';
ALTER TABLE encounter_saves ADD COLUMN session_id TEXT REFERENCES campaign_sessions(id) ON DELETE SET NULL;
ALTER TABLE encounter_saves ADD COLUMN source_id TEXT;
ALTER TABLE encounter_saves ADD COLUMN outcome TEXT NOT NULL DEFAULT '';
ALTER TABLE encounter_saves ADD COLUMN rounds INTEGER NOT NULL DEFAULT 0;
ALTER TABLE encounter_saves ADD COLUMN log_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE encounter_saves ADD COLUMN combatants_json TEXT NOT NULL DEFAULT '[]';

UPDATE encounter_saves SET played_on = NULL WHERE status = 'planned';

CREATE INDEX IF NOT EXISTS encounter_saves_session_idx ON encounter_saves (session_id);

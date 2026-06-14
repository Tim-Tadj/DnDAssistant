-- V10: Encounter saves (Phase 8) — a snapshot of an encounter
-- a DM has run, so they can re-run or compare against the
-- party. NULL campaign_id means the save is personal scratch
-- (not attached to a campaign).

CREATE TABLE IF NOT EXISTS encounter_saves (
    id                  UUID PRIMARY KEY,
    owner_user_id       UUID NOT NULL,
    campaign_id         UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    name                TEXT NOT NULL DEFAULT '',
    monsters_json       TEXT NOT NULL DEFAULT '[]',
    party_snapshot_json TEXT NOT NULL DEFAULT '[]',
    difficulty          TEXT NOT NULL DEFAULT '',
    total_xp            INTEGER NOT NULL DEFAULT 0,
    played_on           DATE,
    notes               TEXT NOT NULL DEFAULT '',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS encounter_saves_owner_idx ON encounter_saves (owner_user_id, played_on DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS encounter_saves_campaign_idx ON encounter_saves (campaign_id);

-- V8: Campaign NPCs (Phase 8) — named, persistent NPCs that the
-- DM can attach to a campaign. Each NPC can optionally link to a
-- monster (so the DM can quickly look up a stat block) and has
-- a status (alive/dead/missing) + location for tracking.

CREATE TABLE IF NOT EXISTS campaign_npcs (
    id              UUID PRIMARY KEY,
    campaign_id     UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    role            TEXT NOT NULL DEFAULT 'Notable',
    race            TEXT NOT NULL DEFAULT '',
    alignment       TEXT NOT NULL DEFAULT '',
    description     TEXT NOT NULL DEFAULT '',
    status          TEXT NOT NULL DEFAULT 'alive',
    location        TEXT NOT NULL DEFAULT '',
    monster_id      BIGINT REFERENCES monsters(id) ON DELETE SET NULL,
    notes           TEXT NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS campaign_npcs_campaign_idx ON campaign_npcs (campaign_id);
CREATE INDEX IF NOT EXISTS campaign_npcs_name_idx ON campaign_npcs (lower(name));
CREATE INDEX IF NOT EXISTS campaign_npcs_monster_idx ON campaign_npcs (monster_id);

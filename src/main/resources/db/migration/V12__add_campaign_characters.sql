-- V12: per-campaign character state (Phase 9).
--
-- A character has one canonical row (in `characters`) and one global
-- runtime state (in `character_state`). This table is the per-campaign
-- override layer: when a character is brought into a campaign, the DM
-- can give them a different level, a different max HP (e.g. a tougher
-- subclass), track their conditions / death saves / hit-dice for that
-- campaign, and (in future) override ability scores / class.
--
-- A row in this table is created lazily the first time a character is
-- added to a campaign. character_id + campaign_id is unique.
--
-- Conditions are stored as a JSON array of strings (e.g.
-- ["Poisoned","Prone"]) so we can add new conditions without
-- schema changes.

CREATE TABLE IF NOT EXISTS campaign_characters (
    id                    UUID PRIMARY KEY,
    campaign_id           UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    character_id          UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    level                 INTEGER NOT NULL DEFAULT 1,
    hp_max_override       INTEGER,
    ac_override           INTEGER,
    notes                 TEXT NOT NULL DEFAULT '',
    conditions            TEXT NOT NULL DEFAULT '[]',
    death_save_successes  INTEGER NOT NULL DEFAULT 0,
    death_save_failures   INTEGER NOT NULL DEFAULT 0,
    hit_dice_used         INTEGER NOT NULL DEFAULT 0,
    last_long_rest        TIMESTAMPTZ,
    last_short_rest       TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (campaign_id, character_id)
);

CREATE INDEX IF NOT EXISTS campaign_characters_campaign_idx ON campaign_characters (campaign_id);
CREATE INDEX IF NOT EXISTS campaign_characters_character_idx ON campaign_characters (character_id);

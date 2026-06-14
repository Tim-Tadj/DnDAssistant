-- V9: Character state (Phase 8) — runtime, in-session tracking
-- for player characters. Split from the immutable `characters`
-- row (which is the stat block) so that the stat block can be
-- edited without losing the running HP/conditions/rest state.
--
-- State is auto-created on first read; PUT upserts.

CREATE TABLE IF NOT EXISTS character_state (
    character_id            UUID PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
    current_hp              INTEGER NOT NULL,
    temp_hp                 INTEGER NOT NULL DEFAULT 0,
    conditions              TEXT NOT NULL DEFAULT '[]',
    death_save_successes    INTEGER NOT NULL DEFAULT 0,
    death_save_failures     INTEGER NOT NULL DEFAULT 0,
    hit_dice_used           INTEGER NOT NULL DEFAULT 0,
    last_long_rest          TIMESTAMPTZ,
    last_short_rest         TIMESTAMPTZ,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS character_state_updated_idx ON character_state (updated_at DESC);

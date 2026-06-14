-- V6: Parties (Phase 8) — a user-owned grouping of characters
-- that the encounter generator can attach to.
--
-- A party is a named, ordered list of character_ids, all of which
-- must be owned by the same user. Parties are referenced by
-- encounter_saves (later migration) for "Re-run" and by the
-- encounter generator's "Use my party" button.

CREATE TABLE IF NOT EXISTS parties (
    id              UUID PRIMARY KEY,
    name            TEXT NOT NULL,
    description     TEXT NOT NULL DEFAULT '',
    owner_user_id   UUID NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS parties_owner_idx ON parties (owner_user_id);

CREATE TABLE IF NOT EXISTS party_members (
    party_id        UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    character_id    UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    position        INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (party_id, character_id)
);

CREATE INDEX IF NOT EXISTS party_members_party_idx ON party_members (party_id);
CREATE INDEX IF NOT EXISTS party_members_character_idx ON party_members (character_id);

-- DnDAssistant initial schema (Phase 1).
-- Idempotent: safe to run on every startup.

CREATE TABLE IF NOT EXISTS spells (
    id              BIGSERIAL PRIMARY KEY,
    name            TEXT NOT NULL,
    level           TEXT NOT NULL,
    school          TEXT NOT NULL,
    type            TEXT NOT NULL,
    casting_time    TEXT NOT NULL,
    spell_range     TEXT NOT NULL,
    duration        TEXT NOT NULL,
    ritual          BOOLEAN NOT NULL DEFAULT FALSE,
    description     TEXT NOT NULL DEFAULT '',
    higher_levels   TEXT NOT NULL DEFAULT '',
    classes         TEXT NOT NULL DEFAULT '',
    tags            TEXT NOT NULL DEFAULT '',
    components      JSONB NOT NULL DEFAULT '{}'::jsonb,
    provenance      TEXT NOT NULL DEFAULT 'srd',
    owner_user_id   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT spells_name_provenance_owner_key
        UNIQUE (name, provenance, owner_user_id)
);

CREATE INDEX IF NOT EXISTS spells_name_idx ON spells (lower(name));
CREATE INDEX IF NOT EXISTS spells_level_idx ON spells (level);

-- Phase 5 will create a `users` table. We don't model it yet; spell ownership
-- is a nullable text id today so we don't have to revisit the schema later.

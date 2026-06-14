-- V1: Initial schema (spells + monsters).
-- This recreates the pre-Flyway `schema.sql` so a fresh database
-- has the spell and monster tables. The dev DB was baselined at V1
-- (Spring Boot `baseline-version=1`, `baseline-on-migrate=true`)
-- when Flyway was first adopted, so this migration is skipped on
-- the existing dev DB and only runs on a clean checkout.

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

CREATE TABLE IF NOT EXISTS monsters (
    id                          BIGSERIAL PRIMARY KEY,
    name                        TEXT NOT NULL,
    meta                        TEXT NOT NULL DEFAULT '',
    ac                          TEXT NOT NULL DEFAULT '',
    hp                          TEXT NOT NULL DEFAULT '',
    speed                       TEXT NOT NULL DEFAULT '',
    str                         TEXT NOT NULL DEFAULT '',
    str_mod                     TEXT NOT NULL DEFAULT '',
    dex                         TEXT NOT NULL DEFAULT '',
    dex_mod                     TEXT NOT NULL DEFAULT '',
    con                         TEXT NOT NULL DEFAULT '',
    con_mod                     TEXT NOT NULL DEFAULT '',
    int                         TEXT NOT NULL DEFAULT '',
    int_mod                     TEXT NOT NULL DEFAULT '',
    wis                         TEXT NOT NULL DEFAULT '',
    wis_mod                     TEXT NOT NULL DEFAULT '',
    cha                         TEXT NOT NULL DEFAULT '',
    cha_mod                     TEXT NOT NULL DEFAULT '',
    saving_throws               TEXT NOT NULL DEFAULT '',
    skills                      TEXT NOT NULL DEFAULT '',
    damage_vulnerabilities      TEXT NOT NULL DEFAULT '',
    damage_resistances          TEXT NOT NULL DEFAULT '',
    damage_immunities           TEXT NOT NULL DEFAULT '',
    condition_immunities        TEXT NOT NULL DEFAULT '',
    senses                      TEXT NOT NULL DEFAULT '',
    languages                   TEXT NOT NULL DEFAULT '',
    challenge                   TEXT NOT NULL DEFAULT '',
    traits                      TEXT NOT NULL DEFAULT '',
    actions                     TEXT NOT NULL DEFAULT '',
    reactions                   TEXT NOT NULL DEFAULT '',
    legendary_actions           TEXT NOT NULL DEFAULT '',
    description                 TEXT NOT NULL DEFAULT '',
    lair_actions                TEXT NOT NULL DEFAULT '',
    regional_effects            TEXT NOT NULL DEFAULT '',
    img_url                     TEXT NOT NULL DEFAULT '',
    provenance                  TEXT NOT NULL DEFAULT 'homebrew',
    owner_user_id               TEXT,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT monsters_name_provenance_owner_key
        UNIQUE (name, provenance, owner_user_id)
);

CREATE INDEX IF NOT EXISTS monsters_name_idx ON monsters (lower(name));
CREATE INDEX IF NOT EXISTS monsters_meta_idx ON monsters (lower(meta));

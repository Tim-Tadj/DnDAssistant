-- V4: Characters, classes, races (Phase 4).
-- Classes and races are read-mostly reference data; characters are
-- owned by a user and per-user.

CREATE TABLE IF NOT EXISTS classes (
    id              BIGSERIAL PRIMARY KEY,
    name            TEXT NOT NULL UNIQUE,
    hit_die         TEXT NOT NULL DEFAULT 'd8',
    primary_ability TEXT NOT NULL DEFAULT '',
    description     TEXT NOT NULL DEFAULT '',
    source          TEXT NOT NULL DEFAULT 'srd'
);

CREATE INDEX IF NOT EXISTS classes_name_idx ON classes (lower(name));

CREATE TABLE IF NOT EXISTS races (
    id              BIGSERIAL PRIMARY KEY,
    name            TEXT NOT NULL UNIQUE,
    size            TEXT NOT NULL DEFAULT 'Medium',
    speed           INTEGER NOT NULL DEFAULT 30,
    ability_bonuses TEXT NOT NULL DEFAULT '',
    traits          TEXT NOT NULL DEFAULT '',
    source          TEXT NOT NULL DEFAULT 'srd'
);

CREATE INDEX IF NOT EXISTS races_name_idx ON races (lower(name));

CREATE TABLE IF NOT EXISTS characters (
    id              UUID PRIMARY KEY,
    name            TEXT NOT NULL,
    race_id         BIGINT NOT NULL REFERENCES races(id) ON DELETE RESTRICT,
    class_id        BIGINT NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
    level           INTEGER NOT NULL DEFAULT 1,
    alignment       TEXT NOT NULL DEFAULT 'Neutral',
    background      TEXT NOT NULL DEFAULT '',
    str             INTEGER NOT NULL DEFAULT 10,
    dex             INTEGER NOT NULL DEFAULT 10,
    con             INTEGER NOT NULL DEFAULT 10,
    int_            INTEGER NOT NULL DEFAULT 10,
    wis             INTEGER NOT NULL DEFAULT 10,
    cha             INTEGER NOT NULL DEFAULT 10,
    hp_max          INTEGER NOT NULL DEFAULT 10,
    ac              INTEGER NOT NULL DEFAULT 10,
    notes           TEXT NOT NULL DEFAULT '',
    owner_user_id   UUID NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS characters_owner_idx ON characters (owner_user_id);
CREATE INDEX IF NOT EXISTS characters_name_idx ON characters (lower(name));

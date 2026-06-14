-- V1: Add the gear table.
-- A single table covers weapons, armour, and gear (kind column discriminates).
-- The columns mirror the bundled JSON shapes (srd_5e_weapons.json,
-- srd_5e_armour.json, srd_5e_gear.json) plus the shared provenance/owner
-- convention used by spells/monsters. type-specific fields (damage,
-- properties for weapons; AC, strength, stealth for armour) are nullable
-- because they only apply to some kinds.

CREATE TABLE IF NOT EXISTS gear (
    id                  BIGSERIAL PRIMARY KEY,
    name                TEXT NOT NULL,
    kind                TEXT NOT NULL CHECK (kind IN ('weapon', 'armour', 'gear')),
    cost                TEXT NOT NULL DEFAULT '',
    weight              TEXT NOT NULL DEFAULT '',
    type                TEXT NOT NULL DEFAULT '',
    damage              TEXT,
    properties          TEXT,
    ac                  TEXT,
    strength            TEXT,
    stealth             TEXT,
    description         TEXT,
    provenance          TEXT NOT NULL DEFAULT 'homebrew',
    owner_user_id       TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT gear_name_kind_provenance_owner_key
        UNIQUE (name, kind, provenance, owner_user_id)
);

CREATE INDEX IF NOT EXISTS gear_name_idx ON gear (lower(name));
CREATE INDEX IF NOT EXISTS gear_kind_idx ON gear (kind);
CREATE INDEX IF NOT EXISTS gear_type_idx ON gear (lower(type));

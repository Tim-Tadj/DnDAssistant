-- V5: Campaigns (Phase 5).
-- A campaign is a named record owned by a user. Carries minimal
-- metadata + a free-form notes field; the lore/map tabs continue
-- to read from the bundled static JSON.

CREATE TABLE IF NOT EXISTS campaigns (
    id              UUID PRIMARY KEY,
    name            TEXT NOT NULL,
    description     TEXT NOT NULL DEFAULT '',
    setting         TEXT NOT NULL DEFAULT '',
    status          TEXT NOT NULL DEFAULT 'active',
    notes           TEXT NOT NULL DEFAULT '',
    owner_user_id   UUID NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS campaigns_owner_idx ON campaigns (owner_user_id);
CREATE INDEX IF NOT EXISTS campaigns_name_idx ON campaigns (lower(name));

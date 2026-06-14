-- V11: Campaign scheduling fields (Phase 8). Adds the workflow
-- metadata a DM uses to track when a campaign runs and whether
-- it's still active. All fields are nullable; the UI defaults
-- to 'active' status and no scheduled date.

ALTER TABLE campaigns
    ADD COLUMN IF NOT EXISTS next_session_on DATE,
    ADD COLUMN IF NOT EXISTS cadence TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS started_on DATE,
    ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS campaigns_next_session_idx ON campaigns (next_session_on);
CREATE INDEX IF NOT EXISTS campaigns_archived_idx ON campaigns (archived);

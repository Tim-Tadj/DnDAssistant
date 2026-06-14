-- V7: Campaign sessions (Phase 8) — a chronological log of
-- sessions per campaign, with a summary, prep notes, and an
-- attendees list (a JSON array of participant names).

CREATE TABLE IF NOT EXISTS campaign_sessions (
    id              UUID PRIMARY KEY,
    campaign_id     UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    session_number  INTEGER NOT NULL DEFAULT 1,
    title           TEXT NOT NULL DEFAULT '',
    played_on       DATE,
    summary         TEXT NOT NULL DEFAULT '',
    prep_notes      TEXT NOT NULL DEFAULT '',
    attendees       TEXT NOT NULL DEFAULT '[]',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS campaign_sessions_campaign_idx ON campaign_sessions (campaign_id, played_on DESC);
CREATE INDEX IF NOT EXISTS campaign_sessions_number_idx ON campaign_sessions (campaign_id, session_number DESC);

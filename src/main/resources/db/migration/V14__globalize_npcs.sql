-- V14: NPCs become global. Three changes:
--   1. drop the NOT NULL on campaign_id (NPCs no longer belong to
--      exactly one campaign)
--   2. add a campaign_tags TEXT column to track which campaigns
--      this NPC appears in (free-form text or comma-separated ids
--      / names; the repository stores a JSON array of strings)
--   3. add owner_user_id so NPCs are scoped per user
--
-- Existing rows get a backfill: their campaign_id becomes their
-- campaign_tags entry, and their owner_user_id is inferred from
-- the campaign they were attached to.

ALTER TABLE campaign_npcs ALTER COLUMN campaign_id DROP NOT NULL;

ALTER TABLE campaign_npcs ADD COLUMN IF NOT EXISTS campaign_tags TEXT NOT NULL DEFAULT '';
ALTER TABLE campaign_npcs ADD COLUMN IF NOT EXISTS owner_user_id UUID;

-- Backfill: existing rows have a campaign_id, copy it into
-- campaign_tags (as a single-element JSON array) and copy the
-- campaign's owner_user_id into the NPC. Use a CTE so we only
-- touch rows that don't already have a value (idempotent on
-- re-run).
WITH src AS (
  SELECT n.id, n.campaign_id, c.owner_user_id
  FROM campaign_npcs n
  JOIN campaigns c ON c.id = n.campaign_id
  WHERE (n.campaign_tags IS NULL OR n.campaign_tags = '')
     OR n.owner_user_id IS NULL
)
UPDATE campaign_npcs n
SET campaign_tags = COALESCE(NULLIF(n.campaign_tags, ''), to_json(ARRAY[src.campaign_id])::text),
    owner_user_id = COALESCE(n.owner_user_id, src.owner_user_id)
FROM src
WHERE n.id = src.id;

-- After backfill, owner_user_id is required. Mark NOT NULL now
-- that the backfill has run.
ALTER TABLE campaign_npcs ALTER COLUMN owner_user_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS campaign_npcs_owner_idx ON campaign_npcs (owner_user_id, lower(name));
-- We deliberately do NOT add a foreign key for campaign_tags. The
-- tags are free-form so a DM can reference campaigns they don't
-- own (shared worlds), and we don't need referential integrity for
-- a list of ids.

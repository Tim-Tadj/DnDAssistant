-- V13: many-to-many link between campaigns and parties.
--
-- Previously, a party was just a free-floating list of characters owned
-- by a user. In Phase 9 we make them first-class campaign members:
-- a party can be linked to one or more campaigns, and a campaign can
-- have multiple parties (e.g. the players' party, the BBEG's party,
-- a side-quest NPC party).
--
-- This is a junction table: (campaign_id, party_id) is unique.
-- The owning user is still the party owner; ownership of the link is
-- implicit — both the campaign and the party must belong to the
-- current user to add or read the link.

CREATE TABLE IF NOT EXISTS campaign_parties (
    campaign_id  UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    party_id     UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    position     INTEGER NOT NULL DEFAULT 0,
    added_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (campaign_id, party_id)
);

CREATE INDEX IF NOT EXISTS campaign_parties_party_idx ON campaign_parties (party_id);

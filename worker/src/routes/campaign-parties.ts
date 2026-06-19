// Ports CampaignPartyController. Many-to-many link between a campaign and a
// party owned by the same user. The same party can be linked to multiple
// campaigns, and a campaign can hold multiple parties.
//
//   GET    /api/v1/campaigns/:campaignId/parties        -> list linked parties
//   POST   /api/v1/campaigns/:campaignId/parties        -> link (body: {party_id})
//   DELETE /api/v1/campaigns/:campaignId/parties/:partyId -> unlink
//
// All routes require auth; the caller must own both the campaign and the
// party being linked. The link table is campaign_parties.

import { Hono } from 'hono';
import type { Context } from 'hono';
import type { AppBindings } from '../types';
import { all, first, run } from '../db';
import { badRequest, forbidden, notFound } from '../lib/errors';
import { requireAuth } from '../middleware/auth';
import { ownedCampaign } from '../lib/ownership';

const campaignParties = new Hono<AppBindings>();
campaignParties.use('*', requireAuth);

type PartyRow = {
  id: string;
  name: string;
  description: string;
  owner_user_id: string;
  created_at: string;
  updated_at: string;
};

async function memberIds(db: D1Database, partyId: string): Promise<string[]> {
  const rows = await all<{ character_id: string }>(
    db,
    'SELECT character_id FROM party_members WHERE party_id = ? ORDER BY position',
    partyId,
  );
  return rows.map((r) => r.character_id);
}

async function partyToJson(db: D1Database, row: PartyRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    member_ids: await memberIds(db, row.id),
    owner_user_id: row.owner_user_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function loadOwnedParty(
  c: Context<AppBindings>,
  partyId: string,
): Promise<PartyRow> {
  const userId = c.get('userId')!;
  const p = await first<PartyRow>(c.env.DB, 'SELECT * FROM parties WHERE id = ?', partyId);
  if (!p) throw notFound(`Party ${partyId} not found`);
  if (p.owner_user_id !== userId) {
    throw forbidden('Only the owner of both campaign and party can link them');
  }
  return p;
}

campaignParties.get('/', async (c) => {
  const campaignId = await ownedCampaign(c, c.req.param('campaignId'));
  // campaign_parties is a junction table keyed by (campaign_id, party_id) —
  // it has no `id` column, so select party_id and load each party.
  const rows = await all<{ party_id: string }>(
    c.env.DB,
    'SELECT party_id FROM campaign_parties WHERE campaign_id = ? ORDER BY position',
    campaignId,
  );
  const result: Awaited<ReturnType<typeof partyToJson>>[] = [];
  for (const { party_id } of rows) {
    const row = await first<PartyRow>(c.env.DB, 'SELECT * FROM parties WHERE id = ?', party_id);
    if (row) result.push(await partyToJson(c.env.DB, row));
  }
  return c.json(result);
});

campaignParties.post('/', async (c) => {
  const campaignId = await ownedCampaign(c, c.req.param('campaignId'));
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  const partyId = typeof body?.party_id === 'string' ? body.party_id.trim() : '';
  if (!partyId) throw badRequest('party_id is required');
  const party = await loadOwnedParty(c, partyId);

  // Append; compute position from current link count.
  const count = await first<{ n: number }>(
    c.env.DB,
    'SELECT COUNT(*) AS n FROM campaign_parties WHERE campaign_id = ?',
    campaignId,
  );
  const position = count?.n ?? 0;
  try {
    await run(
      c.env.DB,
      'INSERT INTO campaign_parties (campaign_id, party_id, position) VALUES (?,?,?)',
      campaignId,
      partyId,
      position,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('UNIQUE constraint failed')) {
      // Idempotent: linking an already-linked party is a no-op.
      return c.json(await partyToJson(c.env.DB, party), 200);
    }
    throw e;
  }
  return c.json(await partyToJson(c.env.DB, party), 201);
});

campaignParties.delete('/:partyId', async (c) => {
  const campaignId = await ownedCampaign(c, c.req.param('campaignId'));
  const partyId = c.req.param('partyId');
  await loadOwnedParty(c, partyId);
  await run(
    c.env.DB,
    'DELETE FROM campaign_parties WHERE campaign_id = ? AND party_id = ?',
    campaignId,
    partyId,
  );
  return c.body(null, 204);
});

export default campaignParties;

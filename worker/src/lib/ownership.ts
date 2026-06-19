// Shared ownership guard for resources nested under a campaign.
import type { Context } from 'hono';
import type { AppBindings } from '../types';
import { first } from '../db';
import { badRequest, forbidden, notFound } from './errors';

/** Loads a campaign and asserts the caller owns it. Returns the validated id. */
export async function ownedCampaign(
  c: Context<AppBindings>,
  campaignId: string | undefined,
): Promise<string> {
  if (!campaignId) throw badRequest('campaignId path parameter is required');
  const row = await first<{ id: string; owner_user_id: string }>(
    c.env.DB,
    'SELECT id, owner_user_id FROM campaigns WHERE id = ?',
    campaignId,
  );
  if (!row) throw notFound(`Campaign ${campaignId} not found`);
  if (row.owner_user_id !== c.get('userId')) {
    throw forbidden('Only the owner can modify this campaign');
  }
  return row.id;
}

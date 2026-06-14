// Phase 9: NPC is now a global (per-user) entity tagged with the
// campaigns it appears in. campaign_id is kept as a back-compat
// "primary" campaign pointer (the campaign the NPC was first
// added to).

export type NpcStatus = 'alive' | 'dead' | 'missing' | 'unknown';
export type NpcRole = 'Ally' | 'Neutral' | 'Antagonist' | 'Villain' | 'Boss' | 'Notable';

export const NPC_STATUSES: NpcStatus[] = ['alive', 'dead', 'missing', 'unknown'];
export const NPC_ROLES: NpcRole[] = ['Ally', 'Neutral', 'Antagonist', 'Villain', 'Boss', 'Notable'];

export type CampaignNpc = {
  id?: string;
  campaign_id?: string | null;
  owner_user_id?: string;
  name: string;
  role: string;
  race: string;
  alignment: string;
  description: string;
  status: string;
  location: string;
  monster_id: number | null;
  notes: string;
  campaign_tags: string[];
  created_at?: string;
  updated_at?: string;
};

export const defaultCampaignNpc = (ownerUserId?: string): CampaignNpc => ({
  campaign_id: null,
  owner_user_id: ownerUserId,
  name: '',
  role: 'Notable',
  race: '',
  alignment: '',
  description: '',
  status: 'alive',
  location: '',
  monster_id: null,
  notes: '',
  campaign_tags: [],
});

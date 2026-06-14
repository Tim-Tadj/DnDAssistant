// Phase 8: campaign NPC wire shape.

export type NpcStatus = 'alive' | 'dead' | 'missing' | 'unknown';
export type NpcRole = 'Ally' | 'Neutral' | 'Antagonist' | 'Villain' | 'Boss' | 'Notable';

export const NPC_ROLES: NpcRole[] = [
  'Ally',
  'Neutral',
  'Antagonist',
  'Villain',
  'Boss',
  'Notable',
];

export const NPC_STATUSES: NpcStatus[] = ['alive', 'dead', 'missing', 'unknown'];

export type CampaignNpc = {
  id?: string;
  campaign_id?: string;
  name: string;
  role: NpcRole | string;
  race: string;
  alignment: string;
  description: string;
  status: NpcStatus | string;
  location: string;
  monster_id: number | null;
  notes: string;
  created_at?: string;
  updated_at?: string;
};

export const defaultCampaignNpc: Omit<
  CampaignNpc,
  'id' | 'campaign_id' | 'created_at' | 'updated_at'
> = {
  name: '',
  role: 'Notable',
  race: '',
  alignment: '',
  description: '',
  status: 'alive',
  location: '',
  monster_id: null,
  notes: '',
};

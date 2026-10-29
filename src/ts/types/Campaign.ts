// Phase 5: Campaign wire shape (matches the backend Campaign domain).
// Phase 8: workflow fields.

export type CampaignStatus = 'active' | 'paused' | 'completed' | 'archived';
export type CampaignCadence = '' | 'weekly' | 'biweekly' | 'monthly' | 'ad-hoc';

export const CAMPAIGN_STATUSES: CampaignStatus[] = [
  'active',
  'paused',
  'completed',
  'archived',
];

export const CAMPAIGN_CADENCES: CampaignCadence[] = [
  '',
  'weekly',
  'biweekly',
  'monthly',
  'ad-hoc',
];

export type Campaign = {
  id?: string;
  name: string;
  description: string;
  setting: string;
  status: string;
  notes: string;
  next_session_on: string | null; // ISO date
  cadence: CampaignCadence | string;
  started_on: string | null;
  archived: boolean;
  owner_user_id?: string;
  created_at?: string;
  updated_at?: string;
  // Read-only, from GET /campaigns.
  stats?: CampaignStats;
};

export type CampaignStats = {
  sessions_played: number;
  last_played_on: string | null;
  live_session: number | null; // session_number of the session in progress
  party_names: string; // comma-separated
};

export const defaultCampaign: Campaign = {
  name: '',
  description: '',
  setting: '',
  status: 'active',
  notes: '',
  next_session_on: null,
  cadence: '',
  started_on: null,
  archived: false,
};

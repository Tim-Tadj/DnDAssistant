// Phase 8: campaign-session wire shape.

export type CampaignSession = {
  id?: string;
  campaign_id?: string;
  session_number: number;
  title: string;
  played_on: string | null; // ISO date (YYYY-MM-DD)
  summary: string;
  prep_notes: string;
  attendees: string[];
  created_at?: string;
  updated_at?: string;
};

export const defaultCampaignSession: Omit<
  CampaignSession,
  'id' | 'campaign_id' | 'created_at' | 'updated_at'
> = {
  session_number: 1,
  title: '',
  played_on: null,
  summary: '',
  prep_notes: '',
  attendees: [],
};

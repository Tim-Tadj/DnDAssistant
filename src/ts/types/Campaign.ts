// Phase 5: Campaign wire shape (matches the backend Campaign domain).

export type Campaign = {
  id?: string;
  name: string;
  description: string;
  setting: string;
  status: string;
  notes: string;
  owner_user_id?: string;
  created_at?: string;
  updated_at?: string;
};

export const defaultCampaign: Campaign = {
  name: '',
  description: '',
  setting: '',
  status: 'active',
  notes: '',
};

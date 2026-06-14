// Phase 8: Party wire shape (matches the backend Party domain).

export type Party = {
  id?: string;
  name: string;
  description: string;
  member_ids: string[];
  owner_user_id?: string;
  created_at?: string;
  updated_at?: string;
};

export const defaultParty: Party = {
  name: '',
  description: '',
  member_ids: [],
};

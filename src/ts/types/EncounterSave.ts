// Phase 8: Encounter-save wire shape.

export type MonsterRef = {
  id: number;
  name: string;
  count: number;
  xp_each: number;
};

export type EncounterSave = {
  id?: string;
  owner_user_id?: string;
  campaign_id?: string | null;
  name: string;
  monsters: MonsterRef[];
  party_snapshot_ids: string[];
  difficulty: string;
  total_xp: number;
  played_on: string | null; // ISO date
  notes: string;
  created_at?: string;
  updated_at?: string;
};

// Phase 8: Encounter-save wire shape.
//
// A save is either prep (`planned`: reusable, can be test-run) or
// history (`played`: what happened when it ran at the table).

export type MonsterRef = {
  id: number;
  name: string;
  count: number;
  xp_each: number;
};

export type EncounterStatus = 'planned' | 'played';

export const OUTCOMES = ['Victory', 'Defeat', 'Fled', 'Negotiated', 'Other'] as const;
export type Outcome = typeof OUTCOMES[number];

// One line of the combat log, written by the tracker as the fight runs.
export type EncounterLogEntry = {
  round: number;
  kind: 'start' | 'round' | 'damage' | 'heal' | 'down' | 'condition' | 'join' | 'remove';
  text: string;
};

// How a combatant ended the fight.
export type CombatantResult = {
  name: string;
  isPC: boolean;
  hp: number;
  max_hp: number;
  conditions: string[];
  defeated: boolean;
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
  played_on: string | null; // ISO date, played encounters only
  notes: string;
  status?: EncounterStatus;
  session_id?: string | null;
  source_id?: string | null;
  outcome?: string;
  rounds?: number;
  log?: EncounterLogEntry[];
  combatants?: CombatantResult[];
  created_at?: string;
  updated_at?: string;
};

export const isPlayed = (s: EncounterSave) => s.status === 'played';

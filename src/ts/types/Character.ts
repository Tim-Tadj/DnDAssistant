// Phase 4: frontend types matching the backend Character, DndClass, Race
// shapes (PascalCase JSON wire format).

export type DndClass = {
  id: number;
  name: string;
  hit_die: string;
  primary_ability: string;
  description: string;
  source: string;
};

export type Race = {
  id: number;
  name: string;
  size: string;
  speed: number;
  ability_bonuses: string;
  traits: string;
  source: string;
};

export type Character = {
  id: string;
  name: string;
  race_id: number;
  class_id: number;
  level: number;
  alignment: string;
  background: string;
  str: number;
  dex: number;
  con: number;
  int_: number;
  wis: number;
  cha: number;
  hp_max: number;
  ac: number;
  notes: string;
  owner_user_id: string;
  created_at?: string;
  updated_at?: string;
};

export const defaultCharacter: Omit<Character, 'id' | 'owner_user_id'> = {
  name: '',
  race_id: 4,   // Human
  class_id: 5,  // Fighter
  level: 1,
  alignment: 'Neutral',
  background: '',
  str: 10,
  dex: 10,
  con: 10,
  int_: 10,
  wis: 10,
  cha: 10,
  hp_max: 10,
  ac: 10,
  notes: '',
};

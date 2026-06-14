// Phase 8: Character state wire shape (HP, conditions, rest, death saves).

export type CharacterState = {
  character_id: string;
  current_hp: number;
  temp_hp: number;
  conditions: string[];
  death_save_successes: number; // 0..3
  death_save_failures: number;  // 0..3
  hit_dice_used: number;
  last_long_rest: string | null;
  last_short_rest: string | null;
  updated_at?: string;
};

export const STANDARD_CONDITIONS = [
  'Blinded',
  'Charmed',
  'Deafened',
  'Frightened',
  'Grappled',
  'Incapacitated',
  'Invisible',
  'Paralyzed',
  'Petrified',
  'Poisoned',
  'Prone',
  'Restrained',
  'Stunned',
  'Unconscious',
];

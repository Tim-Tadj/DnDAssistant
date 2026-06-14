// Phase 9: per-campaign override of a character. A character can
// have a different level / max HP / AC / conditions / death-save
// state in different campaigns.

export type CampaignCharacter = {
  id?: string;
  campaign_id?: string;
  character_id: string;
  level: number;
  hp_max_override: number | null;
  ac_override: number | null;
  notes: string;
  conditions: string[];
  death_save_successes: number;
  death_save_failures: number;
  hit_dice_used: number;
  last_long_rest: string | null;
  last_short_rest: string | null;
  created_at?: string;
  updated_at?: string;
};

export const defaultCampaignCharacter = (
  character_id: string,
  level: number,
  hpMax: number,
): CampaignCharacter => ({
  character_id,
  level,
  hp_max_override: hpMax,
  ac_override: null,
  notes: '',
  conditions: [],
  death_save_successes: 0,
  death_save_failures: 0,
  hit_dice_used: 0,
  last_long_rest: null,
  last_short_rest: null,
});

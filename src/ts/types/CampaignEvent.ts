// The campaign timeline (worker/migrations/0003). Most events are
// written by the server as a side effect (a fight recorded, a level-up,
// meeting an NPC, a thread resolving); jots are the DM's own notes.

export type EventKind = 'jot' | 'encounter' | 'character' | 'npc' | 'thread' | 'session';

export const JOT_TAGS = ['clue', 'loot', 'promise', 'rule', 'quote'] as const;
export type JotTag = typeof JOT_TAGS[number];

export const JOT_TAG_LABELS: Record<string, string> = {
  clue: 'Clue',
  loot: 'Loot',
  promise: 'Promise',
  rule: 'Rule call',
  quote: 'Quote',
};

export type CampaignEvent = {
  id: string;
  campaign_id: string;
  session_id: string | null;
  kind: EventKind;
  text: string;
  tag: string;
  dm_only: boolean;
  ref_kind: string;
  ref_id: string;
  data: Record<string, unknown>;
  created_at: string; // UTC "YYYY-MM-DD HH:MM:SS"
};

export type NewJot = {
  text: string;
  tag?: string;
  dm_only?: boolean;
  session_id?: string | null;
  ref_kind?: string;
  ref_id?: string;
};

// D1 stores UTC without a zone marker.
export const eventTime = (e: Pick<CampaignEvent, 'created_at'>) => new Date(`${e.created_at.replace(' ', 'T')}Z`);

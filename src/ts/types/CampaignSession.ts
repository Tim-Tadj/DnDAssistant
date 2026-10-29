// Phase 8: campaign-session wire shape.
//
// A session moves planned → live → played. The planned one is the next
// session being prepped (at most one per campaign); while a session is
// live, everything that happens is stamped with it.

export type SessionStatus = 'planned' | 'live' | 'played';

// One line of a session's prep checklist. `ref_*` points at the
// encounter, NPC or thread it's about; plain notes have none.
export type PrepItem = {
  id: string;
  text: string;
  done: boolean;
  ref_kind?: 'encounter' | 'npc' | 'thread';
  ref_id?: string;
};

export type CampaignSession = {
  id?: string;
  campaign_id?: string;
  session_number: number;
  title: string;
  played_on: string | null; // ISO date (YYYY-MM-DD)
  summary: string;
  prep_notes: string;
  attendees: string[];
  status?: SessionStatus;
  prep?: PrepItem[];
  strong_start?: string;
  started_at?: string;
  ended_at?: string;
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

export const isPlayedSession = (s: CampaignSession) => (s.status ?? 'played') === 'played';

export const newPrepItem = (text: string, ref?: Pick<PrepItem, 'ref_kind' | 'ref_id'>): PrepItem => ({
  id: Math.random().toString(36).slice(2, 10),
  text,
  done: false,
  ...ref,
});

// Today as YYYY-MM-DD in local time.
export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

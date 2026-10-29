// The campaign timeline (`campaign_events`, migration 0003). Routes call
// `logEvent` as a side effect of the change they make, so the history of
// play writes itself. An event lands on the session that is live at the
// time unless the caller names one.

import { first, run } from '../db';

export type EventKind = 'jot' | 'encounter' | 'character' | 'npc' | 'thread' | 'session';

export type NewEvent = {
  kind: EventKind;
  text: string;
  tag?: string;
  dm_only?: boolean;
  ref_kind?: string;
  ref_id?: string;
  data?: Record<string, unknown>;
  /** undefined: the live session, if any. null: no session. */
  session_id?: string | null;
};

export async function liveSessionId(db: D1Database, campaignId: string): Promise<string | null> {
  const row = await first<{ id: string }>(
    db,
    `SELECT id FROM campaign_sessions WHERE campaign_id = ? AND status = 'live'
     ORDER BY session_number DESC LIMIT 1`,
    campaignId,
  );
  return row?.id ?? null;
}

export async function logEvent(db: D1Database, campaignId: string, ev: NewEvent): Promise<string> {
  const id = crypto.randomUUID();
  const sessionId = ev.session_id === undefined ? await liveSessionId(db, campaignId) : ev.session_id;
  await run(
    db,
    `INSERT INTO campaign_events
       (id, campaign_id, session_id, kind, text, tag, dm_only, ref_kind, ref_id, data_json)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    id,
    campaignId,
    sessionId,
    ev.kind,
    ev.text,
    ev.tag ?? '',
    ev.dm_only ? 1 : 0,
    ev.ref_kind ?? '',
    ev.ref_id ?? '',
    JSON.stringify(ev.data ?? {}),
  );
  return id;
}

/**
 * Logging must never break the change it records: a failed insert
 * (say, the events table isn't migrated yet) is reported and dropped.
 */
export async function tryLogEvent(db: D1Database, campaignId: string, ev: NewEvent): Promise<void> {
  try {
    await logEvent(db, campaignId, ev);
  } catch (e) {
    console.error('campaign event not logged:', e);
  }
}

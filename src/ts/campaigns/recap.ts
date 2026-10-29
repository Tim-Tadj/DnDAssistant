// Turning a session's timeline into words: the draft summary in the End
// session dialog, and the player-facing text behind "Copy recap".

import { CampaignEvent, JOT_TAG_LABELS } from '../types/CampaignEvent';
import { CampaignSession } from '../types/CampaignSession';

// Oldest first, without the session's own start/end markers. DM-only
// jots stay out unless asked for.
export function recapEvents(events: CampaignEvent[], includeDmOnly = false): CampaignEvent[] {
  return events
    .filter((e) => e.kind !== 'session' && (includeDmOnly || !e.dm_only))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export const recapLine = (e: CampaignEvent) =>
  e.kind === 'jot' && e.tag && JOT_TAG_LABELS[e.tag] ? `${JOT_TAG_LABELS[e.tag]}: ${e.text}` : e.text;

// DM-only jots stay on the timeline but out of the summary, since the
// summary is what "Copy recap" shares.
export function draftSummary(events: CampaignEvent[]): string {
  return recapEvents(events)
    .map((e) => `- ${recapLine(e)}`)
    .join('\n');
}

// `[[npc:Captain Yara]]` → `Captain Yara` for plain-text sharing.
const unlink = (s: string) => s.replace(/\[\[[a-z]+:([^\]|]+)(?:\|([^\]]+))?\]\]/gi, (_m, name, label) => label || name);

export function playerRecap(session: CampaignSession, events: CampaignEvent[], campaignName?: string): string {
  const date = session.played_on
    ? new Date(`${session.played_on}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  const heading = [
    `${campaignName ? `${campaignName} — ` : ''}Session ${session.session_number}${session.title ? `: ${session.title}` : ''}`,
    date,
  ]
    .filter(Boolean)
    .join(' · ');
  const summary = unlink(session.summary.trim());
  const parts = [heading];
  if (summary) parts.push(summary);
  const highlights = recapEvents(events)
    .map((e) => unlink(recapLine(e)))
    // The summary is often drafted from the same events; don't repeat them.
    .filter((line) => !summary.includes(line))
    .map((line) => `• ${line}`);
  if (highlights.length) parts.push(`Highlights\n${highlights.join('\n')}`);
  return parts.join('\n\n');
}

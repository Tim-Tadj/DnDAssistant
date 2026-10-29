// Who's playing in a campaign: characters added to it (with their
// per-campaign state) plus members of its linked parties who haven't
// been added yet. Used for attendees, the party-at-a-glance strip and
// the encounter forecast.

import { useEffect, useState } from 'react';
import { campaignCharactersApi } from '../api/campaign-characters';
import { campaignPartiesApi } from '../api/campaign-parties';
import { charactersApi } from '../api/characters';
import { Character } from '../types/Character';
import { CampaignCharacter } from '../types/CampaignCharacter';

export type RosterEntry = { character: Character; state: CampaignCharacter | null };

export const rosterLevel = (r: RosterEntry) => r.state?.level ?? r.character.level ?? 1;
export const rosterHp = (r: RosterEntry) => r.state?.hp_max_override ?? r.character.hp_max ?? 10;
export const rosterAc = (r: RosterEntry) => r.state?.ac_override ?? r.character.ac ?? 12;

export async function loadRoster(campaignId: string): Promise<RosterEntry[]> {
  const safe = <T,>(p: Promise<T>, fallback: T) => p.catch(() => fallback);
  const [states, parties, characters] = await Promise.all([
    safe(campaignCharactersApi.list(campaignId), []),
    safe(campaignPartiesApi.list(campaignId), []),
    safe(charactersApi.list(), []),
  ]);
  const byId = new Map(characters.map((c) => [c.id, c]));
  const out: RosterEntry[] = [];
  const seen = new Set<string>();
  for (const s of states) {
    const character = byId.get(s.character_id);
    if (!character || seen.has(character.id)) continue;
    seen.add(character.id);
    out.push({ character, state: s });
  }
  for (const p of parties) {
    for (const id of p.member_ids ?? []) {
      const character = byId.get(id);
      if (!character || seen.has(id)) continue;
      seen.add(id);
      out.push({ character, state: null });
    }
  }
  return out;
}

export function useRoster(campaignId: string | null, version = 0): RosterEntry[] | null {
  const [roster, setRoster] = useState<RosterEntry[] | null>(null);
  useEffect(() => {
    let alive = true;
    setRoster(null);
    if (!campaignId) return;
    loadRoster(campaignId).then((r) => alive && setRoster(r));
    return () => {
      alive = false;
    };
  }, [campaignId, version]);
  return roster;
}

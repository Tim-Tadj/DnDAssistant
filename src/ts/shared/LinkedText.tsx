/**
 * LinkedText - renders plain text with `[[...]]` references as
 * clickable chips. The `[[kind:term]]` syntax is recognized:
 *
 *   [[monster:Goblin]]        -> a chip linking to /monsters
 *   [[spell:Fireball]]        -> a chip linking to /spells
 *   [[gear:Longsword]]        -> a chip linking to /gear
 *   [[npc:Captain Yara]]      -> a chip; in this campaign, the
 *                                  NPC is resolved from the
 *                                  campaign's NPC roster
 *   [[location:Iron Keep]]    -> a chip rendered as a "location"
 *                                  note (the term is just shown
 *                                  bold; the URL is to the
 *                                  campaign's map)
 *
 * If `kind` is omitted, defaults to `monster`. Unknown kinds
 * are still rendered as chips but don't open anything.
 *
 * The component is intentionally simple — a single regex
 * pass, no infinite-resolution loop, no nested refs.
 */

import React, { FC, useEffect, useMemo, useState } from 'react';
import { Box, Chip, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/api-client';
import { Monster } from '../types/Monster';
import { Spell } from '../types/Spell';
import { GearItem } from '../types/Gear';
import { CampaignNpc } from '../types/CampaignNpc';

type LinkKind = 'monster' | 'spell' | 'gear' | 'npc' | 'location' | 'character';

const KIND_PATH: Record<LinkKind, string> = {
  monster: 'monsters',
  spell: 'spells',
  gear: 'gear',
  npc: 'campaign',
  location: 'campaign',
  character: 'characters',
};

const KIND_COLOR: Record<LinkKind, string> = {
  monster: '#c9a14a',
  spell: '#7d96b3',
  gear: '#a07d2e',
  npc: '#6fa86b',
  location: '#a07d2e',
  character: '#6fa86b',
};

const KIND_ICON: Record<LinkKind, string> = {
  monster: '⚔',
  spell: '✦',
  gear: '🛡',
  npc: '👤',
  location: '📍',
  character: '🧝',
};

export type ResolvedRef = {
  kind: LinkKind;
  term: string;
  label: string;
  id?: number | string;
};

const REF_RE = /\[\[([a-z]+)?:([^\]]+)\]\]/g;

export function parseRefs(text: string): Array<{ kind: LinkKind; term: string; raw: string } | string> {
  const out: Array<{ kind: LinkKind; term: string; raw: string } | string> = [];
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  while ((m = REF_RE.exec(text)) !== null) {
    if (m.index > lastIdx) out.push(text.slice(lastIdx, m.index));
    const kind = (m[1] as LinkKind) || 'monster';
    const term = (m[2] ?? '').trim();
    out.push({ kind, term, raw: m[0] });
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < text.length) out.push(text.slice(lastIdx));
  return out;
}

export type LinkedTextProps = {
  text: string;
  campaignId?: string;
};

const LinkedText: FC<LinkedTextProps> = ({ text, campaignId }) => {
  const navigate = useNavigate();
  const tokens = useMemo(() => parseRefs(text), [text]);

  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [spells, setSpells] = useState<Spell[]>([]);
  const [gear, setGear] = useState<GearItem[]>([]);
  const [npcs, setNpcs] = useState<CampaignNpc[]>([]);

  useEffect(() => {
    api.get<Monster[]>('/monsters').then(setMonsters).catch(() => undefined);
    api.get<Spell[]>('/spells').then(setSpells).catch(() => undefined);
    api.get<GearItem[]>('/gear').then(setGear).catch(() => undefined);
    if (campaignId) {
      api
        .get<CampaignNpc[]>(`/campaigns/${campaignId}/npcs`)
        .then(setNpcs)
        .catch(() => undefined);
    }
  }, [campaignId]);

  const resolve = (
    kind: LinkKind,
    term: string
  ): { label: string; id?: number | string; path: string } => {
    const t = term.toLowerCase();
    if (kind === 'monster') {
      const m = monsters.find((x) => x.name.toLowerCase() === t);
      return m ? { label: m.name, id: m.id, path: 'monsters' } : { label: term, path: 'monsters' };
    }
    if (kind === 'spell') {
      const s = spells.find((x) => x.name.toLowerCase() === t);
      return s ? { label: s.name, id: s.id, path: 'spells' } : { label: term, path: 'spells' };
    }
    if (kind === 'gear') {
      const g = gear.find((x) => x.name.toLowerCase() === t);
      return g ? { label: g.name, id: g.id, path: 'gear' } : { label: term, path: 'gear' };
    }
    if (kind === 'npc') {
      const n = npcs.find((x) => x.name.toLowerCase() === t);
      return n ? { label: n.name, id: n.id, path: 'campaign' } : { label: term, path: 'campaign' };
    }
    if (kind === 'location') {
      return { label: term, path: 'campaign' };
    }
    if (kind === 'character') {
      return { label: term, path: 'characters' };
    }
    return { label: term, path: '' };
  };

  return (
    <Box sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
      {tokens.map((tok, i) => {
        if (typeof tok === 'string') {
          return <span key={i}>{tok}</span>;
        }
        const r = resolve(tok.kind, tok.term);
        return (
          <Chip
            key={i}
            size="small"
            label={`${KIND_ICON[tok.kind]} ${r.label}`}
            onClick={
              r.path
                ? () => {
                    if (tok.kind === 'npc' || tok.kind === 'location') {
                      // For campaign-scoped refs, stay on the campaign page.
                      navigate(`/campaign`);
                    } else {
                      navigate(`/${r.path}`);
                    }
                  }
                : undefined
            }
            clickable={Boolean(r.path)}
            sx={{
              mx: 0.25,
              backgroundColor: `${KIND_COLOR[tok.kind]}26`,
              color: KIND_COLOR[tok.kind],
              border: `1px solid ${KIND_COLOR[tok.kind]}55`,
              '&:hover': { backgroundColor: `${KIND_COLOR[tok.kind]}3a` },
            }}
          />
        );
      })}
    </Box>
  );
};

export default LinkedText;

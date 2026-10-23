// Global search (Ctrl/Cmd+K). Searches everything the user can see:
// monsters, spells, gear, characters, campaigns, NPCs and saved
// encounters, matching on more than the name (type, school, class,
// setting, location, notes...). The highlighted hit is previewed on the
// right; opening it goes to its page with that item open (its drawer,
// its NPC card, its encounter), switching campaign first when the item
// belongs to one.
//
// Lists are cached for the session and refreshed in the background
// each time the dialog opens, so it's instant after the first time.

import React, { FC, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  Divider,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  TextField,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Add,
  Book,
  Close,
  Group,
  Map as MapIcon,
  OpenInNew,
  Person,
  PlayArrow,
  Science,
  Search as SearchIcon,
  Shield,
  ShoppingCart,
  SportsMartialArts,
} from '@mui/icons-material';
import { api } from '../api/api-client';
import { Monster } from '../types/Monster';
import { Spell } from '../types/Spell';
import { GearItem } from '../types/Gear';
import { Character, DndClass } from '../types/Character';
import { Campaign } from '../types/Campaign';
import { CampaignNpc } from '../types/CampaignNpc';
import { EncounterSave, isPlayed } from '../types/EncounterSave';
import { useAuth } from '../auth/AuthContext';
import { useCampaignContext } from './CampaignContext';
import { useEncounter } from '../encounters/EncounterContext';
import { useRunEncounter } from '../encounters/useRunEncounter';
import { classNameOf, useClasses, useRaces } from './useReference';
import MonsterStatBlock from './MonsterStatBlock';
import SpellCard from './SpellCard';
import GearDetailCard from './GearDetailCard';
import CharacterCard from './CharacterCard';
import CampaignDetailCard from './CampaignDetailCard';
import {
  CharacterAvatar,
  GearAvatar,
  InitialsAvatar,
  MonsterAvatar,
  SpellAvatar,
  VisualBadge,
  roleColor,
} from './EntityAvatar';

type SearchData = {
  monsters: Monster[];
  spells: Spell[];
  gear: GearItem[];
  characters: Character[];
  campaigns: Campaign[];
  npcs: CampaignNpc[];
  encounters: EncounterSave[];
};

type Kind = 'campaign' | 'encounter' | 'npc' | 'character' | 'monster' | 'spell' | 'gear';

type Hit =
  | { kind: 'monster'; item: Monster }
  | { kind: 'spell'; item: Spell }
  | { kind: 'gear'; item: GearItem }
  | { kind: 'character'; item: Character }
  | { kind: 'campaign'; item: Campaign }
  | { kind: 'npc'; item: CampaignNpc }
  | { kind: 'encounter'; item: EncounterSave };

type Scored = Hit & { key: string; label: string; hint: string; score: number };

// Tie-break order for groups: the user's own things, then the books.
const KINDS: Kind[] = ['campaign', 'encounter', 'npc', 'character', 'monster', 'spell', 'gear'];

const KIND_LABEL: Record<Kind, string> = {
  campaign: 'Campaigns',
  encounter: 'Encounters',
  npc: 'NPCs',
  character: 'Characters',
  monster: 'Monsters',
  spell: 'Spells',
  gear: 'Gear',
};

const KIND_ICON: Record<Kind, ReactNode> = {
  campaign: <MapIcon fontSize="small" />,
  encounter: <SportsMartialArts fontSize="small" />,
  npc: <Group fontSize="small" />,
  character: <Person fontSize="small" />,
  monster: <Shield fontSize="small" />,
  spell: <Book fontSize="small" />,
  gear: <ShoppingCart fontSize="small" />,
};

// Empty box: shortcuts to each page.
const JUMPS: { label: string; path: string; kind: Kind }[] = [
  { label: 'Campaign', path: '/campaign', kind: 'campaign' },
  { label: 'Build an encounter', path: '/encounter?tab=build', kind: 'encounter' },
  { label: 'Run tracker', path: '/encounter?tab=run', kind: 'encounter' },
  { label: 'Encounter library', path: '/encounter?tab=library', kind: 'encounter' },
  { label: 'Characters', path: '/characters', kind: 'character' },
  { label: 'Monsters', path: '/monsters', kind: 'monster' },
  { label: 'Spells', path: '/spells', kind: 'spell' },
  { label: 'Gear', path: '/gear', kind: 'gear' },
];

const PER_GROUP = 8;

// ---- Data -------------------------------------------------------------

let cache: { userId: string | null; data: SearchData } | null = null;

export async function loadAllForSearch(signedIn: boolean): Promise<SearchData> {
  const get = <T,>(path: string, needsAuth = false) =>
    needsAuth && !signedIn ? Promise.resolve([] as T[]) : api.get<T[]>(path).catch(() => [] as T[]);
  const [monsters, spells, gear, characters, campaigns, npcs, encounters] = await Promise.all([
    get<Monster>('/monsters'),
    get<Spell>('/spells'),
    get<GearItem>('/gear'),
    get<Character>('/characters', true),
    get<Campaign>('/campaigns', true),
    get<CampaignNpc>('/npcs', true),
    get<EncounterSave>('/encounter-saves', true),
  ]);
  return { monsters, spells, gear, characters, campaigns, npcs, encounters };
}

// ---- Matching ---------------------------------------------------------

// Every word of the query has to match the name or one of the other
// fields; name matches rank well above the rest.
function scoreHit(name: string, rest: string, words: string[]): number {
  const n = name.toLowerCase();
  const r = rest.toLowerCase();
  let total = 0;
  for (const w of words) {
    if (n === w) total += 100;
    else if (n.startsWith(w)) total += 60;
    else if (new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(n)) total += 40;
    else if (n.includes(w)) total += 25;
    else if (r.includes(w)) total += 8;
    else return 0;
  }
  // A whole-query name match beats word-by-word ones.
  if (n === words.join(' ')) total += 100;
  return total;
}

const join = (...parts: (string | number | null | undefined | false)[]) =>
  parts.filter((p) => p !== null && p !== undefined && p !== false && p !== '').join(' · ');

// ---- Component --------------------------------------------------------

const GlobalSearch: FC<{
  open: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}> = ({ open, onClose, onNavigate }) => {
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up('md'));
  const { user } = useAuth();
  const { activeCampaign, campaigns, setActiveCampaignId } = useCampaignContext();
  const enc = useEncounter();
  const runner = useRunEncounter();
  const classes = useClasses(open && !!user);
  const races = useRaces(open && !!user);

  const [query, setQuery] = useState('');
  const [data, setData] = useState<SearchData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
    const userId = user?.id ?? null;
    if (cache && cache.userId === userId) setData(cache.data);
    else setData(null);
    // Show what's cached, refresh behind it.
    setLoading(true);
    let alive = true;
    loadAllForSearch(!!user)
      .then((d) => {
        cache = { userId, data: d };
        if (alive) setData(d);
      })
      .finally(() => alive && setLoading(false));
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [open, user]);

  const campaignName = useCallback(
    (id?: string | null) => (id ? campaigns.find((c) => c.id === id)?.name : undefined),
    [campaigns],
  );

  const results: Scored[] = useMemo(() => {
    const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (!data || words.length === 0) return [];
    const out: Scored[] = [];
    const add = (hit: Hit, key: string, label: string, hint: string, rest: string, boost = 0) => {
      const s = scoreHit(label, rest, words);
      if (s > 0) out.push({ ...hit, key: `${hit.kind}-${key}`, label, hint, score: s + boost } as Scored);
    };
    const inActive = (id?: string | null) => !!id && id === activeCampaign?.id;

    for (const c of data.campaigns) {
      add({ kind: 'campaign', item: c }, String(c.id), c.name, join(c.setting, c.status, c.id === activeCampaign?.id && 'active'), join(c.setting, c.status, c.description, c.notes));
    }
    for (const e of data.encounters) {
      const played = isPlayed(e);
      const monsters = (e.monsters ?? []).map((m) => m.name).join(' ');
      add(
        { kind: 'encounter', item: e },
        String(e.id),
        e.name,
        join(played ? e.outcome || 'Played' : 'Prepared', e.difficulty, campaignName(e.campaign_id)),
        join(monsters, e.notes, e.outcome, e.difficulty, played ? 'played' : 'prepared planned'),
        inActive(e.campaign_id) ? 15 : 0,
      );
    }
    for (const n of data.npcs) {
      const cid = n.campaign_id ?? n.campaign_tags?.[0];
      add(
        { kind: 'npc', item: n },
        String(n.id),
        n.name,
        join(n.role, n.race, n.location, n.status !== 'alive' && n.status),
        join(n.role, n.race, n.location, n.status, n.description, n.notes),
        inActive(cid) || n.campaign_tags?.includes(activeCampaign?.id ?? '') ? 15 : 0,
      );
    }
    for (const c of data.characters) {
      const cls = classNameOf(classes, c.class_id);
      const race = races.find((r) => r.id === c.race_id)?.name;
      add({ kind: 'character', item: c }, c.id, c.name, join(`Level ${c.level}`, race, cls), join(race, cls, c.alignment, c.background, c.notes));
    }
    for (const m of data.monsters) {
      add({ kind: 'monster', item: m }, String(m.id ?? m.name), m.name, join(m.meta, `CR ${m.challenge ?? '?'}`), join(m.meta, m.challenge, m.languages, m.senses));
    }
    for (const s of data.spells) {
      add({ kind: 'spell', item: s }, String(s.id ?? s.name), s.name, join(s.level, s.school, s.ritual && 'ritual'), join(s.level, s.school, s.classes?.join(' '), s.tags?.join(' '), s.casting_time, s.ritual && 'ritual'));
    }
    for (const g of data.gear) {
      add({ kind: 'gear', item: g }, String(g.id ?? g.name), g.name, join(g.kind, g.type, g.cost), join(g.kind, g.type, g.Properties, g.Damage, g.description));
    }
    return out.sort((a, b) => b.score - a.score);
  }, [data, query, activeCampaign, campaignName, classes, races]);

  const groups = useMemo(() => {
    const byKind = new Map<Kind, Scored[]>();
    for (const r of results) byKind.set(r.kind, [...(byKind.get(r.kind) ?? []), r]);
    // Best match first: the group holding it leads, ties in KINDS order.
    return KINDS.filter((k) => byKind.has(k))
      .map((k) => {
        const all = byKind.get(k) ?? [];
        return { kind: k, total: all.length, best: all[0].score, hits: all.slice(0, PER_GROUP) };
      })
      .sort((a, b) => b.best - a.best || KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind));
  }, [results]);

  const flat = useMemo(() => groups.flatMap((g) => g.hits), [groups]);
  const active = flat[activeIndex];
  const searching = query.trim().length > 0;

  useEffect(() => setActiveIndex(0), [query]);
  useEffect(() => {
    listRef.current?.querySelector('.Mui-selected')?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  // Where a hit lives, with it open. Switches campaign first when the
  // hit belongs to one that isn't active.
  const openHit = (h: Scored) => {
    const focus = (id?: string | null) => {
      if (id && id !== activeCampaign?.id && campaigns.some((c) => c.id === id)) setActiveCampaignId(id);
    };
    const open = (id: string | number | undefined) => (id === undefined ? '' : `open=${encodeURIComponent(String(id))}`);
    switch (h.kind) {
      case 'monster':
        return onNavigate(`/monsters?${open(h.item.id ?? h.item.name)}`);
      case 'spell':
        return onNavigate(`/spells?${open(h.item.id ?? h.item.name)}`);
      case 'gear':
        return onNavigate(`/gear?${open(h.item.id ?? h.item.name)}`);
      case 'character':
        return onNavigate(`/characters?${open(h.item.id)}`);
      case 'campaign':
        if (h.item.id) setActiveCampaignId(h.item.id);
        return onNavigate('/campaign?tab=overview');
      case 'npc': {
        const cid = h.item.campaign_id ?? h.item.campaign_tags?.[0];
        focus(cid);
        return onNavigate(`/campaign?tab=npcs&${open(h.item.id)}`);
      }
      case 'encounter':
        if (h.item.campaign_id) {
          focus(h.item.campaign_id);
          return onNavigate(`/campaign?tab=encounters&${open(h.item.id)}`);
        }
        // Not in a campaign: the Library, showing everything.
        return onNavigate(`/encounter?tab=library&scope=all&${open(h.item.id)}`);
    }
  };

  const runSave = (s: EncounterSave, mode: 'live' | 'practice') => {
    onClose();
    void runner.run(s, mode);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const max = searching ? flat.length : JUMPS.length;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(max - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!searching) {
        const j = JUMPS[activeIndex];
        if (j) onNavigate(j.path);
      } else if (active) openHit(active);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const selectedSx = { '&.Mui-selected': { backgroundColor: alpha(theme.palette.primary.main, 0.16) } };

  const list = !searching ? (
    <List dense disablePadding>
      <GroupHeader label="Jump to" />
      {JUMPS.map((j, i) => (
        <ListItemButton
          key={j.path}
          selected={i === activeIndex}
          onClick={() => onNavigate(j.path)}
          onMouseEnter={() => setActiveIndex(i)}
          sx={{ px: 2, ...selectedSx }}
        >
          <ListItemIcon sx={{ minWidth: 32, color: 'text.secondary' }}>{KIND_ICON[j.kind]}</ListItemIcon>
          <ListItemText primary={j.label} />
        </ListItemButton>
      ))}
    </List>
  ) : loading && !data ? (
    <Stack alignItems="center" sx={{ p: 4 }}>
      <CircularProgress size={24} />
    </Stack>
  ) : flat.length === 0 ? (
    <Stack alignItems="center" sx={{ p: 4, color: 'text.secondary' }}>
      <Typography>No results for &ldquo;{query}&rdquo;</Typography>
    </Stack>
  ) : (
    groups.map((g) => {
      const offset = flat.indexOf(g.hits[0]);
      return (
        <List key={g.kind} dense disablePadding>
          <GroupHeader label={KIND_LABEL[g.kind]} icon={KIND_ICON[g.kind]} count={g.total} shown={g.hits.length} />
          {g.hits.map((hit, j) => (
            <ListItemButton
              key={hit.key}
              selected={offset + j === activeIndex}
              onClick={() => openHit(hit)}
              onMouseEnter={() => setActiveIndex(offset + j)}
              sx={{ px: 2, py: 0.75, ...selectedSx }}
            >
              <Box sx={{ mr: 1.5, display: 'flex' }}>
                <HitAvatar hit={hit} classes={classes} />
              </Box>
              <ListItemText
                primary={hit.label}
                secondary={hit.hint}
                primaryTypographyProps={{ fontWeight: 500, noWrap: true }}
                secondaryTypographyProps={{ noWrap: true }}
              />
            </ListItemButton>
          ))}
          <Divider />
        </List>
      );
    })
  );

  return (
    <>
      {runner.dialog}
      <Dialog open={open} onClose={onClose} fullWidth maxWidth={wide && searching ? 'lg' : 'sm'}>
        <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <TextField
            fullWidth
            autoFocus
            inputRef={inputRef}
            placeholder={user ? 'Search campaigns, encounters, NPCs, characters, monsters, spells, gear…' : 'Search monsters, spells, gear…'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  {loading && <CircularProgress size={16} sx={{ mr: 1 }} />}
                  <IconButton size="small" onClick={onClose} aria-label="Close search">
                    <Close fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
              sx: { '& fieldset': { border: 'none' }, fontSize: '1.05rem' },
            }}
            sx={{ '& .MuiOutlinedInput-root': { backgroundColor: 'transparent' } }}
          />
        </Box>
        <Stack direction="row" sx={{ height: searching ? { xs: '60vh', md: 560 } : 'auto', minHeight: 0 }}>
          <Box
            ref={listRef}
            sx={{
              width: wide && searching ? 380 : '100%',
              flexShrink: 0,
              overflowY: 'auto',
              maxHeight: searching ? undefined : 480,
              borderRight: wide && searching ? 1 : 0,
              borderColor: 'divider',
            }}
          >
            {list}
          </Box>
          {wide && searching && (
            <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              {active ? (
                <>
                  <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
                    <Preview hit={active} campaignName={campaignName} />
                  </Box>
                  <Stack direction="row" spacing={1} sx={{ p: 1.5, borderTop: 1, borderColor: 'divider' }} flexWrap="wrap" useFlexGap>
                    <Button variant="contained" size="small" startIcon={<OpenInNew />} onClick={() => openHit(active)}>
                      {openLabel(active)}
                    </Button>
                    {active.kind === 'encounter' && (
                      <>
                        <Button size="small" startIcon={<PlayArrow />} onClick={() => runSave(active.item, 'live')}>
                          {isPlayed(active.item) ? 'Run again' : 'Run'}
                        </Button>
                        {!isPlayed(active.item) && (
                          <Button size="small" startIcon={<Science />} onClick={() => runSave(active.item, 'practice')}>
                            Test run
                          </Button>
                        )}
                      </>
                    )}
                    {active.kind === 'monster' && enc.monstersInCombat.length > 0 && (
                      <Button
                        size="small"
                        startIcon={<Add />}
                        onClick={() => {
                          enc.addMonsters([active.item]);
                          onNavigate('/encounter?tab=run');
                        }}
                      >
                        Add to running fight
                      </Button>
                    )}
                  </Stack>
                </>
              ) : (
                <Stack alignItems="center" justifyContent="center" sx={{ flexGrow: 1, color: 'text.secondary' }}>
                  <Typography variant="body2">Nothing to preview</Typography>
                </Stack>
              )}
            </Box>
          )}
        </Stack>
        <Stack
          direction="row"
          spacing={2}
          justifyContent="center"
          sx={{ px: 2, py: 1, borderTop: 1, borderColor: 'divider', bgcolor: alpha(theme.palette.primary.main, 0.04) }}
        >
          <Typography variant="caption" color="text.secondary">
            <kbd>↑↓</kbd> navigate
          </Typography>
          <Typography variant="caption" color="text.secondary">
            <kbd>↵</kbd> open
          </Typography>
          <Typography variant="caption" color="text.secondary">
            <kbd>esc</kbd> close
          </Typography>
        </Stack>
      </Dialog>
    </>
  );
};

const openLabel = (h: Scored) => {
  switch (h.kind) {
    case 'campaign':
      return 'Open campaign';
    case 'npc':
      return 'Open in campaign';
    case 'encounter':
      return h.item.campaign_id ? 'Open in campaign' : 'Open in library';
    default:
      return `Open in ${KIND_LABEL[h.kind]}`;
  }
};

const GroupHeader: FC<{ label: string; icon?: ReactNode; count?: number; shown?: number }> = ({ label, icon, count, shown }) => {
  const theme = useTheme();
  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      sx={{ px: 2, py: 0.5, bgcolor: alpha(theme.palette.primary.main, 0.06), position: 'sticky', top: 0, zIndex: 1, backdropFilter: 'blur(6px)' }}
    >
      {icon && <Box sx={{ color: 'primary.main', display: 'flex' }}>{icon}</Box>}
      <Typography variant="overline" color="text.secondary" sx={{ flexGrow: 1 }}>
        {label}
      </Typography>
      {count !== undefined && (
        <Typography variant="caption" color="text.secondary">
          {shown !== undefined && shown < count ? `top ${shown} of ${count}` : count}
        </Typography>
      )}
    </Stack>
  );
};

// ---- Avatars ----------------------------------------------------------

const OUTCOME_COLOR: Record<string, string> = { Victory: '#6fa86b', Defeat: '#d36c6c' };

const HitAvatar: FC<{ hit: Hit; classes: DndClass[]; size?: number }> = ({ hit, classes, size = 32 }) => {
  switch (hit.kind) {
    case 'monster':
      return <MonsterAvatar monster={hit.item} size={size} />;
    case 'spell':
      return <SpellAvatar spell={hit.item} size={size} />;
    case 'gear':
      return <GearAvatar item={hit.item} size={size} />;
    case 'character':
      return <CharacterAvatar name={hit.item.name} className={classNameOf(classes, hit.item.class_id)} size={size} />;
    case 'npc':
      return <InitialsAvatar name={hit.item.name} color={roleColor(hit.item.role)} size={size} title={hit.item.role} />;
    case 'campaign':
      return <VisualBadge visual={{ label: 'Campaign', color: '#c9a14a', Icon: MapIcon }} size={size} />;
    case 'encounter': {
      const played = isPlayed(hit.item);
      const color = played ? OUTCOME_COLOR[hit.item.outcome ?? ''] ?? '#9aa5b1' : '#7d96b3';
      return <VisualBadge visual={{ label: played ? 'Played' : 'Prepared', color, Icon: SportsMartialArts }} size={size} />;
    }
  }
};

// ---- Preview ----------------------------------------------------------

const Preview: FC<{
  hit: Scored;
  campaignName: (id?: string | null) => string | undefined;
}> = ({ hit, campaignName }) => {
  switch (hit.kind) {
    case 'monster':
      return <MonsterStatBlock monster={hit.item} compact />;
    case 'spell':
      return <SpellCard spell={hit.item} />;
    case 'gear':
      return <GearDetailCard item={hit.item} />;
    case 'character':
      return <CharacterCard item={hit.item} />;
    case 'campaign':
      return <CampaignDetailCard item={hit.item} />;
    case 'npc':
      return <NpcPreview npc={hit.item} campaign={campaignName(hit.item.campaign_id ?? hit.item.campaign_tags?.[0])} />;
    case 'encounter':
      return <EncounterPreview save={hit.item} campaign={campaignName(hit.item.campaign_id)} />;
  }
};

const Field: FC<{ label: string; children: ReactNode }> = ({ label, children }) => (
  <Box>
    <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.5 }}>
      {label}
    </Typography>
    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
      {children}
    </Typography>
  </Box>
);

const NpcPreview: FC<{ npc: CampaignNpc; campaign?: string }> = ({ npc, campaign }) => (
  <Stack spacing={1.5}>
    <Stack direction="row" spacing={1.5} alignItems="center">
      <InitialsAvatar name={npc.name} color={roleColor(npc.role)} size={48} title={npc.role} />
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h4">{npc.name}</Typography>
        <Typography variant="body2" color="text.secondary">
          {join(npc.role, npc.race, npc.alignment)}
        </Typography>
      </Box>
    </Stack>
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      {npc.status && <Chip size="small" label={npc.status} color={npc.status === 'alive' ? 'success' : 'default'} variant="outlined" />}
      {npc.location && <Chip size="small" label={npc.location} variant="outlined" />}
      {campaign && <Chip size="small" icon={<MapIcon />} label={campaign} variant="outlined" />}
    </Stack>
    {npc.description && <Field label="Description">{npc.description}</Field>}
    {npc.notes && <Field label="Notes">{npc.notes}</Field>}
  </Stack>
);

const EncounterPreview: FC<{ save: EncounterSave; campaign?: string }> = ({ save, campaign }) => {
  const played = isPlayed(save);
  return (
    <Stack spacing={1.5}>
      <Box>
        <Typography variant="h4">{save.name || 'Unnamed encounter'}</Typography>
        <Typography variant="body2" color="text.secondary">
          {join(played ? 'Played' : 'Prepared', save.played_on && new Date(`${save.played_on}T00:00:00`).toLocaleDateString(), campaign ?? 'No campaign')}
        </Typography>
      </Box>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {save.outcome && <Chip size="small" label={save.outcome} color={save.outcome === 'Victory' ? 'success' : save.outcome === 'Defeat' ? 'error' : 'default'} />}
        {save.difficulty && <Chip size="small" label={save.difficulty} variant="outlined" />}
        {!!save.rounds && <Chip size="small" label={`${save.rounds} round${save.rounds === 1 ? '' : 's'}`} variant="outlined" />}
        <Chip size="small" label={`${save.total_xp.toLocaleString()} XP${played ? ' earned' : ''}`} variant="outlined" />
      </Stack>
      <Field label="Monsters">
        {(save.monsters ?? []).map((m) => `${m.count}× ${m.name}`).join(', ') || 'None'}
      </Field>
      {save.notes && <Field label={played ? 'Notes' : 'Prep notes'}>{save.notes}</Field>}
      {played && (save.log?.length ?? 0) > 0 && (
        <Field label="Combat log">
          {save.log
            ?.slice(-6)
            .map((e) => `R${e.round} ${e.text}`)
            .join('\n')}
          {(save.log?.length ?? 0) > 6 && '\n…'}
        </Field>
      )}
    </Stack>
  );
};

export default GlobalSearch;

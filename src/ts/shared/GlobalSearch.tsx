// Phase 7: Global fuzzy search across all entity types. Opens via Ctrl/Cmd+K
// from anywhere in the app. Lightweight: pulls a list per type on first open
// and caches in memory for the session.

import React, {
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Box,
  Dialog,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Close,
  Person,
  Search as SearchIcon,
  Shield,
  ShoppingCart,
  Book,
  Map as MapIcon,
} from '@mui/icons-material';
import { api } from '../api/api-client';
import { Monster } from '../types/Monster';
import { Spell } from '../types/Spell';
import { GearItem } from '../types/Gear';
import { Character } from '../types/Character';
import { Campaign } from '../types/Campaign';

type Hit = {
  kind: 'monster' | 'spell' | 'gear' | 'character' | 'campaign';
  id: string;
  label: string;
  hint: string;
  path: string;
};

type ResultGroup = {
  kind: Hit['kind'];
  label: string;
  icon: React.ReactNode;
  hits: Hit[];
};

const KIND_LABEL: Record<Hit['kind'], string> = {
  monster: 'Monsters',
  spell: 'Spells',
  gear: 'Gear',
  character: 'Characters',
  campaign: 'Campaigns',
};

const KIND_ICON: Record<Hit['kind'], React.ReactNode> = {
  monster: <Shield fontSize="small" />,
  spell: <Book fontSize="small" />,
  gear: <ShoppingCart fontSize="small" />,
  character: <Person fontSize="small" />,
  campaign: <MapIcon fontSize="small" />,
};

const KIND_PATH: Record<Hit['kind'], string> = {
  monster: 'monsters',
  spell: 'spells',
  gear: 'gear',
  character: 'characters',
  campaign: 'campaign',
};

const score = (text: string, q: string): number => {
  const t = text.toLowerCase();
  if (t === q) return 100;
  if (t.startsWith(q)) return 50;
  if (t.includes(q)) return 20;
  return 0;
};

export async function loadAllForSearch(): Promise<{
  monsters: Monster[];
  spells: Spell[];
  gear: GearItem[];
  characters: Character[];
  campaigns: Campaign[];
}> {
  const [monsters, spells, gear, characters, campaigns] = await Promise.all([
    api.get<Monster[]>('/monsters').catch(() => [] as Monster[]),
    api.get<Spell[]>('/spells').catch(() => [] as Spell[]),
    api.get<GearItem[]>('/gear').catch(() => [] as GearItem[]),
    api.get<Character[]>('/characters').catch(() => [] as Character[]),
    api.get<Campaign[]>('/campaigns').catch(() => [] as Campaign[]),
  ]);
  return { monsters, spells, gear, characters, campaigns };
}

const GlobalSearch: FC<{
  open: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}> = ({ open, onClose, onNavigate }) => {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [data, setData] = useState<Awaited<
    ReturnType<typeof loadAllForSearch>
  > | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Load data when the dialog opens
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
    setLoading(true);
    loadAllForSearch()
      .then(setData)
      .finally(() => setLoading(false));
    // Focus the input shortly after open
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  const results: Hit[] = useMemo(() => {
    if (!data || !query.trim()) {
      // Show small "jump to" hints when the box is empty
      const hints: Hit[] = (
        Object.keys(KIND_PATH) as Hit['kind'][]
      ).map((k) => ({
        kind: k,
        id: 'jump',
        label: KIND_LABEL[k],
        hint: 'Browse all',
        path: KIND_PATH[k],
      }));
      return hints;
    }
    const q = query.toLowerCase().trim();
    const hits: Hit[] = [];
    for (const m of data.monsters) {
      const s = score(m.name, q);
      if (s > 0)
        hits.push({
          kind: 'monster',
          id: String(m.id ?? m.name),
          label: m.name,
          hint: `${m.meta ?? ''} · CR ${m.challenge ?? '?'}`.trim(),
          path: `monsters`,
        });
    }
    for (const s of data.spells) {
      const sc = score(s.name, q);
      if (sc > 0)
        hits.push({
          kind: 'spell',
          id: String(s.id ?? s.name),
          label: s.name,
          hint: `${s.level} ${s.school}`,
          path: `spells`,
        });
    }
    for (const g of data.gear) {
      const sc = score(g.name, q);
      if (sc > 0)
        hits.push({
          kind: 'gear',
          id: String(g.id ?? g.name),
          label: g.name,
          hint: `${g.kind} · ${g.cost}`,
          path: `gear`,
        });
    }
    for (const c of data.characters) {
      const sc = score(c.name, q);
      if (sc > 0)
        hits.push({
          kind: 'character',
          id: c.id,
          label: c.name,
          hint: `Level ${c.level} ${c.alignment ?? ''}`.trim(),
          path: `characters`,
        });
    }
    for (const c of data.campaigns) {
      const sc = score(c.name, q);
      if (sc > 0)
        hits.push({
          kind: 'campaign',
          id: c.id ?? c.name,
          label: c.name,
          hint: `${c.setting} · ${c.status}`,
          path: `campaign`,
        });
    }
    return hits.sort((a, b) => {
      const ka = KIND_PATH[a.kind];
      const kb = KIND_PATH[b.kind];
      if (ka !== kb) return ka.localeCompare(kb);
      return score(b.label, q) - score(a.label, q);
    });
  }, [data, query]);

  const groups: ResultGroup[] = useMemo(() => {
    const m = new Map<Hit['kind'], Hit[]>();
    for (const h of results) {
      const arr = m.get(h.kind) ?? [];
      arr.push(h);
      m.set(h.kind, arr);
    }
    return (Object.keys(KIND_PATH) as Hit['kind'][])
      .map((k) => ({ kind: k, label: KIND_LABEL[k], icon: KIND_ICON[k], hits: m.get(k) ?? [] }))
      .filter((g) => g.hits.length > 0);
  }, [results]);

  const flat = useMemo(() => groups.flatMap((g) => g.hits), [groups]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(flat.length - 1, i + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const hit = flat[activeIndex];
        if (hit) {
          onNavigate(hit.path);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [activeIndex, flat, onNavigate, onClose]
  );

  // Reset highlight when results change
  useEffect(() => setActiveIndex(0), [results]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          backgroundColor: theme.palette.background.paper,
          backgroundImage: 'none',
          border: `1px solid ${theme.palette.divider}`,
          overflow: 'hidden',
        },
      }}
    >
      <Box sx={{ p: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <TextField
          fullWidth
          autoFocus
          inputRef={inputRef}
          placeholder="Search monsters, spells, gear, characters, campaigns…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: loading ? (
              <InputAdornment position="end">
                <CircularProgress size={16} />
              </InputAdornment>
            ) : (
              <InputAdornment position="end">
                <IconButton size="small" onClick={onClose}>
                  <Close fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
            sx: {
              '& fieldset': { border: 'none' },
              fontSize: '1.05rem',
            },
          }}
          sx={{ '& .MuiOutlinedInput-root': { backgroundColor: 'transparent' } }}
        />
      </Box>
      <Box sx={{ maxHeight: 480, overflowY: 'auto' }}>
        {loading && !data ? (
          <Stack alignItems="center" sx={{ p: 4 }}>
            <CircularProgress size={24} />
          </Stack>
        ) : flat.length === 0 ? (
          <Stack alignItems="center" sx={{ p: 4, color: 'text.secondary' }}>
            <Typography>No results for &ldquo;{query}&rdquo;</Typography>
          </Stack>
        ) : (
          groups.map((group) => {
            const offset = flat.findIndex((h) => h.kind === group.kind);
            return (
              <Box key={group.kind}>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{
                    px: 2,
                    py: 0.75,
                    backgroundColor: alpha(theme.palette.primary.main, 0.06),
                  }}
                >
                  <Box sx={{ color: 'primary.main', display: 'flex' }}>
                    {group.icon}
                  </Box>
                  <Typography
                    variant="overline"
                    color="text.secondary"
                    sx={{ flexGrow: 1 }}
                  >
                    {group.label}
                  </Typography>
                  <Chip label={group.hits.length} size="small" />
                </Stack>
                <List dense disablePadding>
                  {group.hits.map((hit) => {
                    const i = offset + group.hits.indexOf(hit);
                    const active = i === activeIndex;
                    return (
                      <ListItemButton
                        key={`${hit.kind}-${hit.id}`}
                        selected={active}
                        onClick={() => onNavigate(hit.path)}
                        onMouseEnter={() => setActiveIndex(i)}
                        sx={{
                          px: 2,
                          py: 1,
                          '&.Mui-selected': {
                            backgroundColor: alpha(
                              theme.palette.primary.main,
                              0.16
                            ),
                          },
                        }}
                      >
                        <ListItemText
                          primary={hit.label}
                          secondary={hit.hint}
                          primaryTypographyProps={{ fontWeight: 500 }}
                        />
                        <Chip
                          label={KIND_LABEL[hit.kind].slice(0, -1)}
                          size="small"
                          variant="outlined"
                          sx={{ ml: 1 }}
                        />
                      </ListItemButton>
                    );
                  })}
                </List>
                <Divider />
              </Box>
            );
          })
        )}
      </Box>
      <Box
        sx={{
          px: 2,
          py: 1,
          borderTop: `1px solid ${theme.palette.divider}`,
          backgroundColor: alpha(theme.palette.primary.main, 0.04),
        }}
      >
        <Stack direction="row" spacing={2} justifyContent="center">
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
      </Box>
    </Dialog>
  );
};

export default GlobalSearch;

// The top of a campaign's Overview: the next session (or the one being
// played), its strong start and a prep checklist. Items are plain notes
// or point at a planned encounter, an NPC or a thread. Whatever is left
// unticked when the session ends rolls over to the next one.

import React, { FC, KeyboardEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  IconButton,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material';
import { Add, Close, Flag, Group, Insights, PlayArrow, SportsMartialArts, Stop } from '@mui/icons-material';
import { useCampaignPlay } from '../shared/CampaignPlayContext';
import { useToast } from '../shared/ToastProvider';
import { Campaign } from '../types/Campaign';
import { newPrepItem, PrepItem } from '../types/CampaignSession';
import { EncounterSave, isPlayed } from '../types/EncounterSave';
import { CampaignNpc } from '../types/CampaignNpc';
import { CampaignThread, isOpenThread } from '../types/CampaignThread';
import { encounterSavesApi } from '../api/encounter-saves';
import { npcsApi } from '../api/npcs';
import { threadsApi } from '../api/campaign-play';
import ForecastDialog, { ForecastChip } from '../encounters/ForecastDialog';

export const formatDay = (d: string | null | undefined) =>
  d ? new Date(`${d.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) : null;

export const relativeDay = (d: string | null | undefined): string | null => {
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((new Date(`${d.slice(0, 10)}T00:00:00`).getTime() - today.getTime()) / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
};

type Pickables = { encounters: EncounterSave[]; npcs: CampaignNpc[]; threads: CampaignThread[] };

const REF_ICONS = {
  encounter: <SportsMartialArts sx={{ fontSize: 16 }} />,
  npc: <Group sx={{ fontSize: 16 }} />,
  thread: <Flag sx={{ fontSize: 16 }} />,
};

const NextSessionCard: FC<{ campaign: Campaign; canEdit: boolean }> = ({ campaign, canEdit }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { live, upcoming, sessions, savePrep, openDialog, eventsVersion } = useCampaignPlay();
  const campaignId = campaign.id ?? '';
  const session = live ?? upcoming;
  const number = session?.session_number ?? sessions.reduce((acc, s) => Math.max(acc, s.session_number), 0) + 1;
  const prep = session?.prep ?? [];

  const [strongStart, setStrongStart] = useState(session?.strong_start ?? '');
  const [newItem, setNewItem] = useState('');
  const [pickMenu, setPickMenu] = useState<{ kind: keyof typeof REF_ICONS; anchor: HTMLElement } | null>(null);
  const [pickables, setPickables] = useState<Pickables>({ encounters: [], npcs: [], threads: [] });
  const [dayOpen, setDayOpen] = useState(false);

  useEffect(() => setStrongStart(session?.strong_start ?? ''), [session?.id, session?.strong_start]);

  useEffect(() => {
    let alive = true;
    const safe = <T,>(p: Promise<T>, fallback: T) => p.catch(() => fallback);
    Promise.all([
      safe(encounterSavesApi.listForCampaign(campaignId), []),
      safe(npcsApi.list(campaignId), []),
      safe(threadsApi.list(campaignId), []),
    ]).then(([encounters, npcs, threads]) => {
      if (alive) setPickables({ encounters: encounters.filter((e) => !isPlayed(e)), npcs, threads: threads.filter(isOpenThread) });
    });
    return () => {
      alive = false;
    };
  }, [campaignId, eventsVersion]);

  const save = (patch: Parameters<typeof savePrep>[0]) =>
    savePrep(patch).catch((e) => toast(e instanceof Error ? e.message : String(e), 'error'));

  // Built from the latest saved list, so quick edits don't drop each other.
  const setPrep = (update: (items: PrepItem[]) => PrepItem[]) => save((s) => ({ prep: update(s?.prep ?? []) }));
  const toggle = (id: string) => setPrep((items) => items.map((p) => (p.id === id ? { ...p, done: !p.done } : p)));
  const remove = (id: string) => setPrep((items) => items.filter((p) => p.id !== id));
  const addText = () => {
    const text = newItem.trim();
    if (!text) return;
    setNewItem('');
    void setPrep((items) => [...items, newPrepItem(text)]);
  };
  const addRef = (kind: keyof typeof REF_ICONS, id: string, text: string) => {
    setPickMenu(null);
    if (prep.some((p) => p.ref_kind === kind && p.ref_id === id)) return;
    void setPrep((items) => [...items, newPrepItem(text, { ref_kind: kind, ref_id: id })]);
  };

  const openRef = (p: PrepItem) => {
    if (p.ref_kind === 'encounter') navigate(`/campaign?tab=encounters&open=${encodeURIComponent(p.ref_id ?? '')}`);
    if (p.ref_kind === 'npc') navigate(`/campaign?tab=npcs&open=${encodeURIComponent(p.ref_id ?? '')}`);
    if (p.ref_kind === 'thread') navigate('/campaign?tab=threads');
  };

  const encounterById = new Map(pickables.encounters.map((e) => [e.id, e]));
  const pickList =
    pickMenu?.kind === 'encounter'
      ? pickables.encounters.map((e) => ({ id: e.id ?? '', text: e.name, detail: e.difficulty }))
      : pickMenu?.kind === 'npc'
        ? pickables.npcs.map((n) => ({ id: n.id ?? '', text: n.name, detail: n.role }))
        : pickables.threads.map((t) => ({ id: t.id ?? '', text: t.title, detail: t.status }));

  const date = live ? live.played_on : campaign.next_session_on;
  const done = prep.filter((p) => p.done).length;
  // The session's fights, in checklist order, for the adventuring-day view.
  const dayFights = prep
    .map((p) => (p.ref_kind === 'encounter' ? encounterById.get(p.ref_id) : undefined))
    .filter((e): e is EncounterSave => Boolean(e));

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderColor: live ? 'success.main' : 'divider',
        bgcolor: (t) => (live ? alpha(t.palette.success.main, 0.04) : undefined),
      }}
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} sx={{ mb: 1.5 }}>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="overline" color={live ? 'success.main' : 'primary.main'} sx={{ lineHeight: 1.5 }}>
            {live ? 'In progress' : 'Next session'}
          </Typography>
          <Typography variant="h5" noWrap>
            Session {number}
            {date && (
              <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                {formatDay(date)}
                {!live && relativeDay(date) ? ` · ${relativeDay(date)}` : ''}
              </Typography>
            )}
          </Typography>
        </Box>
        {canEdit &&
          (live ? (
            <Button variant="contained" color="success" startIcon={<Stop />} onClick={() => openDialog('end')}>
              End session
            </Button>
          ) : (
            <Button variant="contained" startIcon={<PlayArrow />} onClick={() => openDialog('start')}>
              Start session
            </Button>
          ))}
      </Stack>

      <TextField
        label="Strong start"
        placeholder="The scene that opens the session, already in motion"
        value={strongStart}
        onChange={(e) => setStrongStart(e.target.value)}
        onBlur={() => strongStart !== (session?.strong_start ?? '') && save({ strong_start: strongStart })}
        fullWidth
        size="small"
        multiline
        maxRows={4}
        disabled={!canEdit}
        InputLabelProps={{ shrink: true }}
        sx={{ mb: 1.5 }}
      />

      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
        <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.5 }}>
          Prep
        </Typography>
        {prep.length > 0 && (
          <Typography variant="caption" color="text.secondary">
            {done}/{prep.length} ready
          </Typography>
        )}
        <Box sx={{ flexGrow: 1 }} />
        {dayFights.length > 1 && (
          <Button size="small" startIcon={<Insights fontSize="small" />} onClick={() => setDayOpen(true)}>
            Forecast the day
          </Button>
        )}
      </Stack>
      {prep.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Nothing yet. Add the fights, NPCs, threads and secrets you want ready for the table.
        </Typography>
      )}
      <Stack spacing={0.25}>
        {prep.map((p) => {
          const enc = p.ref_kind === 'encounter' ? encounterById.get(p.ref_id) : undefined;
          return (
            <Stack
              key={p.id}
              direction="row"
              alignItems="center"
              spacing={0.5}
              sx={{ '&:hover .prep-remove': { opacity: 1 }, minHeight: 36 }}
            >
              <Checkbox size="small" checked={p.done} onChange={() => toggle(p.id)} disabled={!canEdit} sx={{ p: 0.5 }} />
              {p.ref_kind && <Box sx={{ color: 'text.secondary', display: 'flex' }}>{REF_ICONS[p.ref_kind]}</Box>}
              <Typography
                variant="body2"
                onClick={p.ref_kind ? () => openRef(p) : undefined}
                sx={{
                  flexGrow: 1,
                  minWidth: 0,
                  textDecoration: p.done ? 'line-through' : undefined,
                  color: p.done ? 'text.secondary' : undefined,
                  cursor: p.ref_kind ? 'pointer' : undefined,
                  '&:hover': p.ref_kind ? { textDecoration: 'underline' } : undefined,
                }}
              >
                {p.text}
              </Typography>
              {enc?.difficulty && <Chip size="small" variant="outlined" label={enc.difficulty} />}
              {enc && <ForecastChip campaignId={campaignId} save={enc} />}
              {canEdit && (
                <Tooltip title="Remove" arrow>
                  <IconButton
                    className="prep-remove"
                    size="small"
                    onClick={() => remove(p.id)}
                    sx={{ opacity: { xs: 1, md: 0 } }}
                    aria-label={`Remove ${p.text}`}
                  >
                    <Close fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          );
        })}
      </Stack>

      {canEdit && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} sx={{ mt: 1 }}>
          <TextField
            size="small"
            placeholder="Add a note, clue or secret…"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e: KeyboardEvent) => e.key === 'Enter' && addText()}
            sx={{ flexGrow: 1 }}
            InputProps={{
              endAdornment: newItem.trim() ? (
                <IconButton size="small" onClick={addText} aria-label="Add prep item">
                  <Add fontSize="small" />
                </IconButton>
              ) : undefined,
            }}
          />
          <Stack direction="row" spacing={0.5}>
            {(['encounter', 'npc', 'thread'] as const).map((kind) => (
              <Button
                key={kind}
                size="small"
                startIcon={REF_ICONS[kind]}
                onClick={(e) => setPickMenu({ kind, anchor: e.currentTarget })}
              >
                {kind === 'npc' ? 'NPC' : kind[0].toUpperCase() + kind.slice(1)}
              </Button>
            ))}
          </Stack>
        </Stack>
      )}
      <Menu open={Boolean(pickMenu)} anchorEl={pickMenu?.anchor} onClose={() => setPickMenu(null)}>
        {pickList.length === 0 && (
          <MenuItem disabled>
            {pickMenu?.kind === 'encounter'
              ? 'No prepared encounters yet'
              : pickMenu?.kind === 'npc'
                ? 'No NPCs in this campaign yet'
                : 'No open threads yet'}
          </MenuItem>
        )}
        {pickList.map((it) => (
          <MenuItem key={it.id} onClick={() => pickMenu && addRef(pickMenu.kind, it.id, it.text)}>
            <ListItemText primary={it.text} secondary={it.detail} />
          </MenuItem>
        ))}
      </Menu>
      <ForecastDialog open={dayOpen} onClose={() => setDayOpen(false)} campaignId={campaignId} saves={dayFights} />
    </Paper>
  );
};

export default NextSessionCard;

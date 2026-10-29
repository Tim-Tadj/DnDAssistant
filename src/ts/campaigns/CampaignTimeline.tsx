// The campaign timeline: everything that happened, newest first, grouped
// by session. Most entries write themselves (fights recorded, level-ups,
// conditions, NPCs met, threads moving); jots are the DM's own lines.
// Filters narrow it to one character, NPC or thread (their history in
// this campaign), a tag, or some text.
//
// Sessions played before the app was used can still be logged by hand.

import React, { FC, ReactNode, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  ListSubheader,
  Menu,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add,
  ContentCopy,
  Delete,
  Edit,
  EditNote,
  Flag,
  Group,
  History,
  Lock,
  MoreVert,
  Person,
  PlayArrow,
  Search,
  SportsMartialArts,
  Stop,
} from '@mui/icons-material';
import { useCampaignContext } from '../shared/CampaignContext';
import { useCampaignPlay } from '../shared/CampaignPlayContext';
import { useToast } from '../shared/ToastProvider';
import { useConfirm } from '../shared/useConfirm';
import FormDialog from '../shared/FormDialog';
import LinkedText from '../shared/LinkedText';
import { eventsApi, threadsApi } from '../api/campaign-play';
import { sessionsApi } from '../api/sessions';
import { encounterSavesApi } from '../api/encounter-saves';
import { npcsApi } from '../api/npcs';
import { CampaignEvent, eventTime, JOT_TAGS, JOT_TAG_LABELS } from '../types/CampaignEvent';
import { CampaignSession, defaultCampaignSession } from '../types/CampaignSession';
import { CampaignThread } from '../types/CampaignThread';
import { CampaignNpc } from '../types/CampaignNpc';
import { EncounterSave, isPlayed } from '../types/EncounterSave';
import { useRoster } from './roster';
import { playerRecap, recapEvents } from './recap';
import { formatDay } from './NextSessionCard';

export const OUTCOME_COLORS: Record<string, 'success' | 'error' | 'warning' | 'info' | 'default'> = {
  Victory: 'success',
  Defeat: 'error',
  Fled: 'warning',
  Negotiated: 'info',
};

const xpOf = (encounters: EncounterSave[]) => encounters.reduce((acc, e) => acc + (e.total_xp || 0), 0);

const timeOf = (e: CampaignEvent) => eventTime(e).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

// When a session began, for placing between-session entries.
const sessionStart = (s: CampaignSession) =>
  s.started_at ? `${s.started_at}` : s.played_on ? `${s.played_on} 00:00:00` : s.created_at ?? '';

const KIND_ICONS: Record<string, ReactNode> = {
  encounter: <SportsMartialArts fontSize="small" />,
  character: <Person fontSize="small" />,
  npc: <Group fontSize="small" />,
  thread: <Flag fontSize="small" />,
  jot: <EditNote fontSize="small" />,
};

// ---- Logging a session by hand ----------------------------------------------

const SessionEditor: FC<{ draft: CampaignSession; onChange: (s: CampaignSession) => void }> = ({ draft: s, onChange }) => {
  const set = <K extends keyof CampaignSession>(k: K, v: CampaignSession[K]) => onChange({ ...s, [k]: v });
  return (
    <Stack spacing={2} sx={{ pt: 0.5 }}>
      <Stack direction="row" spacing={2}>
        <TextField
          label="Session #"
          type="number"
          value={s.session_number}
          onChange={(e) => set('session_number', Math.max(1, Number(e.target.value) || 1))}
          sx={{ width: 120 }}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Played on"
          type="date"
          value={s.played_on ?? ''}
          onChange={(e) => set('played_on', e.target.value || null)}
          sx={{ width: 200 }}
          InputLabelProps={{ shrink: true }}
        />
        <TextField label="Title" value={s.title} onChange={(e) => set('title', e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
      </Stack>
      <TextField
        label="Attendees"
        value={s.attendees.join(', ')}
        onChange={(e) =>
          set(
            'attendees',
            e.target.value
              .split(',')
              .map((x) => x.trim())
              .filter(Boolean),
          )
        }
        helperText="Comma-separated"
        fullWidth
        InputLabelProps={{ shrink: true }}
      />
      <TextField
        label="Recap"
        value={s.summary}
        onChange={(e) => set('summary', e.target.value)}
        fullWidth
        multiline
        minRows={5}
        placeholder="What happened in this session?"
        InputLabelProps={{ shrink: true }}
      />
      {s.prep_notes && (
        <TextField
          label="Old prep notes"
          value={s.prep_notes}
          onChange={(e) => set('prep_notes', e.target.value)}
          fullWidth
          multiline
          minRows={3}
          helperText="From before prep checklists. New prep goes on the Next Session card."
          InputLabelProps={{ shrink: true }}
        />
      )}
    </Stack>
  );
};

// ---- One line of the timeline -----------------------------------------------

const EventRow: FC<{
  event: CampaignEvent;
  campaignId: string;
  canEdit: boolean;
  onEdit: (e: CampaignEvent) => void;
  onDelete: (e: CampaignEvent) => void;
}> = ({ event: e, campaignId, canEdit, onEdit, onDelete }) => {
  if (e.kind === 'session') {
    const started = /started/i.test(e.text);
    return (
      <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'text.disabled', py: 0.25, pl: 0.25 }}>
        {started ? <PlayArrow sx={{ fontSize: 16 }} /> : <Stop sx={{ fontSize: 16 }} />}
        <Typography variant="caption">
          {e.text} · {timeOf(e)}
        </Typography>
      </Stack>
    );
  }
  const downed = Array.isArray(e.data?.downed) ? (e.data.downed as string[]) : [];
  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="flex-start"
      sx={{ py: 0.5, '&:hover .event-actions': { opacity: 1 } }}
    >
      <Box sx={{ color: e.kind === 'jot' ? 'primary.main' : 'text.secondary', display: 'flex', pt: 0.25 }}>
        {KIND_ICONS[e.kind] ?? <History fontSize="small" />}
      </Box>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Box sx={{ typography: 'body2' }}>
          <LinkedText text={e.text} campaignId={campaignId} />
        </Box>
        {(e.tag || e.dm_only || downed.length > 0) && (
          <Stack direction="row" spacing={0.5} sx={{ mt: 0.25 }} flexWrap="wrap" useFlexGap>
            {e.tag && <Chip size="small" label={JOT_TAG_LABELS[e.tag] ?? e.tag} variant="outlined" />}
            {e.dm_only && <Chip size="small" icon={<Lock sx={{ fontSize: 14 }} />} label="DM only" variant="outlined" />}
            {downed.length > 0 && <Chip size="small" color="warning" variant="outlined" label={`Dropped: ${downed.join(', ')}`} />}
          </Stack>
        )}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', pt: 0.25 }}>
        {timeOf(e)}
      </Typography>
      {canEdit && e.kind === 'jot' && (
        <Stack direction="row" className="event-actions" sx={{ opacity: { xs: 1, md: 0 }, mt: -0.5 }}>
          <IconButton size="small" onClick={() => onEdit(e)} aria-label="Edit jot">
            <Edit sx={{ fontSize: 16 }} />
          </IconButton>
          <IconButton size="small" onClick={() => onDelete(e)} aria-label="Delete jot">
            <Delete sx={{ fontSize: 16 }} />
          </IconButton>
        </Stack>
      )}
    </Stack>
  );
};

// ---- The timeline -----------------------------------------------------------

type Group =
  | { type: 'session'; session: CampaignSession; events: CampaignEvent[] }
  | { type: 'between'; key: string; label: string; events: CampaignEvent[] };

const CampaignTimeline: FC<{ campaignId: string; canEdit: boolean }> = ({ campaignId, canEdit }) => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { toast } = useToast();
  const { confirm, dialog } = useConfirm();
  const { activeCampaign } = useCampaignContext();
  const { sessions, reload: reloadSessions, eventsVersion, bumpEvents, openDialog } = useCampaignPlay();
  const roster = useRoster(campaignId);

  const [events, setEvents] = useState<CampaignEvent[] | null>(null);
  const [encounters, setEncounters] = useState<EncounterSave[]>([]);
  const [npcs, setNpcs] = useState<CampaignNpc[]>([]);
  const [threads, setThreads] = useState<CampaignThread[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('');
  const [editingSession, setEditingSession] = useState<CampaignSession | null>(null);
  const [sessionDraft, setSessionDraft] = useState<CampaignSession | null>(null);
  const [editingJot, setEditingJot] = useState<CampaignEvent | null>(null);
  const [jotText, setJotText] = useState('');
  const [sessionMenu, setSessionMenu] = useState<{ anchor: HTMLElement; session: CampaignSession } | null>(null);

  // "?ref=character:<id>" narrows to one thing's history.
  const ref = params.get('ref') ?? '';
  const setRef = (v: string) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (v) next.set('ref', v);
      else next.delete('ref');
      return next;
    });

  useEffect(() => {
    let alive = true;
    eventsApi
      .list(campaignId)
      .then((list) => {
        if (!alive) return;
        setEvents(list);
        setError(null);
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      alive = false;
    };
  }, [campaignId, eventsVersion]);

  useEffect(() => {
    const safe = <T,>(p: Promise<T>, fallback: T) => p.catch(() => fallback);
    void Promise.all([
      safe(encounterSavesApi.listForCampaign(campaignId), []),
      safe(npcsApi.list(campaignId), []),
      safe(threadsApi.list(campaignId), []),
    ]).then(([e, n, t]) => {
      setEncounters(e);
      setNpcs(n);
      setThreads(t);
    });
  }, [campaignId, eventsVersion]);

  const encountersBySession = useMemo(() => {
    const m = new Map<string, EncounterSave[]>();
    for (const e of encounters) {
      if (!isPlayed(e) || !e.session_id) continue;
      m.set(e.session_id, [...(m.get(e.session_id) ?? []), e]);
    }
    return m;
  }, [encounters]);

  // What the ref filter points at, and the words that mention it.
  const refTarget = useMemo(() => {
    const [kind, id] = ref.split(':');
    if (!kind || !id) return null;
    const name =
      kind === 'character'
        ? roster?.find((r) => r.character.id === id)?.character.name
        : kind === 'npc'
          ? npcs.find((n) => n.id === id)?.name
          : kind === 'thread'
            ? threads.find((t) => t.id === id)?.title
            : undefined;
    return { kind, id, name };
  }, [ref, roster, npcs, threads]);

  const matches = (e: CampaignEvent) => {
    if (tag && e.tag !== tag) return false;
    if (query && !e.text.toLowerCase().includes(query.toLowerCase())) return false;
    if (refTarget) {
      if (e.ref_kind === refTarget.kind && e.ref_id === refTarget.id) return true;
      const name = refTarget.name?.toLowerCase();
      if (!name) return false;
      const downed = Array.isArray(e.data?.downed) ? (e.data.downed as string[]) : [];
      return e.text.toLowerCase().includes(name) || downed.some((d) => d.toLowerCase() === name);
    }
    return true;
  };
  const filtering = Boolean(tag || query || refTarget);

  // Sessions newest first; entries between sessions sit above the session they followed.
  const groups = useMemo<Group[]>(() => {
    if (!events) return [];
    const shown = sessions.filter((s) => s.status !== 'planned');
    const byStart = [...shown].sort((a, b) => sessionStart(a).localeCompare(sessionStart(b)));
    const bySession = new Map<string, CampaignEvent[]>();
    const between = new Map<string, CampaignEvent[]>(); // key: id of the session before, or ''
    for (const e of events) {
      if (filtering && !matches(e)) continue;
      if (e.session_id && shown.some((s) => s.id === e.session_id)) {
        bySession.set(e.session_id, [...(bySession.get(e.session_id) ?? []), e]);
      } else {
        const before = [...byStart].reverse().find((s) => sessionStart(s) <= e.created_at);
        const key = before?.id ?? '';
        between.set(key, [...(between.get(key) ?? []), e]);
      }
    }
    const out: Group[] = [];
    const pushBetween = (key: string, label: string) => {
      const list = between.get(key);
      if (list?.length) out.push({ type: 'between', key, label, events: list });
    };
    const newestFirst = [...byStart].reverse();
    newestFirst.forEach((s, i) => {
      pushBetween(s.id ?? '', i === 0 ? 'Since the last session' : 'Between sessions');
      const list = bySession.get(s.id ?? '') ?? [];
      const q = query.toLowerCase();
      const summaryHit = !refTarget && !tag && q && `${s.title} ${s.summary}`.toLowerCase().includes(q);
      if (!filtering || list.length || summaryHit) out.push({ type: 'session', session: s, events: list });
    });
    pushBetween('', newestFirst.length ? 'Before the first session' : 'Notes');
    return out;
  }, [events, sessions, filtering, tag, query, refTarget]);

  const nextNumber = sessions.reduce((acc, s) => Math.max(acc, s.session_number), 0) + 1;

  const logPast = () => {
    setEditingSession({ ...defaultCampaignSession });
    setSessionDraft({ ...defaultCampaignSession, session_number: nextNumber, status: 'played' });
  };
  const editSession = (s: CampaignSession) => {
    setEditingSession(s);
    setSessionDraft({ ...s });
  };

  const onSaveSession = async () => {
    if (!sessionDraft) return;
    if (editingSession?.id) await sessionsApi.update(campaignId, editingSession.id, sessionDraft);
    else await sessionsApi.create(campaignId, { ...sessionDraft, status: 'played' });
    toast(editingSession?.id ? 'Session updated' : 'Session logged', 'success');
    await reloadSessions();
  };

  const onDeleteSession = async (s: CampaignSession) => {
    if (!s.id) return;
    const ok = await confirm({
      title: 'Delete session?',
      body: `Delete session ${s.session_number}${s.title ? ` (${s.title})` : ''}? Its timeline entries move to "between sessions"; recorded fights stay in Encounters.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await sessionsApi.remove(campaignId, s.id);
      toast('Session deleted', 'success');
      await reloadSessions();
      bumpEvents();
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    }
  };

  const copyRecap = async (s: CampaignSession) => {
    const list = (events ?? []).filter((e) => e.session_id === s.id);
    const text = playerRecap(s, list, activeCampaign?.name);
    try {
      await navigator.clipboard.writeText(text);
      toast('Recap copied. DM-only jots were left out.', 'success');
    } catch {
      toast('Could not reach the clipboard', 'error');
    }
  };

  const onSaveJot = async () => {
    if (!editingJot) return;
    if (!jotText.trim()) throw new Error('Write something, or delete the jot');
    await eventsApi.update(campaignId, editingJot.id, { text: jotText.trim() });
    bumpEvents();
  };
  const onDeleteJot = async (e: CampaignEvent) => {
    const ok = await confirm({ title: 'Delete jot?', body: e.text, confirmLabel: 'Delete', destructive: true });
    if (!ok) return;
    await eventsApi.remove(campaignId, e.id);
    bumpEvents();
  };

  const eventList = (list: CampaignEvent[]) => (
    <Box>
      {list.map((e) => (
        <EventRow
          key={e.id}
          event={e}
          campaignId={campaignId}
          canEdit={canEdit}
          onEdit={(ev) => {
            setEditingJot(ev);
            setJotText(ev.text);
          }}
          onDelete={onDeleteJot}
        />
      ))}
    </Box>
  );

  return (
    <Box>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }} sx={{ mb: 1.5 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexGrow: 1 }}>
          <History fontSize="small" sx={{ color: 'primary.main' }} />
          <Typography variant="h5">Sessions & timeline</Typography>
        </Stack>
        {canEdit && (
          <Stack direction="row" spacing={1}>
            <Button size="small" onClick={logPast}>
              Log a past session
            </Button>
            <Button size="small" variant="outlined" startIcon={<Add />} onClick={() => openDialog('jot')}>
              Jot
            </Button>
          </Stack>
        )}
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 1 }}>
        <TextField
          size="small"
          placeholder="Search the timeline"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ flexGrow: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          select
          size="small"
          label="About"
          value={refTarget ? ref : ''}
          onChange={(e) => setRef(e.target.value)}
          sx={{ minWidth: 220 }}
          InputLabelProps={{ shrink: true }}
          SelectProps={{ displayEmpty: true }}
        >
          <MenuItem value="">Everything</MenuItem>
          {roster && roster.length > 0 && <ListSubheader>Characters</ListSubheader>}
          {roster?.map((r) => (
            <MenuItem key={r.character.id} value={`character:${r.character.id}`}>
              {r.character.name}
            </MenuItem>
          ))}
          {npcs.length > 0 && <ListSubheader>NPCs</ListSubheader>}
          {npcs.map((n) => (
            <MenuItem key={n.id} value={`npc:${n.id}`}>
              {n.name}
            </MenuItem>
          ))}
          {threads.length > 0 && <ListSubheader>Threads</ListSubheader>}
          {threads.map((t) => (
            <MenuItem key={t.id} value={`thread:${t.id}`}>
              {t.title}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        {JOT_TAGS.map((t) => (
          <Chip
            key={t}
            size="small"
            label={JOT_TAG_LABELS[t]}
            color={tag === t ? 'primary' : 'default'}
            variant={tag === t ? 'filled' : 'outlined'}
            onClick={() => setTag(tag === t ? '' : t)}
          />
        ))}
        {filtering && (
          <Button
            size="small"
            color="inherit"
            onClick={() => {
              setTag('');
              setQuery('');
              setRef('');
            }}
          >
            Clear filters
          </Button>
        )}
      </Stack>

      {refTarget?.kind === 'character' && refTarget.name && events && (
        <CharacterSummary
          name={refTarget.name}
          sessions={sessions}
          events={events.filter(matches)}
          encounters={encounters.filter((e) => isPlayed(e) && e.combatants?.some((c) => c.isPC && c.name === refTarget.name))}
        />
      )}

      {error && <Alert severity="error">{error}</Alert>}
      {events && groups.length === 0 && (
        <Alert severity="info">
          {filtering
            ? 'Nothing matches these filters.'
            : 'Nothing here yet. Start a session from the Overview and the timeline fills itself as you play: fights, level-ups, NPCs met, threads advanced, and anything you jot.'}
        </Alert>
      )}

      <Stack spacing={1.5}>
        {groups.map((g) =>
          g.type === 'between' ? (
            <Box key={`between-${g.key}`} sx={{ px: 2, py: 1, borderLeft: 3, borderColor: 'divider' }}>
              <Typography variant="overline" color="text.secondary">
                {g.label}
              </Typography>
              {eventList(g.events)}
            </Box>
          ) : (
            <Paper
              key={g.session.id}
              variant="outlined"
              sx={{ p: 2, borderColor: g.session.status === 'live' ? 'success.main' : undefined }}
            >
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Chip
                      label={`#${g.session.session_number}`}
                      size="small"
                      color={g.session.status === 'live' ? 'success' : 'primary'}
                      sx={{ fontFamily: '"JetBrains Mono", monospace' }}
                    />
                    <Typography variant="h6">{g.session.title || `Session ${g.session.session_number}`}</Typography>
                    {g.session.status === 'live' && <Chip size="small" color="success" variant="outlined" label="In progress" />}
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {[formatDay(g.session.played_on), g.session.attendees.join(', ')].filter(Boolean).join(' · ')}
                  </Typography>
                </Box>
                {g.session.status !== 'live' && (
                  <Tooltip title="Copy a recap for your players" arrow>
                    <IconButton size="small" onClick={() => copyRecap(g.session)} aria-label="Copy recap">
                      <ContentCopy fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {canEdit && (
                  <IconButton
                    size="small"
                    onClick={(e) => setSessionMenu({ anchor: e.currentTarget, session: g.session })}
                    aria-label="Session actions"
                  >
                    <MoreVert fontSize="small" />
                  </IconButton>
                )}
              </Stack>
              {g.session.summary && !filtering && (
                <Box sx={{ mt: 1, typography: 'body2', whiteSpace: 'pre-line' }}>
                  <LinkedText text={g.session.summary} campaignId={campaignId} />
                </Box>
              )}
              {g.session.prep_notes && !filtering && (
                <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1, whiteSpace: 'pre-line' }}>
                  Prep notes: {g.session.prep_notes}
                </Typography>
              )}
              {!filtering && (encountersBySession.get(g.session.id ?? '') ?? []).length > 0 && (
                <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                  {(encountersBySession.get(g.session.id ?? '') ?? []).map((e) => (
                    <Chip
                      key={e.id}
                      size="small"
                      variant="outlined"
                      icon={<SportsMartialArts sx={{ fontSize: 16 }} />}
                      color={e.outcome ? OUTCOME_COLORS[e.outcome] ?? 'default' : 'default'}
                      label={e.outcome ? `${e.name} · ${e.outcome}` : e.name}
                      onClick={() => navigate(`/campaign?tab=encounters&open=${encodeURIComponent(e.id ?? '')}`)}
                    />
                  ))}
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '"JetBrains Mono", monospace' }}>
                    {xpOf(encountersBySession.get(g.session.id ?? '') ?? []).toLocaleString()} XP
                  </Typography>
                </Stack>
              )}
              {g.events.length > 0 && <Box sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: 'divider' }}>{eventList(g.events)}</Box>}
            </Paper>
          ),
        )}
      </Stack>

      <Menu open={Boolean(sessionMenu)} anchorEl={sessionMenu?.anchor} onClose={() => setSessionMenu(null)}>
        <MenuItem
          onClick={() => {
            if (sessionMenu) editSession(sessionMenu.session);
            setSessionMenu(null);
          }}
        >
          <Edit fontSize="small" sx={{ mr: 1 }} /> Edit
        </MenuItem>
        {sessionMenu?.session.status !== 'live' && (
          <MenuItem
            onClick={() => {
              if (sessionMenu) void copyRecap(sessionMenu.session);
              setSessionMenu(null);
            }}
          >
            <ContentCopy fontSize="small" sx={{ mr: 1 }} /> Copy recap
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            if (sessionMenu) void onDeleteSession(sessionMenu.session);
            setSessionMenu(null);
          }}
          sx={{ color: 'error.main' }}
        >
          <Delete fontSize="small" sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>

      <FormDialog
        open={editingSession !== null}
        title={editingSession?.id ? `Edit session ${editingSession.session_number}` : 'Log a past session'}
        subtitle={editingSession?.id ? undefined : 'For sessions played before you used the app. New ones: Start session on the Overview.'}
        onClose={() => setEditingSession(null)}
        onSave={onSaveSession}
      >
        {sessionDraft && <SessionEditor draft={sessionDraft} onChange={setSessionDraft} />}
      </FormDialog>

      <FormDialog open={editingJot !== null} title="Edit jot" onClose={() => setEditingJot(null)} onSave={onSaveJot} maxWidth="sm">
        <TextField value={jotText} onChange={(e) => setJotText(e.target.value)} fullWidth multiline autoFocus sx={{ mt: 0.5 }} />
      </FormDialog>
      {dialog}
    </Box>
  );
};

// A character's story in this campaign, above their filtered timeline.
const CharacterSummary: FC<{
  name: string;
  sessions: CampaignSession[];
  events: CampaignEvent[];
  encounters: EncounterSave[];
}> = ({ name, sessions, events, encounters }) => {
  const attended = sessions.filter((s) => s.status !== 'planned' && s.attendees.includes(name)).length;
  const dropped = encounters.filter((e) => e.combatants?.some((c) => c.isPC && c.name === name && c.hp <= 0)).length;
  const loot = recapEvents(events, true).filter((e) => e.tag === 'loot').length;
  const stat = (label: string, value: number) => (
    <Box sx={{ minWidth: 90 }}>
      <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.5 }}>
        {label}
      </Typography>
      <Typography variant="h5" sx={{ fontFamily: '"JetBrains Mono", monospace' }}>
        {value}
      </Typography>
    </Box>
  );
  return (
    <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
        {name} in this campaign
      </Typography>
      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
        {stat('Sessions', attended)}
        {stat('Fights', encounters.length)}
        {stat('Dropped to 0', dropped)}
        {stat('Loot jots', loot)}
      </Stack>
    </Paper>
  );
};

export default CampaignTimeline;

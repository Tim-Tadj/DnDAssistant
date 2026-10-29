// Running a session at the table: the Start / End dialogs, the Jot
// dialog, and the slim bar that shows across the app while a session is
// live. Mounted once in AppLayout; anything can open the dialogs through
// useCampaignPlay().openDialog.

import React, { FC, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material';
import { EditNote, FiberManualRecord, Stop } from '@mui/icons-material';
import { useCampaignContext } from '../shared/CampaignContext';
import { useCampaignPlay } from '../shared/CampaignPlayContext';
import { useToast } from '../shared/ToastProvider';
import FormDialog, { errorMessage } from '../shared/FormDialog';
import { eventsApi } from '../api/campaign-play';
import { CampaignEvent, eventTime, JOT_TAGS, JOT_TAG_LABELS } from '../types/CampaignEvent';
import { todayIso } from '../types/CampaignSession';
import { useRoster } from './roster';
import { draftSummary, recapEvents, recapLine } from './recap';

const CADENCE_DAYS: Record<string, number> = { weekly: 7, biweekly: 14, monthly: 28 };

const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const elapsed = (startedAt?: string) => {
  if (!startedAt) return '';
  const mins = Math.max(0, Math.floor((Date.now() - eventTime({ created_at: startedAt }).getTime()) / 60000));
  return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`;
};

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));

const StartSessionDialog: FC = () => {
  const { activeCampaign } = useCampaignContext();
  const { dialog, openDialog, upcoming, sessions, startSession } = useCampaignPlay();
  const open = dialog === 'start';
  const roster = useRoster(open ? activeCampaign?.id ?? null : null);
  const [present, setPresent] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (roster) setPresent(new Set(roster.map((r) => r.character.name)));
  }, [roster]);

  const number = upcoming?.session_number ?? sessions.reduce((acc, s) => Math.max(acc, s.session_number), 0) + 1;
  const toggle = (name: string) =>
    setPresent((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  return (
    <FormDialog
      open={open}
      title={`Start session ${number}`}
      subtitle={`${activeCampaign?.name ?? ''} · ${new Date().toLocaleDateString()}`}
      onClose={() => openDialog(null)}
      onSave={() => startSession(Array.from(present))}
      saveLabel="Start session"
      maxWidth="sm"
    >
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">
          While the session is live, fights you record, level-ups, conditions, NPCs you meet and your jots are all
          stamped with it. You&apos;ll get a recap drafted from them when you end it.
        </Typography>
        <Box>
          <Typography variant="overline" color="text.secondary">
            At the table
          </Typography>
          {roster === null ? (
            <Typography variant="body2" color="text.secondary">
              Loading the party…
            </Typography>
          ) : roster.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No characters in this campaign yet. You can still start the session.
            </Typography>
          ) : (
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              {roster.map((r) => (
                <Chip
                  key={r.character.id}
                  label={r.character.name}
                  color={present.has(r.character.name) ? 'primary' : 'default'}
                  variant={present.has(r.character.name) ? 'filled' : 'outlined'}
                  onClick={() => toggle(r.character.name)}
                />
              ))}
            </Stack>
          )}
        </Box>
      </Stack>
    </FormDialog>
  );
};

const EndSessionDialog: FC = () => {
  const { activeCampaign } = useCampaignContext();
  const { dialog, openDialog, live, endSession } = useCampaignPlay();
  const { toast } = useToast();
  const open = dialog === 'end';
  const [events, setEvents] = useState<CampaignEvent[] | null>(null);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [nextOn, setNextOn] = useState('');

  useEffect(() => {
    if (!open || !live?.id || !activeCampaign?.id) return;
    setEvents(null);
    setTitle(live.title);
    const cadence = CADENCE_DAYS[activeCampaign.cadence ?? ''];
    const scheduled = activeCampaign.next_session_on?.slice(0, 10) ?? '';
    setNextOn(scheduled > todayIso() ? scheduled : cadence ? addDays(todayIso(), cadence) : '');
    eventsApi
      .list(activeCampaign.id, { session: live.id })
      .then((list) => {
        setEvents(list);
        setSummary(live.summary.trim() || draftSummary(list));
      })
      .catch(() => {
        setEvents([]);
        setSummary(live.summary);
      });
  }, [open, live?.id]);

  const leftover = (live?.prep ?? []).filter((p) => !p.done);
  const happened = useMemo(() => recapEvents(events ?? [], true), [events]);

  const onSave = async () => {
    const { rolled_over, next } = await endSession({ title: title.trim(), summary, next_session_on: nextOn || null });
    toast(
      rolled_over
        ? `Session saved. ${rolled_over} prep item${rolled_over === 1 ? '' : 's'} moved to session ${next.session_number}.`
        : 'Session saved',
      'success',
    );
  };

  if (!live) return null;
  return (
    <FormDialog
      open={open}
      title={`End session ${live.session_number}`}
      subtitle={`Started ${elapsed(live.started_at)} ago · ${happened.length} thing${happened.length === 1 ? '' : 's'} on the timeline`}
      onClose={() => openDialog(null)}
      onSave={onSave}
      saveLabel="End session"
    >
      <Stack spacing={2}>
        <TextField
          label="Title"
          placeholder="e.g. The bell tower falls"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          fullWidth
          autoFocus
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Recap"
          value={events === null ? 'Drafting from the timeline…' : summary}
          onChange={(e) => setSummary(e.target.value)}
          disabled={events === null}
          fullWidth
          multiline
          minRows={6}
          maxRows={16}
          helperText="Drafted from what happened this session. DM-only jots are left out. Edit freely."
          InputLabelProps={{ shrink: true }}
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
          <TextField
            label="Next session"
            type="date"
            value={nextOn}
            onChange={(e) => setNextOn(e.target.value)}
            sx={{ width: 200 }}
            InputLabelProps={{ shrink: true }}
          />
          <Typography variant="body2" color="text.secondary">
            {leftover.length
              ? `${leftover.length} unticked prep item${leftover.length === 1 ? '' : 's'} will move to session ${live.session_number + 1}.`
              : 'All prep was used.'}
          </Typography>
        </Stack>
      </Stack>
    </FormDialog>
  );
};

const JotDialog: FC = () => {
  const { dialog, openDialog, live, addJot } = useCampaignPlay();
  const open = dialog === 'jot';
  const [text, setText] = useState('');
  const [tag, setTag] = useState('');
  const [dmOnly, setDmOnly] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setText('');
    setTag('');
    setDmOnly(false);
    setError(null);
  }, [open]);

  const save = async () => {
    if (!text.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await addJot({ text: text.trim(), tag, dm_only: dmOnly });
      openDialog(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !saving && openDialog(null)} fullWidth maxWidth="sm">
      <DialogTitle>
        Jot
        <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
          {live ? `Session ${live.session_number}` : 'Between sessions'}
        </Typography>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <TextField
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void save();
            }
          }}
          placeholder="What just happened? Link with [[npc:Captain Yara]]"
          fullWidth
          multiline
          maxRows={4}
          autoFocus
          sx={{ mt: 0.5 }}
        />
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center" sx={{ mt: 1.5 }}>
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
          <Box sx={{ flexGrow: 1 }} />
          <Tooltip title="Kept on your timeline, left out of recaps you share" arrow>
            <FormControlLabel
              control={<Switch size="small" checked={dmOnly} onChange={(e) => setDmOnly(e.target.checked)} />}
              label={<Typography variant="body2">DM only</Typography>}
              sx={{ mr: 0 }}
            />
          </Tooltip>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1, pl: 2 }}>
          Enter saves · Shift+Enter for a new line
        </Typography>
        <Button onClick={() => openDialog(null)} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={save} disabled={saving || !text.trim()}>
          {saving ? 'Saving…' : 'Jot it'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// The bar under the app header while a session is live.
export const LiveSessionBar: FC = () => {
  const navigate = useNavigate();
  const { activeCampaign } = useCampaignContext();
  const { live, openDialog, eventsVersion, campaignId } = useCampaignPlay();
  const [, tick] = useState(0);
  const [latest, setLatest] = useState<CampaignEvent | null>(null);

  // Keep the elapsed time fresh.
  useEffect(() => {
    if (!live) return;
    const t = window.setInterval(() => tick((n) => n + 1), 30000);
    return () => window.clearInterval(t);
  }, [live]);

  useEffect(() => {
    if (!live?.id || !campaignId) {
      setLatest(null);
      return;
    }
    eventsApi
      .list(campaignId, { session: live.id })
      .then((list) => setLatest(list.find((e) => e.kind !== 'session') ?? null))
      .catch(() => undefined);
  }, [live?.id, campaignId, eventsVersion]);

  if (!live) return null;
  return (
    <Box
      sx={{
        px: 2,
        py: 0.5,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        borderTop: 1,
        borderColor: 'divider',
        bgcolor: (t) => alpha(t.palette.success.main, 0.1),
      }}
    >
      <FiberManualRecord color="success" sx={{ fontSize: 12, animation: 'pulse 2s infinite', '@keyframes pulse': { '50%': { opacity: 0.3 } } }} />
      <Typography
        variant="body2"
        sx={{ fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
        onClick={() => navigate('/campaign')}
      >
        Session {live.session_number} · {elapsed(live.started_at)}
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        noWrap
        sx={{ flexGrow: 1, minWidth: 0, display: { xs: 'none', sm: 'block' } }}
      >
        {activeCampaign?.name}
        {latest ? ` · ${recapLine(latest)}` : ''}
      </Typography>
      <Box sx={{ flexGrow: 1, display: { xs: 'block', sm: 'none' } }} />
      <Tooltip title="Jot something down (N)" arrow>
        <Button size="small" startIcon={<EditNote />} onClick={() => openDialog('jot')}>
          Jot
        </Button>
      </Tooltip>
      <Button size="small" color="success" variant="outlined" startIcon={<Stop />} onClick={() => openDialog('end')}>
        End
      </Button>
    </Box>
  );
};

// The dialogs, plus N to jot while a session is live.
export const SessionPlayDialogs: FC = () => {
  const { live, dialog, openDialog } = useCampaignPlay();

  useEffect(() => {
    if (!live) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'n' || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
      if (dialog || document.querySelector('.MuiDialog-root')) return;
      e.preventDefault();
      openDialog('jot');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [live, dialog, openDialog]);

  return (
    <>
      <StartSessionDialog />
      <EndSessionDialog />
      <JotDialog />
    </>
  );
};

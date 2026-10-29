// Quests, rumours and mysteries. A short list grouped by status, each
// with the next step the party is chasing. "Advanced" during a live
// session writes the step to the timeline, so a thread's history is
// just the timeline filtered to it.

import React, { FC, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Add, CheckCircle, Edit, Flag, History, MoreVert, TrendingFlat } from '@mui/icons-material';
import { threadsApi } from '../api/campaign-play';
import { CampaignThread, defaultThread, isOpenThread, THREAD_STATUSES, THREAD_STATUS_LABELS, ThreadStatus } from '../types/CampaignThread';
import { useCampaignPlay } from '../shared/CampaignPlayContext';
import { useToast } from '../shared/ToastProvider';
import { useConfirm } from '../shared/useConfirm';
import FormDialog from '../shared/FormDialog';
import LinkedText from '../shared/LinkedText';
import { useOpenParam } from '../shared/useOpenParam';

const STATUS_COLORS: Record<ThreadStatus, 'primary' | 'default' | 'success' | 'error'> = {
  active: 'primary',
  rumour: 'default',
  resolved: 'success',
  failed: 'error',
};

export function useThreads(campaignId: string) {
  const { eventsVersion } = useCampaignPlay();
  const [threads, setThreads] = useState<CampaignThread[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = () =>
    threadsApi
      .list(campaignId)
      .then((t) => {
        setThreads(t);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  useEffect(() => {
    void reload();
  }, [campaignId, eventsVersion]);
  return { threads, error, reload };
}

const ThreadEditor: FC<{ draft: CampaignThread; onChange: (t: CampaignThread) => void }> = ({ draft, onChange }) => (
  <Stack spacing={2} sx={{ pt: 0.5 }}>
    <TextField
      label="Title"
      value={draft.title}
      onChange={(e) => onChange({ ...draft, title: e.target.value })}
      placeholder="Who rang the bell?"
      fullWidth
      autoFocus
      InputLabelProps={{ shrink: true }}
    />
    <TextField
      select
      label="Status"
      value={draft.status}
      onChange={(e) => onChange({ ...draft, status: e.target.value as ThreadStatus })}
      sx={{ width: 200 }}
      InputLabelProps={{ shrink: true }}
    >
      {THREAD_STATUSES.map((s) => (
        <MenuItem key={s} value={s}>
          {THREAD_STATUS_LABELS[s]}
        </MenuItem>
      ))}
    </TextField>
    <TextField
      label="Next step"
      value={draft.next_step}
      onChange={(e) => onChange({ ...draft, next_step: e.target.value })}
      placeholder="What the party is about to do, or could do, about it"
      fullWidth
      InputLabelProps={{ shrink: true }}
    />
    <TextField
      label="Notes"
      value={draft.notes}
      onChange={(e) => onChange({ ...draft, notes: e.target.value })}
      placeholder="Who's involved, what's really going on. Link with [[npc:Sister Maren]]"
      fullWidth
      multiline
      minRows={3}
      InputLabelProps={{ shrink: true }}
    />
  </Stack>
);

// One thread as a row: title, status, next step, and quick actions.
export const ThreadRow: FC<{
  thread: CampaignThread;
  campaignId: string;
  canEdit: boolean;
  compact?: boolean;
  onEdit?: (t: CampaignThread) => void;
  onChanged: () => void;
}> = ({ thread, campaignId, canEdit, compact, onEdit, onChanged }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { live, bumpEvents } = useCampaignPlay();
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [nextStep, setNextStep] = useState('');

  const update = async (patch: Partial<CampaignThread> & { advance?: boolean }) => {
    if (!thread.id) return;
    try {
      await threadsApi.update(campaignId, thread.id, patch);
      bumpEvents();
      onChanged();
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    }
  };

  const advance = async () => {
    await update({ advance: true, next_step: nextStep.trim() });
    setAdvancing(false);
    setNextStep('');
    toast(live ? 'Logged on the timeline' : 'Thread updated', 'success');
  };

  return (
    <Box sx={{ py: compact ? 0.75 : 1.25, '&:not(:last-of-type)': { borderBottom: 1, borderColor: 'divider' } }}>
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <Flag sx={{ fontSize: 18, mt: 0.25, color: `${STATUS_COLORS[thread.status] === 'default' ? 'text.secondary' : `${STATUS_COLORS[thread.status]}.main`}` }} />
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {thread.title}
            </Typography>
            {(!compact || thread.status === 'rumour') && (
              <Chip size="small" label={THREAD_STATUS_LABELS[thread.status]} color={STATUS_COLORS[thread.status]} variant="outlined" />
            )}
          </Stack>
          {thread.next_step && (
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: 'text.secondary' }}>
              <TrendingFlat sx={{ fontSize: 16 }} />
              <Typography variant="body2">{thread.next_step}</Typography>
            </Stack>
          )}
          {!compact && thread.notes && (
            <Box sx={{ mt: 0.5, color: 'text.secondary', typography: 'body2' }}>
              <LinkedText text={thread.notes} campaignId={campaignId} />
            </Box>
          )}
          {advancing && (
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <TextField
                size="small"
                autoFocus
                fullWidth
                label="New next step"
                placeholder="Leave blank if there isn't one yet"
                value={nextStep}
                onChange={(e) => setNextStep(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && advance()}
                InputLabelProps={{ shrink: true }}
              />
              <Button size="small" variant="contained" onClick={advance}>
                Save
              </Button>
              <Button size="small" color="inherit" onClick={() => setAdvancing(false)}>
                Cancel
              </Button>
            </Stack>
          )}
        </Box>
        {canEdit && isOpenThread(thread) && !advancing && (
          <Tooltip title={live ? 'The party moved this forward (logged on the timeline)' : 'Record progress and set the next step'} arrow>
            <Button size="small" startIcon={<TrendingFlat />} onClick={() => setAdvancing(true)}>
              Advanced
            </Button>
          </Tooltip>
        )}
        {canEdit && (
          <>
            <IconButton size="small" onClick={(e) => setMenu(e.currentTarget)} aria-label={`More for ${thread.title}`}>
              <MoreVert fontSize="small" />
            </IconButton>
            <Menu open={Boolean(menu)} anchorEl={menu} onClose={() => setMenu(null)}>
              {thread.status !== 'resolved' && (
                <MenuItem
                  onClick={() => {
                    setMenu(null);
                    void update({ status: 'resolved' });
                  }}
                >
                  <CheckCircle fontSize="small" sx={{ mr: 1 }} /> Resolved
                </MenuItem>
              )}
              {THREAD_STATUSES.filter((s) => s !== thread.status && s !== 'resolved').map((s) => (
                <MenuItem
                  key={s}
                  onClick={() => {
                    setMenu(null);
                    void update({ status: s });
                  }}
                >
                  Mark {THREAD_STATUS_LABELS[s].toLowerCase()}
                </MenuItem>
              ))}
              <MenuItem
                onClick={() => {
                  setMenu(null);
                  navigate(`/campaign?tab=sessions&ref=thread:${encodeURIComponent(thread.id ?? '')}`);
                }}
              >
                <History fontSize="small" sx={{ mr: 1 }} /> History
              </MenuItem>
              {onEdit && (
                <MenuItem
                  onClick={() => {
                    setMenu(null);
                    onEdit(thread);
                  }}
                >
                  <Edit fontSize="small" sx={{ mr: 1 }} /> Edit
                </MenuItem>
              )}
            </Menu>
          </>
        )}
      </Stack>
    </Box>
  );
};

const ThreadsPanel: FC<{ campaignId: string; canEdit: boolean }> = ({ campaignId, canEdit }) => {
  const { toast } = useToast();
  const { confirm, dialog } = useConfirm();
  const { bumpEvents } = useCampaignPlay();
  const { threads, error, reload } = useThreads(campaignId);
  const [editing, setEditing] = useState<CampaignThread | null>(null);
  const [draft, setDraft] = useState<CampaignThread>(defaultThread);

  useOpenParam(threads, (t) => t.id, (t) => {
    setEditing(t);
    setDraft(t);
  });

  const openNew = (status: ThreadStatus = 'active') => {
    setEditing({ ...defaultThread, status });
    setDraft({ ...defaultThread, status });
  };
  const openEdit = (t: CampaignThread) => {
    setEditing(t);
    setDraft(t);
  };

  const onSave = async () => {
    if (!draft.title.trim()) throw new Error('Give the thread a title');
    if (editing?.id) await threadsApi.update(campaignId, editing.id, draft);
    else await threadsApi.create(campaignId, { ...draft, title: draft.title.trim() });
    bumpEvents();
    await reload();
  };

  const onDelete = async () => {
    if (!editing?.id) return;
    const ok = await confirm({
      title: 'Delete thread?',
      body: `Delete "${editing.title}"? Timeline entries about it stay.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    await threadsApi.remove(campaignId, editing.id);
    setEditing(null);
    toast('Thread deleted', 'success');
    await reload();
  };

  const groups: { status: ThreadStatus; title: string; hint: string }[] = [
    { status: 'active', title: 'Active', hint: 'What the party is chasing' },
    { status: 'rumour', title: 'Rumours', hint: "Heard about, not yet taken up" },
    { status: 'resolved', title: 'Resolved', hint: '' },
    { status: 'failed', title: 'Failed', hint: '' },
  ];

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Flag fontSize="small" sx={{ color: 'primary.main' }} />
          <Typography variant="h5">Threads</Typography>
        </Stack>
        {canEdit && (
          <Stack direction="row" spacing={1}>
            <Button size="small" onClick={() => openNew('rumour')}>
              Add rumour
            </Button>
            <Button size="small" variant="outlined" startIcon={<Add />} onClick={() => openNew()}>
              New thread
            </Button>
          </Stack>
        )}
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      {threads && threads.length === 0 && (
        <Alert severity="info">
          Quests, rumours and mysteries go here as one-liners with a next step, instead of paragraphs in your notes.
          Open ones show on the Overview.
        </Alert>
      )}
      <Stack spacing={2}>
        {threads &&
          groups.map((g) => {
            const list = threads.filter((t) => t.status === g.status);
            if (!list.length) return null;
            return (
              <Paper key={g.status} variant="outlined" sx={{ px: 2, py: 1 }}>
                <Stack direction="row" spacing={1} alignItems="baseline">
                  <Typography variant="overline" color="text.secondary">
                    {g.title} · {list.length}
                  </Typography>
                  {g.hint && (
                    <Typography variant="caption" color="text.secondary">
                      {g.hint}
                    </Typography>
                  )}
                </Stack>
                {list.map((t) => (
                  <ThreadRow key={t.id} thread={t} campaignId={campaignId} canEdit={canEdit} onEdit={openEdit} onChanged={reload} />
                ))}
              </Paper>
            );
          })}
      </Stack>
      <FormDialog
        open={editing !== null}
        title={editing?.id ? 'Edit thread' : draft.status === 'rumour' ? 'New rumour' : 'New thread'}
        onClose={() => setEditing(null)}
        onSave={onSave}
        maxWidth="sm"
      >
        <ThreadEditor draft={draft} onChange={setDraft} />
        {editing?.id && (
          <Button color="error" size="small" onClick={onDelete} sx={{ mt: 2 }}>
            Delete thread
          </Button>
        )}
      </FormDialog>
      {dialog}
    </Box>
  );
};

export default ThreadsPanel;

/**
 * SessionsLog - chronological list of sessions for a campaign.
 *
 * Renders a list of session cards (newest first) with a 'New
 * session' button. Each card shows session number, title, date,
 * attendees, and a summary. The full prep notes and summary are
 * shown in the detail dialog. Edit/delete per row.
 */

import React, { FC, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
  useTheme,
  alpha,
} from '@mui/material';
import { Add, Close, Delete, Edit, EventNote, Save } from '@mui/icons-material';
import { CampaignSession, defaultCampaignSession } from '../types/CampaignSession';
import { sessionsApi } from '../api/sessions';
import { useToast } from './ToastProvider';
import LinkedText from './LinkedText';

type Props = {
  campaignId: string;
  canEdit: boolean;
};

const formatDate = (d: string | null): string => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return d;
  }
};

const SessionEditor: FC<{
  initial: CampaignSession;
  nextNumber: number;
  onChange: (s: CampaignSession) => void;
}> = ({ initial, nextNumber, onChange }) => {
  const [s, setS] = useState<CampaignSession>({
    ...initial,
    session_number: initial.session_number || nextNumber,
  });
  useEffect(() => onChange(s), [s, onChange]);
  const set = <K extends keyof CampaignSession>(k: K, v: CampaignSession[K]) =>
    setS((prev) => ({ ...prev, [k]: v }));
  return (
    <Stack spacing={2}>
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
        <TextField
          label="Title"
          value={s.title}
          onChange={(e) => set('title', e.target.value)}
          fullWidth
          InputLabelProps={{ shrink: true }}
        />
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
              .filter(Boolean)
          )
        }
        helperText="Comma-separated player names"
        fullWidth
        InputLabelProps={{ shrink: true }}
      />
      <TextField
        label="Summary"
        value={s.summary}
        onChange={(e) => set('summary', e.target.value)}
        fullWidth
        multiline
        rows={5}
        placeholder="What happened in this session?"
        InputLabelProps={{ shrink: true }}
      />
      <TextField
        label="Prep notes for next session"
        value={s.prep_notes}
        onChange={(e) => set('prep_notes', e.target.value)}
        fullWidth
        multiline
        rows={4}
        placeholder="Hooks, NPCs to introduce, encounters to plan…"
        InputLabelProps={{ shrink: true }}
      />
    </Stack>
  );
};

const SessionsLog: FC<Props> = ({ campaignId, canEdit }) => {
  const theme = useTheme();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<CampaignSession[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorInitial, setEditorInitial] = useState<CampaignSession | null>(null);
  const [draft, setDraft] = useState<CampaignSession | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CampaignSession | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewing, setViewing] = useState<CampaignSession | null>(null);

  const reload = async () => {
    setLoadError(null);
    try {
      const data = await sessionsApi.list(campaignId);
      setSessions(data);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => {
    void reload();
  }, [campaignId]);

  const nextNumber = (sessions[0]?.session_number ?? 0) + 1;

  const onCreate = () => {
    setEditorInitial(null);
    setDraft({ ...defaultCampaignSession, session_number: nextNumber });
    setSaveError(null);
    setEditorOpen(true);
  };
  const onEdit = (s: CampaignSession) => {
    setEditorInitial(s);
    setDraft({ ...s });
    setSaveError(null);
    setEditorOpen(true);
  };
  const onView = (s: CampaignSession) => setViewing(s);

  const onSave = async () => {
    if (!draft) return;
    if (!draft.title.trim() && !draft.summary.trim() && !draft.prep_notes.trim()) {
      setSaveError('Add a title, summary, or prep notes');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      if (editorInitial?.id) {
        await sessionsApi.update(campaignId, editorInitial.id, draft);
        toast('Session updated', 'success');
      } else {
        await sessionsApi.create(campaignId, draft);
        toast('Session created', 'success');
      }
      setEditorOpen(false);
      setEditorInitial(null);
      setDraft(null);
      await reload();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (s: CampaignSession) => {
    if (!s.id) return;
    setDeleting(true);
    try {
      await sessionsApi.remove(campaignId, s.id);
      toast('Session deleted', 'success');
      setConfirmDelete(null);
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 1.5 }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <EventNote fontSize="small" sx={{ color: 'primary.main' }} />
          <Typography variant="h5">Sessions</Typography>
          {sessions.length > 0 && (
            <Chip
              label={`${sessions.length} logged`}
              size="small"
              variant="outlined"
            />
          )}
        </Stack>
        {canEdit && (
          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={onCreate}
            size="small"
          >
            New session
          </Button>
        )}
      </Stack>
      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}
      {sessions.length === 0 && !loadError ? (
        <Card
          variant="outlined"
          sx={{
            p: 2.5,
            textAlign: 'center',
            backgroundColor: alpha(theme.palette.primary.main, 0.04),
          }}
        >
          <Typography variant="body2" color="text.secondary">
            No sessions logged yet. Add one to start your campaign log.
          </Typography>
        </Card>
      ) : (
        <Stack spacing={1.5}>
          {sessions.map((s) => (
            <Card
              key={s.id}
              variant="outlined"
              sx={{
                cursor: 'pointer',
                '&:hover': {
                  borderColor: alpha(theme.palette.primary.main, 0.5),
                },
              }}
              onClick={() => onView(s)}
            >
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Stack spacing={0.5} sx={{ minWidth: 0, flexGrow: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip
                        label={`#${s.session_number}`}
                        size="small"
                        color="primary"
                        sx={{ fontFamily: '"JetBrains Mono", monospace' }}
                      />
                      <Typography variant="h6" noWrap>
                        {s.title || 'Untitled session'}
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(s.played_on)}
                      </Typography>
                      {s.attendees.length > 0 && (
                        <>
                          <Typography variant="caption" color="text.secondary">·</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {s.attendees.join(', ')}
                          </Typography>
                        </>
                      )}
                    </Stack>
                    {s.summary && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mt: 0.5,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {s.summary}
                      </Typography>
                    )}
                  </Stack>
                  {canEdit && (
                    <Stack direction="row" spacing={0.5}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(s);
                        }}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDelete(s);
                        }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Stack>
                  )}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <Dialog
        open={editorOpen}
        onClose={() => !saving && setEditorOpen(false)}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            backgroundColor: theme.palette.background.paper,
            backgroundImage: 'none',
            maxHeight: '90vh',
          },
        }}
      >
        <DialogTitle sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h4">
              {editorInitial ? 'Edit session' : 'New session'}
            </Typography>
            <IconButton onClick={() => setEditorOpen(false)} size="small" disabled={saving}>
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {saveError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {saveError}
            </Alert>
          )}
          {draft && (
            <SessionEditor
              initial={draft}
              nextNumber={nextNumber}
              onChange={setDraft}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditorOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={onSave}
            disabled={saving}
            startIcon={<Save />}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={viewing !== null}
        onClose={() => setViewing(null)}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            backgroundColor: theme.palette.background.paper,
            backgroundImage: 'none',
            maxHeight: '90vh',
          },
        }}
      >
        {viewing && (
          <>
            <DialogTitle sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip
                    label={`#${viewing.session_number}`}
                    size="small"
                    color="primary"
                    sx={{ fontFamily: '"JetBrains Mono", monospace' }}
                  />
                  <Typography variant="h4">
                    {viewing.title || 'Untitled session'}
                  </Typography>
                </Stack>
                <IconButton onClick={() => setViewing(null)} size="small">
                  <Close />
                </IconButton>
              </Stack>
            </DialogTitle>
            <DialogContent sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Stack direction="row" spacing={2}>
                  <Typography variant="body2" color="text.secondary">
                    {formatDate(viewing.played_on)}
                  </Typography>
                  {viewing.attendees.length > 0 && (
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {viewing.attendees.map((a) => (
                        <Chip key={a} label={a} size="small" variant="outlined" />
                      ))}
                    </Stack>
                  )}
                </Stack>
                {viewing.summary && (
                  <Box>
                    <Typography variant="overline" color="primary.main">
                      Summary
                    </Typography>
                    <LinkedText
                      text={viewing.summary}
                      campaignId={campaignId}
                    />
                  </Box>
                )}
                {viewing.prep_notes && (
                  <>
                    <Divider />
                    <Box>
                      <Typography variant="overline" color="primary.main">
                        Prep notes
                      </Typography>
                      <LinkedText
                        text={viewing.prep_notes}
                        campaignId={campaignId}
                      />
                    </Box>
                  </>
                )}
              </Stack>
            </DialogContent>
            <DialogActions>
              {canEdit && (
                <Button
                  onClick={() => {
                    if (viewing) onEdit(viewing);
                    setViewing(null);
                  }}
                  startIcon={<Edit />}
                >
                  Edit
                </Button>
              )}
              <Button onClick={() => setViewing(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Dialog
        open={confirmDelete !== null}
        onClose={() => !deleting && setConfirmDelete(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete session?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Delete session #{confirmDelete?.session_number} (
            {confirmDelete?.title || 'Untitled'})? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => confirmDelete && onDelete(confirmDelete)}
            disabled={deleting}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SessionsLog;

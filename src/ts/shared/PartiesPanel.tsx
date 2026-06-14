/**
 * PartiesPanel - the user's saved parties on the Characters page.
 *
 * Renders a horizontal row of party cards; each card shows the party
 * name and a list of member character names (resolved via the
 * user's character list). A "+ New party" button opens a dialog.
 */

import React, { FC, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
  useTheme,
  alpha,
} from '@mui/material';
import { Add, Close, Delete, Edit, Group, Save } from '@mui/icons-material';
import { Character } from '../types/Character';
import { Party, defaultParty } from '../types/Party';
import { partiesApi } from '../api/parties';
import { useToast } from './ToastProvider';

type Props = {
  characters: Character[];
  activePartyId: string | null;
  onActivePartyChange: (id: string | null) => void;
};

const PartyEditorDialog: FC<{
  open: boolean;
  initial: Party | null;
  characters: Character[];
  onClose: () => void;
  onSaved: (saved: Party) => void;
}> = ({ open, initial, characters, onClose, onSaved }) => {
  const theme = useTheme();
  const { toast } = useToast();
  const [draft, setDraft] = useState<Party | null>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(initial ?? { ...defaultParty });
      setError(null);
    }
  }, [open, initial]);

  const memberOptions = useMemo(
    () => characters.filter((c) => c.id),
    [characters]
  );

  const onSave = async () => {
    if (!draft || !draft.name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = initial?.id
        ? await partiesApi.update(initial.id, draft)
        : await partiesApi.create(draft);
      toast(initial?.id ? 'Party updated' : 'Party created', 'success');
      onSaved(saved);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => !saving && onClose()}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          backgroundColor: theme.palette.background.paper,
          backgroundImage: 'none',
        },
      }}
    >
      <DialogTitle sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h4">
            {initial?.id ? 'Edit party' : 'New party'}
          </Typography>
          <IconButton onClick={onClose} size="small" disabled={saving}>
            <Close />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ p: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {draft && (
          <Stack spacing={2} sx={{ pt: 4 }}>
            <TextField
              label="Name"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              fullWidth
              size="small"
              autoFocus
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Description"
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
              size="small"
              InputLabelProps={{ shrink: true }}
            />
            <Autocomplete
              multiple
              size="small"
              options={memberOptions}
              getOptionLabel={(o) => o.name}
              value={memberOptions.filter((c) => draft.member_ids.includes(c.id))}
              onChange={(_e, v) =>
                setDraft({ ...draft, member_ids: v.map((c) => c.id) })
              }
              renderInput={(p) => (
                <TextField
                  {...p}
                  label="Members"
                  helperText={`${draft.member_ids.length} character${
                    draft.member_ids.length === 1 ? '' : 's'
                  }`}
                  InputLabelProps={{ shrink: true }}
                />
              )}
            />
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
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
  );
};

const PartiesPanel: FC<Props> = ({
  characters,
  activePartyId,
  onActivePartyChange,
}) => {
  const theme = useTheme();
  const { toast } = useToast();
  const [parties, setParties] = useState<Party[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorInitial, setEditorInitial] = useState<Party | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Party | null>(null);
  const [deleting, setDeleting] = useState(false);

  const reload = async () => {
    setLoadError(null);
    try {
      const data = await partiesApi.list();
      setParties(data);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const onCreate = () => {
    setEditorInitial(null);
    setEditorOpen(true);
  };
  const onEdit = (p: Party) => {
    setEditorInitial(p);
    setEditorOpen(true);
  };
  const onDelete = async (p: Party) => {
    if (!p.id) return;
    setDeleting(true);
    try {
      await partiesApi.remove(p.id);
      toast('Party deleted', 'success');
      if (activePartyId === p.id) onActivePartyChange(null);
      setConfirmDelete(null);
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 1.5 }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Group fontSize="small" sx={{ color: 'primary.main' }} />
          <Typography variant="h5">Parties</Typography>
          <Chip
            label={`${parties.length} saved`}
            size="small"
            variant="outlined"
          />
        </Stack>
        <Button
          variant="outlined"
          startIcon={<Add />}
          onClick={onCreate}
          size="small"
        >
          New party
        </Button>
      </Stack>
      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}
      {parties.length === 0 && !loadError ? (
        <Card
          variant="outlined"
          sx={{
            p: 2.5,
            textAlign: 'center',
            backgroundColor: alpha(theme.palette.primary.main, 0.04),
          }}
        >
          <Typography variant="body2" color="text.secondary">
            No parties yet. Create one to attach to encounters.
          </Typography>
        </Card>
      ) : (
        <Stack
          direction="row"
          spacing={1.5}
          flexWrap="wrap"
          useFlexGap
        >
          {parties.map((p) => {
            const isActive = activePartyId === p.id;
            const members = characters.filter((c) => p.member_ids.includes(c.id));
            return (
              <Card
                key={p.id}
                variant="outlined"
                sx={{
                  width: 240,
                  borderColor: isActive ? 'primary.main' : 'divider',
                  borderWidth: isActive ? 2 : 1,
                  backgroundColor: isActive
                    ? alpha(theme.palette.primary.main, 0.08)
                    : 'transparent',
                }}
              >
                <CardActionArea onClick={() => onActivePartyChange(isActive ? null : p.id ?? null)}>
                  <CardContent sx={{ pb: 1 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Typography variant="h6" noWrap sx={{ flexGrow: 1, pr: 1 }}>
                        {p.name}
                      </Typography>
                      {isActive && (
                        <Chip
                          label="Active"
                          size="small"
                          color="primary"
                          sx={{ height: 18, fontSize: '0.65rem' }}
                        />
                      )}
                    </Stack>
                    {p.description && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          mb: 1,
                        }}
                      >
                        {p.description}
                      </Typography>
                    )}
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {members.length === 0 ? (
                        <Typography variant="caption" color="text.disabled">
                          No members
                        </Typography>
                      ) : (
                        members.map((m) => (
                          <Chip
                            key={m.id}
                            label={m.name}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem' }}
                          />
                        ))
                      )}
                    </Stack>
                  </CardContent>
                </CardActionArea>
                <Stack
                  direction="row"
                  justifyContent="flex-end"
                  sx={{ px: 1, pb: 1 }}
                >
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(p);
                    }}
                  >
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDelete(p);
                    }}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Stack>
              </Card>
            );
          })}
        </Stack>
      )}
      <PartyEditorDialog
        open={editorOpen}
        initial={editorInitial}
        characters={characters}
        onClose={() => setEditorOpen(false)}
        onSaved={() => void reload()}
      />
      <Dialog
        open={confirmDelete !== null}
        onClose={() => !deleting && setConfirmDelete(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete party?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            This will permanently delete &quot;{confirmDelete?.name}&quot;. The
            characters themselves are not affected.
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

export default PartiesPanel;

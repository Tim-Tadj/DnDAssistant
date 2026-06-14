/**
 * NpcsRoster - the campaign's NPC roster, on the Campaign page.
 *
 * Renders a list of NPC cards. Each card shows role, race, status,
 * location, and a one-line description. The detail view shows the
 * full description, notes, and (if linked) the monster stat block.
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
  alpha,
  useTheme,
} from '@mui/material';
import { Add, Close, Delete, Edit, Group, Person, Save } from '@mui/icons-material';
import {
  CampaignNpc,
  defaultCampaignNpc,
  NPC_ROLES,
  NPC_STATUSES,
  NpcStatus,
} from '../types/CampaignNpc';
import { npcsApi } from '../api/npcs';
import { monstersApi } from '../api/monsters';
import { useToast } from './ToastProvider';
import { Monster } from '../types/Monster';
import MonsterStatBlock from './MonsterStatBlock';

type Props = {
  campaignId: string;
  canEdit: boolean;
};

const statusColor: Record<string, 'success' | 'error' | 'warning' | 'default'> = {
  alive: 'success',
  dead: 'error',
  missing: 'warning',
  unknown: 'default',
};

const NpcEditor: FC<{
  initial: CampaignNpc;
  monsters: Monster[];
  onChange: (n: CampaignNpc) => void;
}> = ({ initial, monsters, onChange }) => {
  const [n, setN] = useState<CampaignNpc>(initial);
  useEffect(() => onChange(n), [n, onChange]);
  const set = <K extends keyof CampaignNpc>(k: K, v: CampaignNpc[K]) =>
    setN((prev) => ({ ...prev, [k]: v }));
  return (
    <Stack spacing={2} sx={{ pt: 2 }}>
      <Stack direction="row" spacing={2}>
        <TextField
          label="Name"
          value={n.name}
          onChange={(e) => set('name', e.target.value)}
          fullWidth
          InputLabelProps={{ shrink: true }}
        />
        <Autocomplete
          sx={{ width: 200 }}
          options={NPC_ROLES}
          value={n.role}
          onChange={(_e, v) => set('role', v ?? 'Notable')}
          renderInput={(p) => <TextField {...p} label="Role" InputLabelProps={{ shrink: true }} />}
        />
        <Autocomplete
          sx={{ width: 180 }}
          options={NPC_STATUSES}
          value={n.status}
          onChange={(_e, v) => set('status', v ?? 'alive')}
          renderInput={(p) => <TextField {...p} label="Status" InputLabelProps={{ shrink: true }} />}
        />
      </Stack>
      <Stack direction="row" spacing={2}>
        <TextField
          label="Race"
          value={n.race}
          onChange={(e) => set('race', e.target.value)}
          fullWidth
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Alignment"
          value={n.alignment}
          onChange={(e) => set('alignment', e.target.value)}
          sx={{ width: 200 }}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Location"
          value={n.location}
          onChange={(e) => set('location', e.target.value)}
          sx={{ width: 240 }}
          InputLabelProps={{ shrink: true }}
        />
      </Stack>
      <Autocomplete
        options={monsters}
        getOptionLabel={(o) => o.name}
        value={monsters.find((m) => m.id === n.monster_id) ?? null}
        onChange={(_e, v) => set('monster_id', v?.id ?? null)}
        renderInput={(p) => (
          <TextField
            {...p}
            label="Linked stat block"
            helperText="Optional: link to a monster in the bestiary for quick lookup"
          />
        )}
      />
      <TextField
        label="Description"
        value={n.description}
        onChange={(e) => set('description', e.target.value)}
        fullWidth
        multiline
        rows={3}
        InputLabelProps={{ shrink: true }}
      />
      <TextField
        label="Notes"
        value={n.notes}
        onChange={(e) => set('notes', e.target.value)}
        fullWidth
        multiline
        rows={3}
        InputLabelProps={{ shrink: true }}
      />
    </Stack>
  );
};

const NpcsRoster: FC<Props> = ({ campaignId, canEdit }) => {
  const theme = useTheme();
  const { toast } = useToast();
  const [npcs, setNpcs] = useState<CampaignNpc[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorInitial, setEditorInitial] = useState<CampaignNpc | null>(null);
  const [draft, setDraft] = useState<CampaignNpc | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CampaignNpc | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewing, setViewing] = useState<CampaignNpc | null>(null);
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [linkedMonster, setLinkedMonster] = useState<Monster | null>(null);

  const reload = async () => {
    setLoadError(null);
    try {
      const data = await npcsApi.list(campaignId);
      setNpcs(data);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => {
    void reload();
  }, [campaignId]);

  useEffect(() => {
    monstersApi
      .list()
      .then(setMonsters)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!viewing || !viewing.monster_id) {
      setLinkedMonster(null);
      return;
    }
    monstersApi
      .list()
      .then((all) => setLinkedMonster(all.find((m) => m.id === viewing.monster_id) ?? null))
      .catch(() => setLinkedMonster(null));
  }, [viewing]);

  const onCreate = () => {
    setEditorInitial(null);
    setDraft({ ...defaultCampaignNpc });
    setSaveError(null);
    setEditorOpen(true);
  };
  const onEdit = (n: CampaignNpc) => {
    setEditorInitial(n);
    setDraft({ ...n });
    setSaveError(null);
    setEditorOpen(true);
  };
  const onView = (n: CampaignNpc) => setViewing(n);

  const onSave = async () => {
    if (!draft) return;
    if (!draft.name.trim()) {
      setSaveError('Name is required');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      if (editorInitial?.id) {
        await npcsApi.update(campaignId, editorInitial.id, draft);
        toast('NPC updated', 'success');
      } else {
        await npcsApi.create(campaignId, draft);
        toast('NPC created', 'success');
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

  const onDelete = async (n: CampaignNpc) => {
    if (!n.id) return;
    setDeleting(true);
    try {
      await npcsApi.remove(campaignId, n.id);
      toast('NPC deleted', 'success');
      setConfirmDelete(null);
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const counts = useMemo(() => {
    const byStatus: Record<string, number> = {};
    for (const n of npcs) byStatus[n.status] = (byStatus[n.status] ?? 0) + 1;
    return byStatus;
  }, [npcs]);

  return (
    <Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 1.5 }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Group fontSize="small" sx={{ color: 'primary.main' }} />
          <Typography variant="h5">NPCs</Typography>
          {npcs.length > 0 && (
            <Stack direction="row" spacing={0.5}>
              <Chip
                label={`${npcs.length} total`}
                size="small"
                variant="outlined"
              />
              {Object.entries(counts).map(([status, n]) => (
                <Chip
                  key={status}
                  label={`${n} ${status}`}
                  size="small"
                  color={statusColor[status] ?? 'default'}
                  variant="outlined"
                />
              ))}
            </Stack>
          )}
        </Stack>
        {canEdit && (
          <Button variant="outlined" startIcon={<Add />} onClick={onCreate} size="small">
            New NPC
          </Button>
        )}
      </Stack>
      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}
      {npcs.length === 0 && !loadError ? (
        <Card
          variant="outlined"
          sx={{
            p: 2.5,
            textAlign: 'center',
            backgroundColor: alpha(theme.palette.primary.main, 0.04),
          }}
        >
          <Typography variant="body2" color="text.secondary">
            No NPCs yet. Add the named characters your party meets or fights.
          </Typography>
        </Card>
      ) : (
        <Stack
          direction="row"
          spacing={1.5}
          flexWrap="wrap"
          useFlexGap
        >
          {npcs.map((n) => (
            <Card
              key={n.id}
              variant="outlined"
              sx={{ width: 260, position: 'relative' }}
            >
              <CardActionArea onClick={() => onView(n)}>
                <CardContent sx={{ pb: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                    <Person fontSize="small" sx={{ color: 'primary.main' }} />
                    <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
                      {n.name}
                    </Typography>
                    <Chip
                      label={n.status}
                      size="small"
                      color={statusColor[n.status] ?? 'default'}
                      sx={{ height: 18, fontSize: '0.65rem' }}
                    />
                  </Stack>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 0.5 }}>
                    <Chip
                      label={n.role}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.7rem' }}
                    />
                    {n.race && (
                      <Chip
                        label={n.race}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    )}
                  </Stack>
                  {n.description && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {n.description}
                    </Typography>
                  )}
                  {n.location && (
                    <Typography variant="caption" color="text.secondary">
                      📍 {n.location}
                    </Typography>
                  )}
                </CardContent>
              </CardActionArea>
              {canEdit && (
                <Stack direction="row" justifyContent="flex-end" sx={{ px: 1, pb: 1 }}>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(n);
                    }}
                  >
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDelete(n);
                    }}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Stack>
              )}
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
          },
        }}
      >
        <DialogTitle sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h4">{editorInitial ? 'Edit NPC' : 'New NPC'}</Typography>
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
            <NpcEditor initial={draft} monsters={monsters} onChange={setDraft} />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditorOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={onSave} disabled={saving} startIcon={<Save />}>
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
          },
        }}
      >
        {viewing && (
          <>
            <DialogTitle sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="h4">{viewing.name}</Typography>
                  <Chip
                    label={viewing.status}
                    size="small"
                    color={statusColor[viewing.status] ?? 'default'}
                  />
                </Stack>
                <IconButton onClick={() => setViewing(null)} size="small">
                  <Close />
                </IconButton>
              </Stack>
            </DialogTitle>
            <DialogContent sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label={viewing.role} size="small" variant="outlined" />
                  {viewing.race && <Chip label={viewing.race} size="small" variant="outlined" />}
                  {viewing.alignment && <Chip label={viewing.alignment} size="small" variant="outlined" />}
                  {viewing.location && (
                    <Chip label={`📍 ${viewing.location}`} size="small" variant="outlined" />
                  )}
                </Stack>
                {viewing.description && (
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {viewing.description}
                  </Typography>
                )}
                {viewing.notes && (
                  <Box>
                    <Typography variant="overline" color="primary.main">
                      Notes
                    </Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>
                      {viewing.notes}
                    </Typography>
                  </Box>
                )}
                {linkedMonster && (
                  <Box>
                    <Typography variant="overline" color="primary.main" sx={{ mb: 1, display: 'block' }}>
                      Stat block
                    </Typography>
                    <MonsterStatBlock monster={linkedMonster} compact />
                  </Box>
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
        <DialogTitle>Delete NPC?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Delete &quot;{confirmDelete?.name}&quot;? This cannot be undone.
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

export default NpcsRoster;

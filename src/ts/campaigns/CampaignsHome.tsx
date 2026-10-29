// The list of the user's campaigns (`#/campaign?view=all`): one card
// per campaign with its status and next session, a "New campaign"
// card, and archived campaigns tucked away below. Opening a card makes
// it the active campaign and shows its hub.

import React, { FC, useEffect, useState } from 'react';
import {
  Box,
  Button,
  ButtonBase,
  Chip,
  Collapse,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
  alpha,
} from '@mui/material';
import {
  Add,
  Archive,
  Delete,
  Edit,
  Event,
  ExpandLess,
  ExpandMore,
  History,
  Map as MapIcon,
  MoreVert,
  OpenInNew,
  People,
  Unarchive,
} from '@mui/icons-material';
import { Campaign, CAMPAIGN_STATUSES, defaultCampaign } from '../types/Campaign';
import { campaignsApi } from '../api/campaigns';
import { useAuth } from '../auth/AuthContext';
import { useCampaignContext } from '../shared/CampaignContext';
import { relativeDay } from './NextSessionCard';
import { useConfirm } from '../shared/useConfirm';
import { useToast } from '../shared/ToastProvider';
import FormDialog, { errorMessage, requireName } from '../shared/FormDialog';

export const isArchived = (c: Campaign) => c.archived || c.status === 'archived';

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'primary' | 'default'> = {
  active: 'success',
  paused: 'warning',
  completed: 'primary',
};

// Dates are YYYY-MM-DD; parse as local midnight so they don't shift a
// day west of UTC.
const nextSessionLabel = (d: string | null) => {
  if (!d) return null;
  const date = new Date(`${d.slice(0, 10)}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((date.getTime() - today.getTime()) / 86400000);
  const when = days === 0 ? 'today' : days === 1 ? 'tomorrow' : days > 1 ? `in ${days} days` : `${-days} days ago`;
  return `${date.toLocaleDateString()} · ${when}`;
};

// Create and edit form (controlled: `draft` is the current value).
export const CampaignForm: FC<{ draft: Campaign; onChange: (c: Campaign) => void }> = ({ draft, onChange }) => (
  <Stack spacing={2} sx={{ pt: 1 }}>
    <TextField
      label="Name"
      value={draft.name}
      onChange={(e) => onChange({ ...draft, name: e.target.value })}
      fullWidth
      autoFocus
    />
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <TextField
        label="Setting"
        value={draft.setting}
        onChange={(e) => onChange({ ...draft, setting: e.target.value })}
        fullWidth
        helperText="e.g. Forgotten Realms, Eberron, homebrew"
      />
      <TextField
        select
        label="Status"
        value={draft.status}
        onChange={(e) => onChange({ ...draft, status: e.target.value, archived: e.target.value === 'archived' })}
        sx={{ minWidth: 180 }}
      >
        {CAMPAIGN_STATUSES.map((st) => (
          <MenuItem key={st} value={st} sx={{ textTransform: 'capitalize' }}>
            {st}
          </MenuItem>
        ))}
      </TextField>
    </Stack>
    <TextField
      label="Pitch"
      value={draft.description}
      onChange={(e) => onChange({ ...draft, description: e.target.value })}
      fullWidth
      multiline
      minRows={2}
      helperText="A line or two to remember what this campaign is about."
    />
  </Stack>
);

// Create / edit dialog for a campaign. A new campaign becomes the
// active one; the caller decides where to go next.
export const CampaignDialog: FC<{
  open: boolean;
  campaign?: Campaign | null; // editing when set
  onClose: () => void;
  onSaved?: (c: Campaign) => void;
}> = ({ open, campaign, onClose, onSaved }) => {
  const { user } = useAuth();
  const { reloadCampaigns, setActiveCampaignId } = useCampaignContext();
  const [draft, setDraft] = useState<Campaign>(defaultCampaign);
  // Reset the draft each time the dialog opens.
  useEffect(() => {
    if (open) setDraft(campaign ?? { ...defaultCampaign });
  }, [open]);

  const save = async () => {
    requireName(draft);
    const saved = campaign?.id
      ? await campaignsApi.update(campaign.id, draft)
      : await campaignsApi.create({ ...draft, owner_user_id: user?.id });
    await reloadCampaigns();
    if (!campaign?.id && saved.id) setActiveCampaignId(saved.id);
    onSaved?.(saved);
  };

  return (
    <FormDialog
      open={open}
      title={campaign?.id ? 'Edit campaign' : 'New campaign'}
      subtitle={campaign?.id ? campaign.name : 'You can run as many campaigns as you like.'}
      onClose={onClose}
      onSave={save}
      saveLabel={campaign?.id ? 'Save' : 'Create campaign'}
      maxWidth="sm"
    >
      <CampaignForm draft={draft} onChange={setDraft} />
    </FormDialog>
  );
};

const CampaignCard: FC<{
  campaign: Campaign;
  current: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onArchive: (archived: boolean) => void;
  onDelete: () => void;
}> = ({ campaign: c, current, onOpen, onEdit, onArchive, onDelete }) => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const next = nextSessionLabel(c.next_session_on);
  const archived = isArchived(c);
  const stats = c.stats;
  const lastPlayed = relativeDay(stats?.last_played_on);
  const act = (fn: () => void) => () => {
    setAnchor(null);
    fn();
  };
  return (
    <Paper
      variant="outlined"
      sx={{
        position: 'relative',
        borderColor: current ? 'primary.main' : undefined,
        bgcolor: (t) => (current ? alpha(t.palette.primary.main, 0.06) : undefined),
        opacity: archived ? 0.75 : 1,
        transition: 'border-color 120ms',
        '&:hover': { borderColor: 'primary.main' },
      }}
    >
      <ButtonBase onClick={onOpen} sx={{ display: 'block', width: '100%', textAlign: 'left', p: 2, pr: 6, height: '100%' }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
          <MapIcon fontSize="small" color="primary" />
          <Typography variant="h5" noWrap sx={{ fontFamily: '"Cinzel", serif', minWidth: 0 }}>
            {c.name}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
          {current && <Chip size="small" color="primary" label="Current" />}
          {stats?.live_session != null && <Chip size="small" color="success" label={`Session ${stats.live_session} live`} />}
          <Chip
            size="small"
            label={c.status}
            color={STATUS_COLORS[c.status] ?? 'default'}
            variant={current ? 'outlined' : 'filled'}
            sx={{ textTransform: 'capitalize' }}
          />
          {c.setting && <Chip size="small" variant="outlined" label={c.setting} />}
        </Stack>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '2.86em' }}
        >
          {c.description || 'No pitch yet.'}
        </Typography>
        {stats?.party_names && (
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 1.25, color: 'text.secondary', minWidth: 0 }}>
            <People sx={{ fontSize: 16 }} />
            <Typography variant="caption" noWrap>
              {stats.party_names.split(',').map((n) => n.trim()).filter(Boolean).join(', ')}
            </Typography>
          </Stack>
        )}
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.5, color: 'text.secondary' }}>
          <History sx={{ fontSize: 16 }} />
          <Typography variant="caption">
            {stats?.sessions_played
              ? `${stats.sessions_played} session${stats.sessions_played === 1 ? '' : 's'} played${lastPlayed ? ` � last ${lastPlayed}` : ''}`
              : 'No sessions played yet'}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.5, color: 'text.secondary' }}>
          <Event sx={{ fontSize: 16 }} />
          <Typography variant="caption">{next ? `Next session ${next}` : 'No session scheduled'}</Typography>
        </Stack>
      </ButtonBase>
      <IconButton
        size="small"
        aria-label={`More actions for ${c.name}`}
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{ position: 'absolute', top: 8, right: 8 }}
      >
        <MoreVert fontSize="small" />
      </IconButton>
      <Menu open={Boolean(anchor)} anchorEl={anchor} onClose={() => setAnchor(null)}>
        <MenuItem onClick={act(onOpen)}>
          <ListItemIcon>
            <OpenInNew fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Open" />
        </MenuItem>
        <MenuItem onClick={act(onEdit)}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Edit details" />
        </MenuItem>
        <MenuItem onClick={act(() => onArchive(!archived))}>
          <ListItemIcon>{archived ? <Unarchive fontSize="small" /> : <Archive fontSize="small" />}</ListItemIcon>
          <ListItemText primary={archived ? 'Restore' : 'Archive'} />
        </MenuItem>
        <MenuItem onClick={act(onDelete)} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <Delete fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText primary="Delete…" />
        </MenuItem>
      </Menu>
    </Paper>
  );
};

const GRID = { display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(3, 1fr)' } };

const CampaignsHome: FC<{ onOpen: (c: Campaign) => void; startCreating?: boolean }> = ({ onOpen, startCreating }) => {
  const { campaigns, campaignsLoading, activeCampaignId, reloadCampaigns } = useCampaignContext();
  const { toast } = useToast();
  const { confirm, dialog } = useConfirm();
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [creating, setCreating] = useState(!!startCreating);
  const [showArchived, setShowArchived] = useState(false);

  const live = campaigns.filter((c) => !isArchived(c));
  const archived = campaigns.filter(isArchived);

  const setArchived = async (c: Campaign, value: boolean) => {
    if (!c.id) return;
    try {
      await campaignsApi.update(c.id, { ...c, archived: value, status: value ? 'archived' : 'active' });
      await reloadCampaigns();
      toast(value ? `Archived ${c.name}` : `Restored ${c.name}`, 'success');
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  const remove = async (c: Campaign) => {
    if (!c.id) return;
    const ok = await confirm({
      title: `Delete ${c.name}?`,
      body: 'Its sessions, NPCs and per-campaign character state are deleted too. Parties and characters stay. Archive it instead if you might come back to it.',
      confirmLabel: 'Delete campaign',
      destructive: true,
    });
    if (!ok) return;
    try {
      await campaignsApi.delete(c.id);
      await reloadCampaigns();
      toast(`Deleted ${c.name}`, 'success');
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  const card = (c: Campaign) => (
    <CampaignCard
      key={c.id}
      campaign={c}
      current={c.id === activeCampaignId}
      onOpen={() => onOpen(c)}
      onEdit={() => setEditing(c)}
      onArchive={(v) => setArchived(c, v)}
      onDelete={() => remove(c)}
    />
  );

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <MapIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h3">My Campaigns</Typography>
          {live.length > 0 && <Chip size="small" label={live.length} />}
        </Stack>
        <Button variant="contained" startIcon={<Add />} onClick={() => setCreating(true)}>
          New campaign
        </Button>
      </Stack>

      <Box sx={GRID}>
        {live.map(card)}
        <Paper
          variant="outlined"
          component={ButtonBase}
          onClick={() => setCreating(true)}
          sx={{
            p: 2,
            minHeight: 150,
            borderStyle: 'dashed',
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            color: 'text.secondary',
            '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
          }}
        >
          <Add />
          <Typography variant="body2">
            {campaigns.length === 0 && !campaignsLoading ? 'Create your first campaign' : 'Start another campaign'}
          </Typography>
        </Paper>
      </Box>

      {archived.length > 0 && (
        <Box>
          <Button
            size="small"
            color="inherit"
            onClick={() => setShowArchived((v) => !v)}
            endIcon={showArchived ? <ExpandLess /> : <ExpandMore />}
            sx={{ color: 'text.secondary' }}
          >
            Archived ({archived.length})
          </Button>
          <Collapse in={showArchived}>
            <Box sx={{ ...GRID, mt: 1 }}>{archived.map(card)}</Box>
          </Collapse>
        </Box>
      )}

      <CampaignDialog
        open={creating || !!editing}
        campaign={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSaved={(c) => {
          if (!editing) onOpen(c);
        }}
      />
      {dialog}
    </Stack>
  );
};

export default CampaignsHome;

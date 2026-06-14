/**
 * CampaignWorkflowBar - the "next session" / cadence / status
 * controls on a campaign card.
 *
 * Shows:
 * - "Next session" date (countdown if in the future, e.g.
 *   "in 3 days")
 * - Cadence chip (weekly / biweekly / monthly / ad-hoc)
 * - Status chip (active / paused / completed)
 * - Quick-action menu: "Mark session played" (bumps
 *   next_session_on by cadence or sets to "next week"),
 *   "Pause", "Resume", "Archive".
 */

import React, { FC, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import { Archive, Edit, Event, MoreVert, Pause, PlayArrow, Save } from '@mui/icons-material';
import { Campaign, CAMPAIGN_CADENCES, CAMPAIGN_STATUSES } from '../types/Campaign';
import { useToast } from './ToastProvider';
import { api } from '../api/api-client';

type Props = {
  campaign: Campaign;
  canEdit?: boolean;
  onChanged?: (c: Campaign) => void;
};

const formatRelative = (d: string | null): string => {
  if (!d) return '—';
  const target = new Date(d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ms = target.getTime() - today.getTime();
  const days = Math.round(ms / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  if (days > 0) return `in ${days} days`;
  return `${-days} days ago`;
};

const cadenceDays: Record<string, number> = {
  '': 0,
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  'ad-hoc': 0,
};

const CampaignWorkflowBar: FC<Props> = ({ campaign, canEdit = true, onChanged }) => {
  const theme = useTheme();
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState<Campaign>(campaign);
  const [saving, setSaving] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  useEffect(() => {
    setDraft(campaign);
  }, [campaign.id, campaign.updated_at]);

  const persist = async (next: Campaign) => {
    if (!campaign.id) return;
    setSaving(true);
    try {
      const updated = await api.put<Campaign>(`/campaigns/${campaign.id}`, next);
      onChanged?.(updated);
      toast('Campaign updated', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setSaving(false);
    }
  };

  const onMarkPlayed = async () => {
    if (!campaign.id) return;
    setMenuAnchor(null);
    const today = new Date().toISOString().slice(0, 10);
    // Push next_session_on by the cadence (or +7 days if ad-hoc).
    const next = campaign.next_session_on
      ? new Date(campaign.next_session_on)
      : new Date(today);
    const days = cadenceDays[campaign.cadence ?? ''] || 7;
    next.setDate(next.getDate() + days);
    const updated: Campaign = {
      ...campaign,
      next_session_on: next.toISOString().slice(0, 10),
      status: 'active',
      archived: false,
    };
    await persist(updated);
  };

  const onSetStatus = async (status: string) => {
    if (!campaign.id) return;
    setMenuAnchor(null);
    await persist({
      ...campaign,
      status,
      archived: status === 'archived',
    });
  };

  const onSaveEdit = async () => {
    setEditOpen(false);
    await persist(draft);
  };

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Tooltip title="Next session" arrow>
          <Chip
            icon={<Event fontSize="small" />}
            label={
              campaign.next_session_on
                ? `${campaign.next_session_on.slice(0, 10)} · ${formatRelative(campaign.next_session_on)}`
                : 'No session scheduled'
            }
            size="small"
            color={
              campaign.next_session_on && new Date(campaign.next_session_on).getTime() < Date.now()
                ? 'warning'
                : 'default'
            }
            variant="outlined"
          />
        </Tooltip>
        {campaign.cadence && (
          <Chip
            label={campaign.cadence}
            size="small"
            variant="outlined"
          />
        )}
        <Chip
          label={campaign.status}
          size="small"
          color={
            campaign.status === 'active' ? 'success'
            : campaign.status === 'paused' ? 'warning'
            : campaign.status === 'completed' ? 'primary'
            : 'default'
          }
        />
        {canEdit && (
          <>
            <Button
              size="small"
              variant="text"
              startIcon={<PlayArrow fontSize="small" />}
              onClick={onMarkPlayed}
              disabled={saving}
            >
              Mark played
            </Button>
            <Tooltip title="Edit workflow" arrow>
              <IconButton size="small" onClick={() => setEditOpen((v) => !v)}>
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="More actions" arrow>
              <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)}>
                <MoreVert fontSize="small" />
              </IconButton>
            </Tooltip>
            <Menu
              open={Boolean(menuAnchor)}
              anchorEl={menuAnchor}
              onClose={() => setMenuAnchor(null)}
            >
              <MenuItem onClick={() => onSetStatus('active')}>
                <PlayArrow fontSize="small" sx={{ mr: 1 }} /> Mark active
              </MenuItem>
              <MenuItem onClick={() => onSetStatus('paused')}>
                <Pause fontSize="small" sx={{ mr: 1 }} /> Pause
              </MenuItem>
              <MenuItem onClick={() => onSetStatus('completed')}>
                <Save fontSize="small" sx={{ mr: 1 }} /> Mark completed
              </MenuItem>
              <MenuItem onClick={() => onSetStatus('archived')}>
                <Archive fontSize="small" sx={{ mr: 1 }} /> Archive
              </MenuItem>
            </Menu>
          </>
        )}
      </Stack>
      {editOpen && canEdit && (
        <Box
          sx={{
            mt: 1.5,
            p: 1.5,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 1,
            backgroundColor: alpha(theme.palette.primary.main, 0.04),
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
            <TextField
              type="date"
              label="Next session"
              size="small"
              value={draft.next_session_on ?? ''}
              onChange={(e) =>
                setDraft({ ...draft, next_session_on: e.target.value || null })
              }
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              select
              label="Cadence"
              size="small"
              value={draft.cadence ?? ''}
              onChange={(e) => setDraft({ ...draft, cadence: e.target.value })}
              sx={{ minWidth: 140 }}
              SelectProps={{ native: true }}
            >
              {CAMPAIGN_CADENCES.map((c) => (
                <option key={c} value={c}>
                  {c || '— none —'}
                </option>
              ))}
            </TextField>
            <TextField
              select
              label="Status"
              size="small"
              value={draft.status}
              onChange={(e) => setDraft({ ...draft, status: e.target.value })}
              sx={{ minWidth: 140 }}
              SelectProps={{ native: true }}
            >
              {CAMPAIGN_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </TextField>
            <Button variant="contained" onClick={onSaveEdit} disabled={saving} startIcon={<Save fontSize="small" />}>
              Save
            </Button>
          </Stack>
        </Box>
      )}
    </Box>
  );
};

export default CampaignWorkflowBar;

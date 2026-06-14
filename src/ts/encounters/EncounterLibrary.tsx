// Phase 9: the Library tab. Shows the saved encounters for the
// active campaign and lets the DM "Re-run" any of them (which
// hydrates the saved MonsterRef list back into full Monster
// objects and writes them to EncounterContext, so the Live tab
// can pick them up).

import React, { FC, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Delete,
  History as HistoryIcon,
  PlayArrow,
} from '@mui/icons-material';
import { EncounterSave } from '../types/EncounterSave';
import { encounterSavesApi } from '../api/encounter-saves';
import { useEncounter } from './EncounterContext';
import { useCampaignContext } from '../shared/CampaignContext';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../shared/ToastProvider';
import { hydrateEncounterSave } from '../api/hydrate-encounter';

const EncounterLibrary: FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { activeCampaign } = useCampaignContext();
  const enc = useEncounter();

  const [saves, setSaves] = useState<EncounterSave[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reRunId, setReRunId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const reload = async () => {
    if (!user) return;
    setLoadError(null);
    try {
      const data = activeCampaign
        ? await encounterSavesApi.listForCampaign(activeCampaign.id ?? '')
        : await encounterSavesApi.list();
      setSaves(data);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => {
    void reload();
  }, [user, activeCampaign]);

  const onReRun = async (s: EncounterSave) => {
    if (!s.id) return;
    setReRunId(s.id);
    try {
      const monsters = await hydrateEncounterSave(s);
      enc.loadFromSave(s.id, s.name, monsters);
      toast(`Loaded "${s.name}" — switch to the Live tab to run it`, 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setReRunId(null);
    }
  };

  const onDelete = async (s: EncounterSave) => {
    if (!s.id) return;
    setDeleting(s.id);
    try {
      await encounterSavesApi.remove(s.id);
      toast('Encounter deleted', 'success');
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setDeleting(null);
    }
  };

  const grouped = useMemo(() => {
    if (!saves) return null;
    // Group by whether the save is attached to the active campaign.
    const forActive: EncounterSave[] = [];
    const personal: EncounterSave[] = [];
    for (const s of saves) {
      if (s.campaign_id && activeCampaign && s.campaign_id === activeCampaign.id) {
        forActive.push(s);
      } else if (!s.campaign_id) {
        personal.push(s);
      } else {
        // Belongs to a different campaign; show under "other"
        forActive.push(s);
      }
    }
    return { forActive, personal };
  }, [saves, activeCampaign]);

  if (!user) {
    return <Alert severity="info">Sign in to save and re-run encounters.</Alert>;
  }

  if (saves === null) {
    return (
      <Stack alignItems="center" sx={{ py: 4 }}>
        <CircularProgress />
      </Stack>
    );
  }

  if (loadError) {
    return <Alert severity="error">{loadError}</Alert>;
  }

  if (!grouped || (grouped.forActive.length === 0 && grouped.personal.length === 0)) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <HistoryIcon sx={{ fontSize: 48, opacity: 0.4 }} />
        <Typography variant="h6" sx={{ mt: 1 }}>
          No saved encounters yet
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Generate one in the <strong>Builder</strong> tab and click
          <strong> Save to library</strong>.
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      {activeCampaign && grouped.forActive.length > 0 && (
        <Box>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <Typography variant="overline" color="text.secondary">
              For active campaign: {activeCampaign.name}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
            {grouped.forActive.map((s) => (
              <SaveCard
                key={s.id}
                save={s}
                reRunning={reRunId === s.id}
                deleting={deleting === s.id}
                onReRun={() => onReRun(s)}
                onDelete={() => onDelete(s)}
              />
            ))}
          </Stack>
        </Box>
      )}
      {grouped.personal.length > 0 && (
        <Box>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <Typography variant="overline" color="text.secondary">
              Personal scratch (not attached to a campaign)
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
            {grouped.personal.map((s) => (
              <SaveCard
                key={s.id}
                save={s}
                reRunning={reRunId === s.id}
                deleting={deleting === s.id}
                onReRun={() => onReRun(s)}
                onDelete={() => onDelete(s)}
              />
            ))}
          </Stack>
        </Box>
      )}
    </Stack>
  );
};

const SaveCard: FC<{
  save: EncounterSave;
  reRunning: boolean;
  deleting: boolean;
  onReRun: () => void;
  onDelete: () => void;
}> = ({ save, reRunning, deleting, onReRun, onDelete }) => {
  return (
    <Card variant="outlined" sx={{ width: 320, position: 'relative' }}>
      <CardContent sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <HistoryIcon fontSize="small" color="primary" />
          <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
            {save.name}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5, mb: 1 }}>
          {(save.monsters ?? []).slice(0, 6).map((m) => (
            <Chip
              key={`${m.id}-${m.name}`}
              label={`${m.count}× ${m.name}`}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem' }}
            />
          ))}
          {(save.monsters?.length ?? 0) > 6 && (
            <Chip
              label={`+${(save.monsters?.length ?? 0) - 6}`}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem' }}
            />
          )}
        </Stack>
        <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            {(save.monsters ?? []).reduce((acc, m) => acc + m.count, 0)} combatants
          </Typography>
          <Typography variant="caption" color="text.secondary">
            ·
          </Typography>
          <Typography
            variant="caption"
            sx={{ fontFamily: '"JetBrains Mono", monospace' }}
            color="text.secondary"
          >
            {save.total_xp} XP
          </Typography>
          {save.difficulty && (
            <Chip
              label={save.difficulty}
              size="small"
              sx={{ height: 18, fontSize: '0.65rem' }}
            />
          )}
        </Stack>
        {save.played_on && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            Played: {save.played_on}
          </Typography>
        )}
        {save.notes && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 1,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {save.notes}
          </Typography>
        )}
      </CardContent>
      <Stack direction="row" justifyContent="space-between" sx={{ px: 1, pb: 1 }}>
        <Button
          size="small"
          variant="contained"
          startIcon={reRunning ? <CircularProgress size={12} /> : <PlayArrow />}
          onClick={onReRun}
          disabled={reRunning || deleting}
        >
          {reRunning ? 'Loading…' : 'Re-run'}
        </Button>
        <Tooltip title="Delete" arrow>
          <span>
            <IconButton
              size="small"
              color="error"
              onClick={onDelete}
              disabled={reRunning || deleting}
            >
              <Delete fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    </Card>
  );
};

export default EncounterLibrary;

/**
 * EncounterHistory - encounter-save list for a campaign.
 *
 * Renders a list of saved encounters. Each entry shows monster
 * mix, total XP, difficulty, and a 'Re-run' button that pushes
 * the monsters back into the encounter tracker. A 'Delete'
 * button removes the save.
 */

import React, { FC, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import { Casino, Close, Delete, History, OpenInNew, Replay } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { EncounterSave, MonsterRef } from '../types/EncounterSave';
import { encounterSavesApi } from '../api/encounter-saves';
import { useToast } from './ToastProvider';
import { useCampaignContext } from './CampaignContext';
import { hydrateEncounterSave } from '../api/hydrate-encounter';
import { Monster } from '../types/Monster';

type Props = {
  campaignId: string;
  canEdit: boolean;
  /** Called when the user clicks "Re-run" so the encounter page can
   *  repopulate its tracker. */
  onRerun?: (monsters: Monster[]) => void;
};

const formatDate = (d: string | null): string => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return d;
  }
};

const EncounterHistory: FC<Props> = ({ campaignId, canEdit, onRerun }) => {
  const theme = useTheme();
  const { toast } = useToast();
  const { setActiveCampaignId } = useCampaignContext();
  const navigate = useNavigate();
  const [saves, setSaves] = useState<EncounterSave[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [reRunId, setReRunId] = useState<string | null>(null);

  const reload = async () => {
    setLoadError(null);
    try {
      const data = await encounterSavesApi.listForCampaign(campaignId);
      setSaves(data);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => {
    void reload();
  }, [campaignId]);

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

  const onRerunClick = async (s: EncounterSave) => {
    setReRunId(s.id ?? null);
    try {
      const monsters = await hydrateEncounterSave(s);
      if (onRerun) {
        onRerun(monsters);
        toast(`Loaded '${s.name}' into the tracker`, 'success');
        return;
      }
      // No onRerun: navigate the user to the Encounters page
      // with the active campaign pre-set, so they can drop into
      // the Live tab manually. The Library tab has its own
      // Re-run button for the proper end-to-end flow.
      setActiveCampaignId(campaignId);
      navigate('encounter');
      toast(`'${s.name}' ready — open the Library tab to re-run`, 'info');
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setReRunId(null);
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
          <History fontSize="small" sx={{ color: 'primary.main' }} />
          <Typography variant="h5">Encounters</Typography>
          {saves.length > 0 && (
            <Chip
              label={`${saves.length} saved`}
              size="small"
              variant="outlined"
            />
          )}
        </Stack>
      </Stack>
      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}
      {saves.length === 0 && !loadError ? (
        <Card
          variant="outlined"
          sx={{
            p: 2.5,
            textAlign: 'center',
            backgroundColor: alpha(theme.palette.primary.main, 0.04),
          }}
        >
          <Typography variant="body2" color="text.secondary">
            No encounters saved to this campaign yet. Generate one and
            save it from the Encounters page.
          </Typography>
        </Card>
      ) : (
        <Stack spacing={1.5}>
          {saves.map((s) => (
            <Card key={s.id} variant="outlined">
              <CardContent sx={{ pb: 1.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Stack spacing={0.5} sx={{ minWidth: 0, flexGrow: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Casino fontSize="small" sx={{ color: 'primary.main' }} />
                      <Typography variant="h6" noWrap>
                        {s.name || 'Unnamed encounter'}
                      </Typography>
                      {s.difficulty && (
                        <Chip
                          label={s.difficulty}
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ height: 18, fontSize: '0.65rem' }}
                        />
                      )}
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(s.played_on)}
                      </Typography>
                      {s.total_xp > 0 && (
                        <>
                          <Typography variant="caption" color="text.secondary">·</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {s.total_xp.toLocaleString()} XP
                          </Typography>
                        </>
                      )}
                    </Stack>
                    {s.monsters.length > 0 && (
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                        {s.monsters.map((m, i) => (
                          <Chip
                            key={`${m.id ?? m.name}-${i}`}
                            label={`${m.count}× ${m.name}`}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                      </Stack>
                    )}
                    {s.notes && (
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
                        {s.notes}
                      </Typography>
                    )}
                  </Stack>
                  <Stack direction="row" spacing={0.5}>
                    {s.monsters.length > 0 && (
                      <Button
                        size="small"
                        startIcon={
                          reRunId === s.id ? (
                            <CircularProgress size={12} />
                          ) : onRerun ? (
                            <Replay fontSize="small" />
                          ) : (
                            <OpenInNew fontSize="small" />
                          )
                        }
                        onClick={() => onRerunClick(s)}
                        disabled={reRunId === s.id}
                      >
                        {reRunId === s.id ? 'Loading…' : onRerun ? 'Re-run' : 'Open in Encounters'}
                      </Button>
                    )}
                    {canEdit && (
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => onDelete(s)}
                        disabled={deleting === s.id}
                      >
                        {deleting === s.id ? <Close fontSize="small" /> : <Delete fontSize="small" />}
                      </IconButton>
                    )}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default EncounterHistory;

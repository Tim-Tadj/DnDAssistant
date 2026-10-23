// The top of a campaign's Overview tab: one tile per part of the
// campaign (parties, sessions, encounters, NPCs) with a count and the
// next useful thing to do, plus the shortcuts a DM reaches for between
// sessions (prepare an encounter, log a session).

import React, { FC, ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, ButtonBase, Paper, Skeleton, Stack, Typography, alpha } from '@mui/material';
import { Casino, Group, History, Map as MapIcon, People } from '@mui/icons-material';
import { campaignPartiesApi } from '../api/campaign-parties';
import { sessionsApi } from '../api/sessions';
import { encounterSavesApi } from '../api/encounter-saves';
import { npcsApi } from '../api/npcs';
import { isPlayed } from '../types/EncounterSave';
import { CampaignSession } from '../types/CampaignSession';
import type { HubTab } from './CampaignHub';

type Stats = {
  parties: number;
  members: number;
  sessions: number;
  lastSession: CampaignSession | null;
  prepared: number;
  played: number;
  npcs: number;
};

const formatDate = (d?: string | null) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString() : null);

const CampaignAtAGlance: FC<{ campaignId: string; onOpenTab: (t: HubTab) => void }> = ({ campaignId, onOpenTab }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let alive = true;
    setStats(null);
    // Each part loads on its own; one failing shouldn't blank the rest.
    const safe = <T,>(p: Promise<T>, fallback: T) => p.catch(() => fallback);
    Promise.all([
      safe(campaignPartiesApi.list(campaignId), []),
      safe(sessionsApi.list(campaignId), []),
      safe(encounterSavesApi.listForCampaign(campaignId), []),
      safe(npcsApi.list(campaignId), []),
    ]).then(([parties, sessions, saves, npcs]) => {
      if (!alive) return;
      const byNumber = [...sessions].sort((a, b) => b.session_number - a.session_number);
      setStats({
        parties: parties.length,
        members: parties.reduce((acc, p) => acc + (p.member_ids?.length ?? 0), 0),
        sessions: sessions.length,
        lastSession: byNumber[0] ?? null,
        prepared: saves.filter((s) => !isPlayed(s)).length,
        played: saves.filter(isPlayed).length,
        npcs: npcs.length,
      });
    });
    return () => {
      alive = false;
    };
  }, [campaignId]);

  const last = stats?.lastSession;

  return (
    <Stack spacing={1.5}>
      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' } }}>
        <Tile
          icon={<People />}
          label="Parties"
          value={stats?.parties}
          detail={stats && (stats.parties ? `${stats.members} characters` : 'Link a party')}
          onClick={() => onOpenTab('parties')}
        />
        <Tile
          icon={<History />}
          label="Sessions"
          value={stats?.sessions}
          detail={
            stats &&
            (last ? `Last: #${last.session_number}${last.played_on ? `, ${formatDate(last.played_on)}` : ''}` : 'Log your first')
          }
          onClick={() => onOpenTab('sessions')}
        />
        <Tile
          icon={<MapIcon />}
          label="Encounters"
          value={stats ? stats.prepared + stats.played : undefined}
          detail={stats && `${stats.prepared} prepared · ${stats.played} played`}
          onClick={() => onOpenTab('encounters')}
        />
        <Tile
          icon={<Group />}
          label="NPCs"
          value={stats?.npcs}
          detail={stats && (stats.npcs ? 'In the roster' : 'Add your first')}
          onClick={() => onOpenTab('npcs')}
        />
      </Box>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Button variant="contained" size="small" startIcon={<Casino />} onClick={() => navigate('/encounter?tab=build')}>
          Prepare an encounter
        </Button>
        <Button size="small" startIcon={<History />} onClick={() => onOpenTab('sessions')}>
          Log a session
        </Button>
      </Stack>
    </Stack>
  );
};

const Tile: FC<{
  icon: ReactNode;
  label: string;
  value?: number;
  detail?: ReactNode;
  onClick: () => void;
}> = ({ icon, label, value, detail, onClick }) => (
  <Paper
    variant="outlined"
    component={ButtonBase}
    onClick={onClick}
    sx={{
      p: 1.5,
      display: 'block',
      textAlign: 'left',
      width: '100%',
      transition: 'border-color 120ms, background-color 120ms',
      '&:hover': { borderColor: 'primary.main', bgcolor: (t) => alpha(t.palette.primary.main, 0.04) },
    }}
  >
    <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'text.secondary', mb: 0.5 }}>
      {icon}
      <Typography variant="overline" sx={{ lineHeight: 1.5 }}>
        {label}
      </Typography>
    </Stack>
    {value === undefined ? (
      <Skeleton width={40} height={36} />
    ) : (
      <Typography variant="h4" sx={{ fontFamily: '"JetBrains Mono", monospace' }}>
        {value}
      </Typography>
    )}
    <Typography variant="caption" color="text.secondary" noWrap component="div">
      {detail ?? ' '}
    </Typography>
  </Paper>
);

export default CampaignAtAGlance;

// Phase 9: the Encounter page. Three tabs, context-aware of the
// active campaign:
//   - Library: saved encounters for the active campaign. "Re-run"
//     loads a save into the tracker (Builder + Live).
//   - Builder: the randomizer. Generates an encounter that lands
//     in `monstersInCombat` (shared with Live). "Save to
//     campaign" persists it to the library.
//   - Live: the live combat tracker. Reads `monstersInCombat`.
//
// The Builder and Live tabs share state via EncounterContext.

import React, { FC, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import {
  Casino,
  History as HistoryIcon,
  PlayArrow,
} from '@mui/icons-material';
import { EncounterProvider, useEncounter } from './EncounterContext';
import { useCampaignContext } from '../shared/CampaignContext';
import EncounterLibrary from './EncounterLibrary';
import EncounterBuilder from './EncounterBuilder';
import EncounterLive from './EncounterLive';
import { useAuth } from '../auth/AuthContext';

const EncounterPageInner: FC = () => {
  const { user } = useAuth();
  const { activeCampaign, activeParty } = useCampaignContext();
  const { currentEncounterName, monstersInCombat } = useEncounter();
  const [tab, setTab] = useState<string>('live');

  if (!user) {
    return (
      <Alert severity="info">
        Sign in (top right) to save encounters to a campaign, sync your party
        level, and re-run old encounters.
      </Alert>
    );
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography variant="h3" sx={{ flexGrow: 1 }}>
          Encounters
        </Typography>
        {!activeCampaign && (
          <Chip
            label="No active campaign — pick one above to save encounters"
            color="warning"
            size="small"
          />
        )}
      </Stack>

      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems={{ xs: 'flex-start', md: 'center' }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="overline" color="text.secondary">
              Active campaign
            </Typography>
            <Chip
              label={activeCampaign?.name ?? '—'}
              size="small"
              color={activeCampaign ? 'primary' : 'default'}
            />
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="overline" color="text.secondary">
              Active party
            </Typography>
            <Chip
              label={activeParty?.name ?? '—'}
              size="small"
              color={activeParty ? 'secondary' : 'default'}
            />
          </Stack>
          {currentEncounterName && (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexGrow: 1 }}>
              <Typography variant="overline" color="text.secondary">
                Running
              </Typography>
              <Chip
                label={`${currentEncounterName} · ${monstersInCombat.length} combatants`}
                size="small"
                color="success"
              />
            </Stack>
          )}
        </Stack>
      </Paper>

      <Paper sx={{ overflow: 'hidden' }}>
        <Tabs
          value={tab}
          onChange={(_e, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab
            value="live"
            label="Live"
            icon={<PlayArrow fontSize="small" />}
            iconPosition="start"
          />
          <Tab
            value="builder"
            label="Builder"
            icon={<Casino fontSize="small" />}
            iconPosition="start"
          />
          <Tab
            value="library"
            label="Library"
            icon={<HistoryIcon fontSize="small" />}
            iconPosition="start"
          />
        </Tabs>
        <Box sx={{ p: 2 }}>
          {tab === 'live' && <EncounterLive />}
          {tab === 'builder' && <EncounterBuilder />}
          {tab === 'library' && <EncounterLibrary />}
        </Box>
      </Paper>
    </Stack>
  );
};

const EncounterPage: FC = () => (
  <EncounterProvider>
    <EncounterPageInner />
  </EncounterProvider>
);

export default EncounterPage;

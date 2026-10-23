// The Encounter page follows the DM's flow, left to right:
//   - Build: the randomizer. Generate, then tweak (select / reroll /
//     remove / count) and hit "Run encounter".
//   - Run: the live combat tracker. Reads `monstersInCombat`.
//   - Library: saved encounters for the active campaign. "Run" loads a
//     save straight into the tracker.
//
// Build and Run share state via EncounterContext, which lives at the
// app root, so peeking at the Builder (or another page) mid-fight
// doesn't wipe HP, conditions or initiative. The active tab lives in
// the URL (see encounter-tab.ts).

import React, { FC } from 'react';
import { Alert, Badge, Box, Paper, Tab, Tabs } from '@mui/material';
import { Casino, History as HistoryIcon, PlayArrow } from '@mui/icons-material';
import { useEncounter } from './EncounterContext';
import EncounterLibrary from './EncounterLibrary';
import EncounterBuilder from './EncounterBuilder';
import EncounterLive from './EncounterLive';
import { useAuth } from '../auth/AuthContext';
import { useEncounterTab } from './encounter-tab';

const EncounterPage: FC = () => {
  const { user } = useAuth();
  const { monstersInCombat } = useEncounter();
  const [tab, setTab] = useEncounterTab(monstersInCombat.length > 0 ? 'run' : 'build');

  if (!user) {
    return (
      <Alert severity="info">
        Sign in (top right) to save encounters to a campaign, sync your party
        level, and re-run old encounters.
      </Alert>
    );
  }

  return (
    <Paper sx={{ overflow: 'hidden' }}>
      <Tabs value={tab} onChange={(_e, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
        <Tab value="build" label="1 · Build" icon={<Casino fontSize="small" />} iconPosition="start" />
        <Tab
          value="run"
          label={
            <Badge
              color="success"
              variant="dot"
              invisible={monstersInCombat.length === 0}
              sx={{ '& .MuiBadge-badge': { right: -6 } }}
            >
              2 · Run
            </Badge>
          }
          icon={<PlayArrow fontSize="small" />}
          iconPosition="start"
        />
        <Tab value="library" label="Library" icon={<HistoryIcon fontSize="small" />} iconPosition="start" />
      </Tabs>
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: tab === 'build' ? 'block' : 'none' }}>
          <EncounterBuilder />
        </Box>
        {tab === 'run' && <EncounterLive />}
        {tab === 'library' && <EncounterLibrary />}
      </Box>
    </Paper>
  );
};

export default EncounterPage;

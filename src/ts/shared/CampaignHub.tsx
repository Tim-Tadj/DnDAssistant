// Phase 9: the campaign hub. Shows everything the user has set
// up for the active campaign in one place:
//   - the campaign card + workflow bar (next session, cadence,
//     status, edit)
//   - parties linked to this campaign
//   - characters in this campaign (with per-campaign state)
//   - sessions log
//   - NPCs roster
//   - encounter history
//   - linked-entity notes

import React, { FC, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
  useTheme,
} from '@mui/material';
import { Map as MapIcon, AutoStories, Group, Person, History, People } from '@mui/icons-material';
import { Campaign } from '../types/Campaign';
import CampaignWorkflowBar from './CampaignWorkflowBar';
import CampaignPartiesPanel from './CampaignPartiesPanel';
import CampaignCharacters from './CampaignCharacters';
import SessionsLog from './SessionsLog';
import NpcsRoster from './NpcsRoster';
import EncounterHistory from './EncounterHistory';
import LinkedText from './LinkedText';

type Props = {
  campaign: Campaign;
  onChanged?: () => void;
  canEdit?: boolean;
};

const CampaignHub: FC<Props> = ({ campaign, onChanged, canEdit = true }) => {
  const theme = useTheme();
  const [tab, setTab] = useState<string>('overview');
  const campaignId = campaign.id ?? '';

  return (
    <Stack spacing={3}>
      <Paper sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }}>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <MapIcon color="primary" />
              <Typography variant="h3" noWrap>
                {campaign.name}
              </Typography>
              {campaign.setting && (
                <Chip
                  label={campaign.setting}
                  size="small"
                  variant="outlined"
                  sx={{ ml: 1 }}
                />
              )}
            </Stack>
            {campaign.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {campaign.description}
              </Typography>
            )}
          </Box>
          <CampaignWorkflowBar campaign={campaign} onChanged={onChanged} />
        </Stack>
      </Paper>

      <Paper sx={{ overflow: 'hidden' }}>
        <Tabs
          value={tab}
          onChange={(_e, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab value="overview" label="Overview" icon={<AutoStories fontSize="small" />} iconPosition="start" />
          <Tab value="parties" label="Parties" icon={<People fontSize="small" />} iconPosition="start" />
          <Tab value="characters" label="Characters" icon={<Person fontSize="small" />} iconPosition="start" />
          <Tab value="sessions" label="Sessions" icon={<History fontSize="small" />} iconPosition="start" />
          <Tab value="npcs" label="NPCs" icon={<Group fontSize="small" />} iconPosition="start" />
          <Tab value="encounters" label="Encounters" icon={<MapIcon fontSize="small" />} iconPosition="start" />
        </Tabs>
        <Box sx={{ p: 2 }}>
          {tab === 'overview' && (
            <Stack spacing={2}>
              {campaign.notes ? (
                <Box>
                  <Typography variant="overline" color="primary.main">
                    Campaign notes
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, mt: 0.5 }}>
                    <LinkedText text={campaign.notes} campaignId={campaignId} />
                  </Paper>
                </Box>
              ) : (
                <Alert severity="info">
                  Add campaign notes (use the workflow bar) to keep your prep,
                  house rules, and ongoing plot threads in one place. Use
                  {` [[monster:Goblin]]`} or {`[[npc:Captain Yara]]`} to link to
                  stat blocks and NPCs.
                </Alert>
              )}
            </Stack>
          )}
          {tab === 'parties' && <CampaignPartiesPanel campaignId={campaignId} canEdit={canEdit} />}
          {tab === 'characters' && <CampaignCharacters campaignId={campaignId} canEdit={canEdit} />}
          {tab === 'sessions' && <SessionsLog campaignId={campaignId} canEdit={canEdit} />}
          {tab === 'npcs' && <NpcsRoster campaignId={campaignId} canEdit={canEdit} />}
          {tab === 'encounters' && <EncounterHistory campaignId={campaignId} canEdit={canEdit} />}
        </Box>
      </Paper>
    </Stack>
  );
};

export default CampaignHub;

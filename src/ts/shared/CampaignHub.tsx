// Phase 9: the campaign hub. Shows everything the user has set
// up for the active campaign in one place:
//   - the campaign card + workflow bar (next session, cadence,
//     status, edit)
//   - parties linked to this campaign
//   - characters in this campaign (with per-campaign state)
//   - sessions log
//   - NPCs roster
//   - encounters: prepared ahead of time, and the record of what was played
//   - linked-entity notes

import React, { FC, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { Map as MapIcon, AutoStories, Casino, Edit, Group, Person, History, People, Save } from '@mui/icons-material';
import { campaignsApi } from '../api/campaigns';
import { useToast } from './ToastProvider';
import { Campaign } from '../types/Campaign';
import CampaignWorkflowBar from './CampaignWorkflowBar';
import CampaignPartiesPanel from './CampaignPartiesPanel';
import CampaignCharacters from './CampaignCharacters';
import SessionsLog from './SessionsLog';
import NpcsRoster from './NpcsRoster';
import EncounterSavesView from '../encounters/EncounterSavesView';
import CampaignAtAGlance from './CampaignAtAGlance';
import LinkedText from './LinkedText';

export const HUB_TABS = ['overview', 'parties', 'characters', 'sessions', 'npcs', 'encounters'] as const;
export type HubTab = typeof HUB_TABS[number];

// The open tab lives in the URL (`#/campaign?tab=sessions`) so search
// results and other pages can link straight to it.
function useHubTab(): [HubTab, (t: HubTab) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab') as HubTab | null;
  const tab = raw && HUB_TABS.includes(raw) ? raw : 'overview';
  const setTab = (t: HubTab) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', t);
      next.delete('open');
      return next;
    });
  return [tab, setTab];
}

type Props = {
  campaign: Campaign;
  onChanged?: () => void;
  canEdit?: boolean;
};

const CampaignHub: FC<Props> = ({ campaign, onChanged, canEdit = true }) => {
  const [tab, setTab] = useHubTab();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const campaignId = campaign.id ?? '';
  const { toast } = useToast();
  const [notesDraft, setNotesDraft] = useState<string | null>(null);
  const [savingNotes, setSavingNotes] = useState(false);

  const onSaveNotes = async () => {
    if (notesDraft === null || !campaign.id) return;
    setSavingNotes(true);
    try {
      await campaignsApi.update(campaign.id, { ...campaign, notes: notesDraft });
      toast('Notes saved', 'success');
      setNotesDraft(null);
      onChanged?.();
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setSavingNotes(false);
    }
  };

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
              <CampaignAtAGlance campaignId={campaignId} onOpenTab={setTab} />
              {notesDraft !== null ? (
                <Box>
                  <TextField
                    label="Campaign notes"
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    fullWidth
                    multiline
                    minRows={6}
                    autoFocus
                    InputLabelProps={{ shrink: true }}
                    helperText="Use [[monster:Goblin]], [[npc:Captain Yara]], [[location:Iron Keep]] to link to stat blocks and NPCs."
                  />
                  <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 1 }}>
                    <Button color="inherit" onClick={() => setNotesDraft(null)} disabled={savingNotes}>
                      Cancel
                    </Button>
                    <Button variant="contained" startIcon={<Save />} onClick={onSaveNotes} disabled={savingNotes}>
                      {savingNotes ? 'Saving…' : 'Save notes'}
                    </Button>
                  </Stack>
                </Box>
              ) : campaign.notes ? (
                <Box>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="overline" color="primary.main">
                      Campaign notes
                    </Typography>
                    {canEdit && (
                      <Button size="small" startIcon={<Edit fontSize="small" />} onClick={() => setNotesDraft(campaign.notes ?? '')}>
                        Edit
                      </Button>
                    )}
                  </Stack>
                  <Paper variant="outlined" sx={{ p: 2, mt: 0.5 }}>
                    <LinkedText text={campaign.notes} campaignId={campaignId} />
                  </Paper>
                </Box>
              ) : (
                <Alert
                  severity="info"
                  action={
                    canEdit && (
                      <Button color="inherit" size="small" startIcon={<Edit fontSize="small" />} onClick={() => setNotesDraft('')}>
                        Add notes
                      </Button>
                    )
                  }
                >
                  Keep your prep, house rules, and plot threads here. Use
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
          {tab === 'encounters' && (
            <EncounterSavesView
              campaignId={campaignId}
              canEdit={canEdit}
              highlightId={params.get('open')}
              emptyAction={
                <Button variant="contained" size="small" startIcon={<Casino />} onClick={() => navigate('/encounter?tab=build')}>
                  Prepare an encounter
                </Button>
              }
            />
          )}
        </Box>
      </Paper>
    </Stack>
  );
};

export default CampaignHub;

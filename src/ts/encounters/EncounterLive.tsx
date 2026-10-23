// The Run tab. Renders the combat tracker against the shared
// EncounterContext.
//
// A fight runs in one of two modes:
//   - Live: played at the table. "End & record" saves what happened
//     (outcome, rounds, casualties, XP, log) to the campaign, tied to
//     a session.
//   - Practice: the DM test-runs an encounter ahead of time to see how
//     it plays. Nothing is recorded.

import React, { FC, useState } from 'react';
import { Alert, Button, Chip, Stack, ToggleButton, ToggleButtonGroup, Tooltip, Typography, alpha } from '@mui/material';
import { Casino, History as HistoryIcon, Science, SportsMartialArts } from '@mui/icons-material';
import { useEncounter } from './EncounterContext';
import EncounterTracker from './encounter-tracker';
import RecordEncounterDialog from './RecordEncounterDialog';
import { useCampaignContext } from '../shared/CampaignContext';
import { useSettings } from '../shared/SettingsContext';
import { useToast } from '../shared/ToastProvider';
import { useEncounterTab } from './encounter-tab';

const EncounterLive: FC<{ active?: boolean }> = ({ active = true }) => {
  const enc = useEncounter();
  const { activeCampaign } = useCampaignContext();
  const { settings } = useSettings();
  const { toast } = useToast();
  const [, setTab] = useEncounterTab();
  const [recording, setRecording] = useState(false);

  const empty = enc.monstersInCombat.length === 0;
  const practice = enc.mode === 'practice';

  const endPractice = () => {
    enc.clear();
    setTab(enc.meta.id ? 'library' : 'build');
  };

  return (
    <Stack spacing={2}>
      {empty && (
        <Alert
          severity="info"
          action={
            <Stack direction="row" spacing={1}>
              <Button variant="contained" size="small" startIcon={<Casino />} onClick={() => setTab('build')}>
                Build an encounter
              </Button>
              <Button size="small" color="inherit" startIcon={<HistoryIcon />} onClick={() => setTab('library')}>
                Open library
              </Button>
            </Stack>
          }
        >
          No encounter running yet. Build one, run a prepared one, or add monsters straight to the tracker below.
        </Alert>
      )}

      {!empty && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          justifyContent="space-between"
          sx={{
            px: 1.5,
            py: 1,
            borderRadius: 1,
            border: 1,
            borderColor: practice ? 'warning.main' : 'divider',
            bgcolor: (t) => (practice ? alpha(t.palette.warning.main, 0.08) : 'transparent'),
          }}
        >
          <Typography variant="body2" color={practice ? 'warning.main' : 'text.secondary'}>
            {practice
              ? 'Practice run: test how this plays. Nothing is recorded; end it to go back to prep.'
              : activeCampaign
                ? `Live: when the fight ends, record what happened to ${activeCampaign.name}.`
                : 'Live: when the fight ends, record what happened to your encounter history.'}
          </Typography>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={enc.mode}
            onChange={(_e, v) => v && enc.setMode(v)}
            sx={{ flexShrink: 0 }}
          >
            <ToggleButton value="live">
              <SportsMartialArts fontSize="small" sx={{ mr: 0.5 }} /> Live
            </ToggleButton>
            <Tooltip title="Test-run an encounter ahead of time. Nothing is recorded." arrow>
              <ToggleButton value="practice">
                <Science fontSize="small" sx={{ mr: 0.5 }} /> Practice
              </ToggleButton>
            </Tooltip>
          </ToggleButtonGroup>
        </Stack>
      )}

      <EncounterTracker
        tracker={enc.tracker}
        party={enc.party ?? undefined}
        active={active}
        confirmDestructive={settings.confirmDestructive}
        onAddMonsters={enc.addMonsters}
        onRecord={empty || practice ? undefined : () => setRecording(true)}
        onEnd={empty ? undefined : practice ? endPractice : enc.clear}
        endLabel={practice ? 'End practice run' : 'End without recording'}
        title={
          !empty && (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
              <Typography variant="h5" noWrap>
                {enc.meta.name || 'Untitled encounter'}
              </Typography>
              {practice && <Chip size="small" color="warning" variant="outlined" label="Practice" />}
              {activeCampaign && (
                <Typography variant="body2" color="text.secondary" noWrap>
                  · {activeCampaign.name}
                </Typography>
              )}
            </Stack>
          )
        }
      />

      <RecordEncounterDialog
        open={recording}
        onClose={() => setRecording(false)}
        onSaved={(record) => {
          toast(`Recorded "${record.name}"`, 'success');
          enc.clear();
          setTab('library');
        }}
      />
    </Stack>
  );
};

export default EncounterLive;

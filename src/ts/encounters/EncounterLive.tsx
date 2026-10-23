// The Run tab. Renders the combat tracker against the shared
// EncounterContext. The "monsters in combat" list is sourced from the
// context, not from props.

import React, { FC } from 'react';
import { Alert, Button, Stack, Typography } from '@mui/material';
import { Casino, History as HistoryIcon } from '@mui/icons-material';
import { useEncounter } from './EncounterContext';
import EncounterTracker from './encounter-tracker';
import { useCampaignContext } from '../shared/CampaignContext';
import { useSettings } from '../shared/SettingsContext';
import { charactersApi } from '../api/characters';
import { useAuth } from '../auth/AuthContext';
import { Character } from '../types/Character';
import { useEncounterTab } from './encounter-tab';

const EncounterLive: FC<{ active?: boolean }> = ({ active = true }) => {
  const { user } = useAuth();
  const enc = useEncounter();
  const { activeParty, activeCampaign } = useCampaignContext();
  const { settings } = useSettings();
  const [, setTab] = useEncounterTab();
  const [party, setParty] = React.useState<Character[] | null>(null);

  // When there's an active party, fetch its members so the PCs can
  // join initiative alongside the monsters.
  React.useEffect(() => {
    if (!user || !activeParty) {
      setParty(null);
      return;
    }
    charactersApi
      .list()
      .then((all) => setParty(all.filter((c) => c.id && activeParty.member_ids.includes(c.id))))
      .catch(() => setParty(null));
  }, [user, activeParty]);

  const empty = enc.monstersInCombat.length === 0;

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
          No encounter running yet. Build one, run a saved one, or add monsters straight to the tracker below.
        </Alert>
      )}

      <EncounterTracker
        monstersInCombat={enc.monstersInCombat}
        party={party ?? undefined}
        active={active}
        autoAddParty={settings.autoAddParty}
        groupInitiative={settings.groupInitiative}
        confirmDestructive={settings.confirmDestructive}
        onEnd={empty ? undefined : enc.clear}
        title={
          !empty && (
            <Typography variant="h5" noWrap>
              {enc.currentEncounterName || 'Untitled encounter'}
              {activeCampaign && (
                <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                  · {activeCampaign.name}
                </Typography>
              )}
            </Typography>
          )
        }
      />
    </Stack>
  );
};

export default EncounterLive;

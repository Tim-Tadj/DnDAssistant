// Phase 9: the Live tab. Renders the combat tracker against the
// shared EncounterContext. The "monsters in combat" list is
// sourced from the context, not from props.

import React, { FC } from 'react';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Casino } from '@mui/icons-material';
import { useEncounter } from './EncounterContext';
import EncounterTracker from './encounter-tracker';
import { useCampaignContext } from '../shared/CampaignContext';
import { charactersApi } from '../api/characters';
import { useAuth } from '../auth/AuthContext';
import { Character } from '../types/Character';

const EncounterLive: FC = () => {
  const { user } = useAuth();
  const enc = useEncounter();
  const { activeParty, activeCampaign, setActivePartyId } = useCampaignContext();
  const navigate = useNavigate();
  const [party, setParty] = React.useState<Character[] | null>(null);

  // When there's an active party, fetch its members so we can
  // show the "PCs" alongside the monsters in the tracker.
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

  return (
    <Stack spacing={2}>
      {enc.monstersInCombat.length === 0 && (
        <Alert
          severity="info"
          action={
            <Button
              color="inherit"
              size="small"
              startIcon={<Casino />}
              onClick={() => navigate('encounter')}
            >
              Go to Builder
            </Button>
          }
        >
          No encounter loaded. Generate one in the <strong>Builder</strong> tab,
          or re-run a saved encounter from the <strong>Library</strong>.
        </Alert>
      )}

      {enc.monstersInCombat.length > 0 && (
        <Box>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 1 }}
          >
            <Stack>
              <Typography variant="h5">
                {enc.currentEncounterName || 'Untitled encounter'}
              </Typography>
              {activeCampaign && (
                <Typography variant="caption" color="text.secondary">
                  Running for: {activeCampaign.name}
                </Typography>
              )}
            </Stack>
            <Button size="small" variant="outlined" onClick={() => enc.clear()}>
              End encounter
            </Button>
          </Stack>
        </Box>
      )}

      <EncounterTracker
        monstersInCombat={enc.monstersInCombat}
        party={party ?? undefined}
      />
    </Stack>
  );
};

export default EncounterLive;

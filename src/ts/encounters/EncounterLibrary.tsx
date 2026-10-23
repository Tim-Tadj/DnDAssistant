// The Library tab: the active campaign's prepared encounters (run them
// or test-run them) and the record of what was played. With no active
// campaign (or with `?scope=all`, which search uses for saves outside a
// campaign) it lists all of the user's saves.

import React, { FC } from 'react';
import { Alert, Button, Stack, Typography } from '@mui/material';
import { Casino } from '@mui/icons-material';
import { useSearchParams } from 'react-router-dom';
import { useCampaignContext } from '../shared/CampaignContext';
import { useAuth } from '../auth/AuthContext';
import { useEncounterTab } from './encounter-tab';
import EncounterSavesView from './EncounterSavesView';

const EncounterLibrary: FC = () => {
  const { user } = useAuth();
  const { activeCampaign } = useCampaignContext();
  const [, setTab] = useEncounterTab();
  const [params, setParams] = useSearchParams();
  const showAll = !activeCampaign || params.get('scope') === 'all';

  if (!user) {
    return <Alert severity="info">Sign in to save, run and record encounters.</Alert>;
  }

  return (
    <>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {!showAll && activeCampaign
            ? `Encounters for ${activeCampaign.name}.`
            : activeCampaign
              ? 'All your encounters, in every campaign.'
              : 'All your encounters. Pick a campaign at the top to focus on one.'}
        </Typography>
        {activeCampaign && showAll && (
          <Button
            size="small"
            onClick={() =>
              setParams((prev) => {
                const next = new URLSearchParams(prev);
                next.delete('scope');
                next.delete('open');
                return next;
              })
            }
          >
            Only {activeCampaign.name}
          </Button>
        )}
      </Stack>
      <EncounterSavesView
        campaignId={showAll ? null : activeCampaign?.id ?? null}
        highlightId={params.get('open')}
        emptyAction={
          <Button variant="contained" size="small" startIcon={<Casino />} onClick={() => setTab('build')}>
            Build an encounter
          </Button>
        }
      />
    </>
  );
};

export default EncounterLibrary;

/**
 * Campaigns page.
 *
 * Two views: the active campaign's CampaignHub (workflow bar +
 * parties + characters + sessions + NPCs + encounters + notes), and
 * `?view=all`, the list of every campaign with "New campaign"
 * (CampaignsHome). The list also shows when nothing is active.
 *
 * The "Tales of Avandria" example world is shown at the bottom for
 * signed-out users, and for signed-in users who turn it on in
 * Settings (it's noise once you have your own campaigns).
 */

import React, { FC, Suspense, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Box, Paper, Skeleton, Stack, Tab, Tabs, Typography } from '@mui/material';
import { AutoStories } from '@mui/icons-material';
import { Campaign } from '../types/Campaign';
import CampaignHub from '../shared/CampaignHub';
import { useAuth } from '../auth/AuthContext';
import { useCampaignContext } from '../shared/CampaignContext';
import { useSettings } from '../shared/SettingsContext';
import CampaignsHome from './CampaignsHome';

import MapOfAvandria from '../../res/talesOfAvandria/Avandria.jpg';
import MapProperties from '../../res/talesOfAvandria/Avandria.json';
import AvandriaLore from '../../res/talesOfAvandria/AvandriaLore.json';
import CampaignMap from '../campaigns/campaign-map';
import RenderJsonRecursive from '../shared/render-json-recursive';

const LORE = 'Lore';
const MAP = 'Map';
const ADVENTURE_LOG = 'Adventure Log';

const AvandriaExample: FC = () => {
  const [tab, setTab] = useState<string>(MAP);
  return (
    <Paper sx={{ overflow: 'hidden' }}>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1,
            backgroundColor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'primary.contrastText',
          }}
        >
          <AutoStories fontSize="small" />
        </Box>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5">Tales of Avandria</Typography>
          <Typography variant="caption" color="text.secondary">
            Example world — bundled with the app
          </Typography>
        </Box>
        <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ minHeight: 36 }}>
          <Tab label={MAP} value={MAP} sx={{ minHeight: 36 }} />
          <Tab label={LORE} value={LORE} sx={{ minHeight: 36 }} />
          <Tab label={ADVENTURE_LOG} value={ADVENTURE_LOG} sx={{ minHeight: 36 }} />
        </Tabs>
      </Stack>
      <Box sx={{ p: 2 }}>
        {tab === MAP && (
          <CampaignMap campaignMap={MapOfAvandria} mapProperties={MapProperties} />
        )}
        {tab === LORE && (
          <Suspense fallback={<Skeleton animation="wave" variant="rounded" height={300} />}>
            <RenderJsonRecursive instance={AvandriaLore} />
          </Suspense>
        )}
        {tab === ADVENTURE_LOG && (
          <Alert severity="info">
            Each campaign keeps its own adventure log: open a campaign and use
            the Sessions tab. It fills in as you play: fights, level-ups, NPCs
            met, threads advanced, and anything you jot.
          </Alert>
        )}
      </Box>
    </Paper>
  );
};

const CampaignManager: FC = () => {
  const { user } = useAuth();
  const { activeCampaign, setActiveCampaignId, reloadCampaigns } = useCampaignContext();
  const [params, setParams] = useSearchParams();
  const { settings } = useSettings();
  const showExample = !user || settings.showExampleWorld;
  // `?view=all` lists every campaign; otherwise the active one's hub.
  const showAll = params.get('view') === 'all' || !activeCampaign;

  const openCampaign = (c: Campaign) => {
    if (c.id) setActiveCampaignId(c.id);
    setParams({ tab: 'overview' });
  };

  return (
    <Stack spacing={3}>
      {user ? (
        showAll ? (
          <CampaignsHome onOpen={openCampaign} />
        ) : (
          activeCampaign && <CampaignHub campaign={activeCampaign} onChanged={reloadCampaigns} />
        )
      ) : (
        <Alert severity="info">
          Sign in (top right) to create and manage your own campaigns. The
          Tales of Avandria example world is below.
        </Alert>
      )}
      {showExample && (
        <Box>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
            <AutoStories fontSize="small" sx={{ color: 'primary.main' }} />
            <Typography variant="h5">Browse example world</Typography>
          </Stack>
          <AvandriaExample />
        </Box>
      )}
    </Stack>
  );
};

export default CampaignManager;

// Phase 9: context bar. Sits between the AppBar and the page
// content. Shows the active campaign and party, lets the user
// switch them with one click. Renders nothing for signed-out
// users (the active selection is meaningless without a campaign
// to focus on).

import React from 'react';
import {
  Autocomplete,
  Box,
  Chip,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
  alpha,
} from '@mui/material';
import { Campaign } from '../types/Campaign';
import { Party } from '../types/Party';
import { useCampaignContext } from './CampaignContext';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Map as MapIcon, People, Edit } from '@mui/icons-material';

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'default' | 'info'> = {
  active: 'success',
  paused: 'warning',
  completed: 'default',
  archived: 'default',
};

const ContextBar: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    campaigns,
    parties,
    activeCampaign,
    setActiveCampaignId,
    activeParty,
    setActivePartyId,
  } = useCampaignContext();

  if (!user) return null;

  // Filter out archived campaigns from the picker (the user can
  // still see them in the Campaigns page, but they don't make
  // sense as the "active" one).
  const campaignOptions: Campaign[] = campaigns.filter(
    (c) => c.status !== 'archived',
  );

  return (
    <Paper
      elevation={0}
      sx={{
        position: 'sticky',
        top: 56,
        zIndex: (t) => t.zIndex.appBar - 1,
        px: 2,
        py: 1,
        borderTop: `1px solid ${theme.palette.divider}`,
        borderBottom: `1px solid ${theme.palette.divider}`,
        backgroundColor: alpha(theme.palette.background.paper, 0.96),
        backdropFilter: 'blur(8px)',
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ xs: 'stretch', sm: 'center' }}
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
          <MapIcon fontSize="small" color="primary" />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              textTransform: 'uppercase',
              letterSpacing: 1,
              fontWeight: 600,
              fontSize: '0.7rem',
            }}
          >
            Campaign
          </Typography>
        </Stack>
        <Autocomplete
          size="small"
          sx={{ flex: 1, minWidth: 200, maxWidth: 480 }}
          options={campaignOptions}
          getOptionLabel={(o) => o.name}
          value={activeCampaign ?? null}
          onChange={(_e, v) => setActiveCampaignId(v?.id ?? null)}
          renderOption={(props, option) => (
            <li {...props} key={option.id ?? option.name}>
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ width: '100%' }}
              >
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="body2" noWrap>
                    {option.name}
                  </Typography>
                  {option.setting && (
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {option.setting}
                    </Typography>
                  )}
                </Box>
                <Chip
                  size="small"
                  label={option.status}
                  color={STATUS_COLORS[option.status] ?? 'default'}
                  sx={{ height: 18, fontSize: '0.65rem', textTransform: 'capitalize' }}
                />
              </Stack>
            </li>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              size="small"
              placeholder={
                campaignOptions.length === 0
                  ? 'No campaigns yet — create one'
                  : 'Pick a campaign…'
              }
            />
          )}
        />

        <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
          <People fontSize="small" color="secondary" />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              textTransform: 'uppercase',
              letterSpacing: 1,
              fontWeight: 600,
              fontSize: '0.7rem',
            }}
          >
            Party
          </Typography>
        </Stack>
        <Autocomplete
          size="small"
          sx={{ flex: 1, minWidth: 200, maxWidth: 360 }}
          options={parties}
          getOptionLabel={(o: Party) => o.name}
          value={activeParty ?? null}
          onChange={(_e, v) => setActivePartyId(v?.id ?? null)}
          renderInput={(params) => (
            <TextField
              {...params}
              size="small"
              placeholder={
                parties.length === 0
                  ? 'No parties yet — create one on Characters page'
                  : 'Pick a party…'
              }
            />
          )}
        />

        <Tooltip title="Manage campaigns" arrow>
          <Box
            role="button"
            tabIndex={0}
            onClick={() => navigate('campaign')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') navigate('campaign');
            }}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              cursor: 'pointer',
              color: 'text.secondary',
              '&:hover': { color: 'primary.main' },
              px: 1,
              py: 0.5,
            }}
          >
            <Edit fontSize="small" />
            <Typography variant="caption">Manage</Typography>
          </Box>
        </Tooltip>
      </Stack>
    </Paper>
  );
};

export default ContextBar;

// Compact campaign + party switcher that lives inside the AppBar.
// Replaces the old full-width context row: two chip-style buttons
// that open a menu to switch the active campaign / party, with a
// "Manage" entry at the bottom of each. Renders nothing for
// signed-out users.

import React, { FC, ReactNode, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Check, ExpandMore, Map as MapIcon, People, Settings as SettingsIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useCampaignContext } from './CampaignContext';
import { useAuth } from '../auth/AuthContext';

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'default' | 'info'> = {
  active: 'success',
  paused: 'warning',
  completed: 'default',
  archived: 'default',
};

type Option = { id: string; label: string; secondary?: string; status?: string };

const Switcher: FC<{
  icon: ReactNode;
  kind: string;
  value: Option | null;
  options: Option[];
  emptyLabel: string;
  manageLabel: string;
  onSelect: (id: string) => void;
  onManage: () => void;
}> = ({ icon, kind, value, options, emptyLabel, manageLabel, onSelect, onManage }) => {
  const theme = useTheme();
  const narrow = useMediaQuery(theme.breakpoints.down('lg'));
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return (
    <>
      <Tooltip title={`Active ${kind}${value ? `: ${value.label}` : ''}`} arrow>
        <Button
          size="small"
          color="inherit"
          startIcon={icon}
          endIcon={<ExpandMore fontSize="small" />}
          onClick={(e) => setAnchor(e.currentTarget)}
          sx={{
            textTransform: 'none',
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 1.5,
            px: 1.25,
            maxWidth: narrow ? 180 : 260,
            color: value ? 'text.primary' : 'text.secondary',
          }}
        >
          <Typography variant="body2" noWrap>
            {value?.label ?? emptyLabel}
          </Typography>
        </Button>
      </Tooltip>
      <Menu
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        PaperProps={{ sx: { minWidth: 260 } }}
      >
        <Typography variant="overline" color="text.secondary" sx={{ px: 2 }}>
          Switch {kind}
        </Typography>
        {options.length === 0 && (
          <MenuItem disabled>
            <ListItemText primary={`No ${kind}s yet`} />
          </MenuItem>
        )}
        {options.map((o) => (
          <MenuItem
            key={o.id}
            selected={o.id === value?.id}
            onClick={() => {
              onSelect(o.id);
              setAnchor(null);
            }}
          >
            <ListItemIcon>{o.id === value?.id && <Check fontSize="small" />}</ListItemIcon>
            <ListItemText primary={o.label} secondary={o.secondary} />
            {o.status && (
              <Chip
                size="small"
                label={o.status}
                color={STATUS_COLORS[o.status] ?? 'default'}
                sx={{ ml: 1, height: 18, fontSize: '0.65rem', textTransform: 'capitalize' }}
              />
            )}
          </MenuItem>
        ))}
        <Divider />
        <MenuItem
          onClick={() => {
            setAnchor(null);
            onManage();
          }}
        >
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={manageLabel} />
        </MenuItem>
      </Menu>
    </>
  );
};

const ContextBar: FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { campaigns, parties, activeCampaign, setActiveCampaignId, activeParty, setActivePartyId } =
    useCampaignContext();

  if (!user) return null;

  // Archived campaigns stay on the Campaigns page but don't make
  // sense as the "active" one.
  const campaignOptions: Option[] = campaigns
    .filter((c) => c.status !== 'archived' && c.id)
    .map((c) => ({ id: c.id as string, label: c.name, secondary: c.setting || undefined, status: c.status }));
  const partyOptions: Option[] = parties
    .filter((p) => p.id)
    .map((p) => ({
      id: p.id as string,
      label: p.name,
      secondary: `${p.member_ids.length} member${p.member_ids.length === 1 ? '' : 's'}`,
    }));

  const current = (opts: Option[], id?: string | null) => opts.find((o) => o.id === id) ?? null;

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Switcher
        icon={<MapIcon fontSize="small" color="primary" />}
        kind="campaign"
        value={current(campaignOptions, activeCampaign?.id)}
        options={campaignOptions}
        emptyLabel="No campaign"
        manageLabel="Manage campaigns…"
        onSelect={setActiveCampaignId}
        onManage={() => navigate('campaign')}
      />
      <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
        <Switcher
          icon={<People fontSize="small" color="secondary" />}
          kind="party"
          value={current(partyOptions, activeParty?.id)}
          options={partyOptions}
          emptyLabel="No party"
          manageLabel="Manage parties…"
          onSelect={setActivePartyId}
          onManage={() => navigate('characters')}
        />
      </Box>
    </Stack>
  );
};

export default ContextBar;

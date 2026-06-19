/**
 * Campaigns page.
 *
 * Phase 9: the page is centred on the active campaign (held in
 * CampaignContext). If there is an active campaign, we show the
 * full CampaignHub (workflow bar + parties + characters +
 * sessions + NPCs + encounters + linked-entity notes).
 *
 * If the user has no active campaign, we show the EntityBrowser
 * with a CTA to pick one from the ContextBar at the top.
 *
 * The "Tales of Avandria" example world is always shown at the
 * bottom so a new user has something to look at.
 */

import React, { FC, ReactNode, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  Typography,
  useTheme,
  Card,
  CardContent,
  CardActionArea,
  Chip,
} from '@mui/material';
import { Add, AutoStories, Map as MapIcon, OpenInNew } from '@mui/icons-material';
import { Dialog, DialogContent, DialogTitle, Skeleton, Tab, Tabs } from '@mui/material';
import { TextField } from '@mui/material';
import { GridColDef } from '@mui/x-data-grid';
import { Campaign, defaultCampaign } from '../types/Campaign';
import { campaignsApi } from '../api/campaigns';
import { useList } from '../shared/useList';
import { EntityBrowser } from '../shared/EntityBrowser';
import CampaignDetailCard from '../shared/CampaignDetailCard';
import CampaignHub from '../shared/CampaignHub';
import { useToast } from '../shared/ToastProvider';
import { useAuth } from '../auth/AuthContext';
import { useCampaignContext } from '../shared/CampaignContext';

import MapOfAvandria from '../../res/talesOfAvandria/Avandria.jpg';
import MapProperties from '../../res/talesOfAvandria/Avandria.json';
import AvandriaLore from '../../res/talesOfAvandria/AvandriaLore.json';
import CampaignMap from '../campaigns/campaign-map';
import RenderJsonRecursive from '../shared/render-json-recursive';
import { Suspense } from 'react';

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
            Adventure log coming soon. Use the Notes field on a campaign to keep
            session notes in the meantime.
          </Alert>
        )}
      </Box>
    </Paper>
  );
};

const CampaignCreate: FC<{ onCreated?: () => void }> = ({ onCreated }) => {
  const { user } = useAuth();
  const { setActiveCampaignId, reloadCampaigns } = useCampaignContext();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Campaign | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const theme = useTheme();

  const onSave = async () => {
    if (!draft || !draft.name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await campaignsApi.create({ ...draft, owner_user_id: user?.id ?? '' });
      toast('Campaign created', 'success');
      setOpen(false);
      setDraft(null);
      await reloadCampaigns();
      if (created.id) setActiveCampaignId(created.id);
      onCreated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button
        variant="contained"
        startIcon={<Add />}
        onClick={() => {
          setDraft({ ...defaultCampaign, name: '', owner_user_id: user?.id });
          setError(null);
          setOpen(true);
        }}
      >
        New Campaign
      </Button>
      <Dialog
        open={open}
        onClose={() => !saving && setOpen(false)}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            backgroundColor: theme.palette.background.paper,
            backgroundImage: 'none',
          },
        }}
      >
        <DialogTitle sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h4">New Campaign</Typography>
            <Stack direction="row" spacing={1}>
              <Button onClick={() => setOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={onSave}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </Stack>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {draft && (
            <Stack spacing={2} sx={{ pt: 0 }}>
              <TextField
                label="Name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Setting"
                  value={draft.setting}
                  onChange={(e) => setDraft({ ...draft, setting: e.target.value })}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  helperText="e.g. Forgotten Realms, Eberron, homebrew"
                />
                <TextField
                  label="Status"
                  value={draft.status}
                  onChange={(e) => setDraft({ ...draft, status: e.target.value })}
                  sx={{ width: 200 }}
                  InputLabelProps={{ shrink: true }}
                  helperText="active / paused / completed"
                />
              </Stack>
              <TextField
                label="Description"
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                fullWidth
                multiline
                rows={2}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Notes"
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                fullWidth
                multiline
                rows={6}
                InputLabelProps={{ shrink: true }}
                helperText="Use [[monster:Goblin]], [[npc:Captain Yara]], [[location:Iron Keep]] to link to stat blocks and NPCs."
              />
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

const columns: GridColDef<Campaign>[] = [
  { field: 'name', headerName: 'Name', flex: 2, sortable: true, filterable: true },
  { field: 'setting', headerName: 'Setting', flex: 1.5, sortable: true, filterable: true },
  { field: 'status', headerName: 'Status', flex: 0.8, sortable: true, filterable: true, align: 'center', headerAlign: 'center' },
  { field: 'description', headerName: 'Description', flex: 3, sortable: true, filterable: true },
];

const CampaignManager: FC = () => {
  const { user } = useAuth();
  const { items, loadError, reload } = useList<Campaign>(campaignsApi.list);
  const { activeCampaign, setActiveCampaignId, reloadCampaigns } = useCampaignContext();
  const [mineFilter, setMineFilter] = useState(false);
  const theme = useTheme();

  const setActiveExtraAction = (c: Campaign): ReactNode => {
    if (!c.id) return null;
    return (
      <Button
        size="small"
        variant="text"
        startIcon={<OpenInNew fontSize="small" />}
        onClick={() => setActiveCampaignId(c.id ?? null)}
      >
        {activeCampaign?.id === c.id ? 'Active' : 'Set active'}
      </Button>
    );
  };

  return (
    <Stack spacing={3}>
      {user ? (
        activeCampaign ? (
          <CampaignHub campaign={activeCampaign} onChanged={reloadCampaigns} />
        ) : (
          <>
            <Alert severity="info">
              {items && items.length > 0
                ? 'Pick a campaign from the top bar to focus on it, or create a new one below.'
                : 'No active campaign. Create your first campaign to get started.'}
            </Alert>
            <EntityBrowser<Campaign>
              title="My Campaigns"
              items={items}
              loadError={loadError}
              reload={reload}
              mutations={{
                create: campaignsApi.create,
                update: campaignsApi.update,
                remove: campaignsApi.delete,
              }}
              columns={columns as GridColDef[]}
              DetailCard={({ item }) => <CampaignDetailCard item={item} />}
              Editor={({ initial, onChange }) => (
                <Stack spacing={2} sx={{ pt: 0 }}>
                  <TextField
                    label="Name"
                    value={initial.name}
                    onChange={(e) => onChange({ ...initial, name: e.target.value })}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                  <Stack direction="row" spacing={2}>
                    <TextField
                      label="Setting"
                      value={initial.setting}
                      onChange={(e) => onChange({ ...initial, setting: e.target.value })}
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                      label="Status"
                      value={initial.status}
                      onChange={(e) => onChange({ ...initial, status: e.target.value })}
                      sx={{ width: 200 }}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Stack>
                  <TextField
                    label="Description"
                    value={initial.description}
                    onChange={(e) => onChange({ ...initial, description: e.target.value })}
                    fullWidth
                    multiline
                    rows={2}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    label="Notes"
                    value={initial.notes}
                    onChange={(e) => onChange({ ...initial, notes: e.target.value })}
                    fullWidth
                    multiline
                    rows={6}
                    InputLabelProps={{ shrink: true }}
                  />
                </Stack>
              )}
              defaultItem={() => ({ ...defaultCampaign, name: '' })}
              getRowId={(r) => r.id ?? r.name}
              getRowName={(r) => r.name}
              CreateButton={CampaignCreate}
              searchHint="Search your campaigns…"
              emptyTitle="No campaigns yet"
              emptyDescription="Create your first campaign to get started."
              showMineFilter={!!user}
              mineFilter={mineFilter}
              onMineFilterChange={setMineFilter}
              extraActions={setActiveExtraAction}
            />
            {items && items.length > 0 && (
              <Box>
                <Typography variant="overline" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  Or pick an existing one
                </Typography>
                <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                  {items.slice(0, 8).map((c) => (
                    <Card
                      key={c.id}
                      variant="outlined"
                      sx={{ width: 220, position: 'relative' }}
                    >
                      <CardActionArea onClick={() => c.id && setActiveCampaignId(c.id)}>
                        <CardContent>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <MapIcon fontSize="small" color="primary" />
                            <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
                              {c.name}
                            </Typography>
                          </Stack>
                          {c.setting && (
                            <Typography variant="caption" color="text.secondary">
                              {c.setting}
                            </Typography>
                          )}
                          <Chip
                            label={c.status}
                            size="small"
                            sx={{ mt: 1, height: 18, fontSize: '0.65rem', textTransform: 'capitalize' }}
                          />
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  ))}
                </Stack>
              </Box>
            )}
          </>
        )
      ) : (
        <Alert severity="info">
          Sign in (top right) to create and manage your own campaigns. The
          Tales of Avandria example world is below.
        </Alert>
      )}
      <Box>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
          <AutoStories fontSize="small" sx={{ color: 'primary.main' }} />
          <Typography variant="h5">Browse example world</Typography>
        </Stack>
        <AvandriaExample />
      </Box>
    </Stack>
  );
};

export default CampaignManager;

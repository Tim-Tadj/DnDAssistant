import {
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  Alert,
} from '@mui/material';
import React, { FC, Suspense, useCallback, useEffect, useState } from 'react';
import { Add, Close, Delete, Edit, Save } from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import CampaignMap from './campaign-map';

import MapOfAvandria from '../../res/talesOfAvandria/Avandria.png';
import MapProperties from '../../res/talesOfAvandria/Avandria.json';
import AvandriaLore from '../../res/talesOfAvandria/AvandriaLore.json';
import RenderJsonRecursive from '../shared/render-json-recursive';
import { Campaign, defaultCampaign } from '../types/Campaign';
import { campaignsApi } from '../api/campaigns';
import { useAuth } from '../auth/AuthContext';

const LORE = 'Lore';
const MAP = 'Map';
const ADVENTURE_LOG = 'Adventure Log';

const CampaignsPanel: FC = () => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [edited, setEdited] = useState<Campaign | null>(null);
  const [mode, setMode] = useState<'view' | 'edit' | 'create'>('view');
  const [selected, setSelected] = useState<Campaign | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);

  const reload = useCallback(async () => {
    setLoadError(null);
    try {
      const data = await campaignsApi.list();
      setCampaigns(data);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
      setCampaigns([]);
    }
  }, []);

  useEffect(() => {
    if (user) void reload();
  }, [user, reload]);

  if (!user) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        Sign in to create and manage your own campaigns.
      </Alert>
    );
  }

  const onStartCreate = () => {
    setEdited({ ...(defaultCampaign as Campaign), owner_user_id: user.id });
    setMode('create');
  };
  const onStartEdit = (c: Campaign) => {
    setEdited({ ...c });
    setMode('edit');
  };
  const close = () => {
    setSelected(null);
    setEdited(null);
    setMode('view');
    setSubmitError(null);
  };
  const onSave = async () => {
    if (!edited) return;
    if (!edited.name.trim()) {
      setSubmitError('Name is required');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      if (mode === 'create') {
        await campaignsApi.create(edited);
        setToastOpen(true);
        close();
      } else {
        if (!edited.id) {
          setSubmitError('Cannot save: missing id');
          return;
        }
        await campaignsApi.update(edited.id, edited);
        setToastOpen(true);
        close();
      }
      void reload();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };
  const onDelete = async () => {
    if (!selected || !selected.id) return;
    try {
      await campaignsApi.delete(selected.id);
      setToastOpen(true);
      setConfirmDelete(false);
      close();
      void reload();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : String(e));
    }
  };

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Name', flex: 2 },
    { field: 'setting', headerName: 'Setting', flex: 1 },
    { field: 'status', headerName: 'Status', flex: 1 },
    {
      field: 'description',
      headerName: 'Description',
      flex: 3,
    },
  ];

  return (
    <Box>
      {loadError && (
        <Alert severity="error" sx={{ m: 2 }}>
          Failed to load campaigns: {loadError}
        </Alert>
      )}
      {campaigns === null && !loadError && (
        <Skeleton animation="wave" variant="rounded" height={300} sx={{ m: 2 }} />
      )}
      {campaigns !== null && (
        <Paper sx={{ p: 2, m: 2 }}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="h5">My Campaigns</Typography>
            <Button variant="outlined" startIcon={<Add />} onClick={onStartCreate}>
              New Campaign
            </Button>
          </Stack>
          {campaigns.length === 0 ? (
            <Typography color="text.secondary">
              You have no campaigns yet. Click &quot;New Campaign&quot; to start one.
            </Typography>
          ) : (
            <Box sx={{ width: '100%' }}>
              <DataGrid
                rows={campaigns}
                columns={columns}
                onRowClick={(p) => setSelected(p.row as Campaign)}
                initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
                pageSizeOptions={[10, 25, 50]}
                getRowId={(row) => (row as Campaign).id ?? ''}
                getRowHeight={() => 'auto'}
                autoHeight
              />
            </Box>
          )}
        </Paper>
      )}

      <Dialog
        open={mode === 'create' || mode === 'edit'}
        onClose={() => !submitting && close()}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          {mode === 'create' ? 'New Campaign' : 'Edit Campaign'}
        </DialogTitle>
        <DialogContent>
          {submitError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {submitError}
            </Alert>
          )}
          {edited && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Name"
                value={edited.name}
                onChange={(e) => setEdited({ ...edited, name: e.target.value })}
                fullWidth
                size="small"
              />
              <TextField
                label="Setting"
                value={edited.setting}
                onChange={(e) => setEdited({ ...edited, setting: e.target.value })}
                fullWidth
                size="small"
                helperText="e.g. Forgotten Realms, Eberron, homebrew"
              />
              <TextField
                label="Status"
                value={edited.status}
                onChange={(e) => setEdited({ ...edited, status: e.target.value })}
                fullWidth
                size="small"
                helperText="active / paused / completed"
              />
              <TextField
                label="Description"
                value={edited.description}
                onChange={(e) =>
                  setEdited({ ...edited, description: e.target.value })
                }
                fullWidth
                size="small"
                multiline
                rows={2}
              />
              <TextField
                label="Notes"
                value={edited.notes}
                onChange={(e) => setEdited({ ...edited, notes: e.target.value })}
                fullWidth
                size="small"
                multiline
                rows={4}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={close} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={onSave}
            disabled={submitting}
          >
            {submitting ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={selected !== null && mode === 'view'}
        onClose={close}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">{selected?.name}</Typography>
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                startIcon={<Edit />}
                onClick={() => selected && onStartEdit(selected)}
              >
                Edit
              </Button>
              <Button
                size="small"
                startIcon={<Delete />}
                color="error"
                onClick={() => setConfirmDelete(true)}
              >
                Delete
              </Button>
              <IconButton onClick={close}>
                <Close />
              </IconButton>
            </Stack>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {selected && (
            <Stack spacing={1}>
              <Typography variant="body2">
                {selected.setting} · {selected.status}
              </Typography>
              {selected.description && (
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {selected.description}
                </Typography>
              )}
              {selected.notes && (
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {selected.notes}
                </Typography>
              )}
            </Stack>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <DialogTitle>Delete campaign?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete &quot;{selected?.name}&quot; and all of
            its data. This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <Button color="error" onClick={onDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={toastOpen}
        autoHideDuration={3000}
        onClose={() => setToastOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="success" onClose={() => setToastOpen(false)}>
          Campaign saved
        </Alert>
      </Snackbar>
    </Box>
  );
};

const CampaignManager: FC = () => {
  const [openTab, setOpenTab] = useState<string>(MAP);

  return (
    <Container maxWidth="xl">
      <Typography variant="h4">Campaign</Typography>
      <Divider orientation="horizontal" sx={{ mb: '1%', mt: '0.5%' }} />
      <Stack spacing={1} direction="column" textAlign="center">
        <Paper sx={{ p: 1, m: 2 }}>
          <Typography variant="h4">Tales of Avandria</Typography>
          <Tabs
            indicatorColor="secondary"
            variant="fullWidth"
            value={openTab}
            onChange={(_e, newValue) => setOpenTab(newValue)}
          >
            <Tab label={LORE} value={LORE} />
            <Tab label={MAP} value={MAP} />
            <Tab label={ADVENTURE_LOG} value={ADVENTURE_LOG} />
          </Tabs>
        </Paper>
        <Paper sx={{ p: 1, m: 2 }}>
          <Box sx={{ p: 2, textAlign: 'left' }}>
            {openTab === LORE && (
              <Suspense
                fallback={<Skeleton animation="wave" variant="rounded" />}
              >
                <RenderJsonRecursive instance={AvandriaLore} />
              </Suspense>
            )}
            {openTab === MAP && (
              <CampaignMap
                campaignMap={MapOfAvandria}
                mapProperties={MapProperties}
              />
            )}
            {openTab === ADVENTURE_LOG && (
              <Typography>{ADVENTURE_LOG}</Typography>
            )}
          </Box>
        </Paper>
        <CampaignsPanel />
      </Stack>
    </Container>
  );
};

export default CampaignManager;

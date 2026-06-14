import * as React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { Close, Delete, Edit, Save } from '@mui/icons-material';
import { DataGrid, GridColDef, GridRowParams } from '@mui/x-data-grid';
import {
  armourColumnDescriptor,
  gearColumnDescriptor,
  weaponColumnDescriptor,
} from './gear-column-descriptors';
import {
  Armour,
  Gear,
  GearItem,
  GearKind,
  Weapon,
} from '../types/Gear';
import CreateGear from './create-gear';
import { gearApi } from '../api/gear';
import GearEditor from './gear-editor';
import WeaponEditor from './weapon-editor';
import ArmourEditor from './armour-editor';

type Section = 'Weapons' | 'Armour' | 'Gear';
type SectionsType = { [id: string]: { rows: GearItem[], columns: GridColDef[] } };
type Mode = 'view' | 'edit';

const KIND_BY_SECTION: Record<Section, GearKind> = {
  Weapons: 'weapon',
  Armour: 'armour',
  Gear: 'gear',
};

const GearItemView: React.FC<{ item: GearItem }> = ({ item }) => {
  return (
    <Card sx={{ m: 2 }}>
      <CardContent>
        <Stack spacing={1}>
          <Typography variant="h4">{item.name}</Typography>
          <Stack direction="row" spacing={3} flexWrap="wrap">
            <Typography variant="subtitle1">{`Kind: ${item.kind}`}</Typography>
            <Typography variant="subtitle1">{`Type: ${item.type}`}</Typography>
            <Typography variant="subtitle1">{`Cost: ${item.cost}`}</Typography>
            <Typography variant="subtitle1">{`Weight: ${item.weight}`}</Typography>
          </Stack>
          {item.kind === 'weapon' && (
            <Stack direction="row" spacing={3} flexWrap="wrap">
              <Typography variant="subtitle1">{`Damage: ${item.Damage ?? ''}`}</Typography>
              <Typography variant="subtitle1">{`Properties: ${item.Properties ?? ''}`}</Typography>
            </Stack>
          )}
          {item.kind === 'armour' && (
            <Stack direction="row" spacing={3} flexWrap="wrap">
              <Typography variant="subtitle1">{`AC: ${item.AC ?? ''}`}</Typography>
              <Typography variant="subtitle1">{`Strength: ${item.Strength ?? ''}`}</Typography>
              <Typography variant="subtitle1">{`Stealth: ${item.Stealth ?? ''}`}</Typography>
            </Stack>
          )}
          {item.description && (
            <>
              <Divider sx={{ my: 1 }} />
              <Typography variant="h6">Description</Typography>
              <Typography variant="body1">{item.description}</Typography>
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default function GearTable() {
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [activeSection, setActiveSection] = React.useState<Section>('Weapons');
  const [items, setItems] = React.useState<GearItem[] | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<GearItem | null>(null);
  const [mode, setMode] = React.useState<Mode>('view');
  const [edited, setEdited] = React.useState<GearItem | null>(null);
  const [editedJson, setEditedJson] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [toastOpen, setToastOpen] = React.useState(false);

  const reload = React.useCallback(async () => {
    setLoadError(null);
    try {
      const data = await gearApi.list();
      setItems(data);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
      setItems([]);
    }
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const rowsBySection: SectionsType = React.useMemo(() => {
    const byKind: Record<GearKind, GearItem[]> = {
      weapon: [],
      armour: [],
      gear: [],
    };
    for (const item of items ?? []) {
      byKind[item.kind].push(item);
    }
    return {
      Weapons: { rows: byKind.weapon, columns: weaponColumnDescriptor as GridColDef[] },
      Armour: { rows: byKind.armour, columns: armourColumnDescriptor as GridColDef[] },
      Gear: { rows: byKind.gear, columns: gearColumnDescriptor as GridColDef[] },
    };
  }, [items]);

  const filter = (row: GearItem) =>
    searchQuery
      .split('+')
      .some((query) => row.name.toLowerCase().includes(query.toLowerCase()));

  const closeDialog = () => {
    setSelected(null);
    setMode('view');
    setEdited(null);
    setEditedJson('');
    setSaveError(null);
  };

  const onRowClick = (params: GridRowParams) => {
    setSelected(params.row as GearItem);
    setMode('view');
  };

  const onStartEdit = () => {
    if (selected) {
      setEdited({ ...selected });
      setMode('edit');
      setSaveError(null);
    }
  };

  const onCancelEdit = () => {
    setMode('view');
    setEdited(null);
    setEditedJson('');
    setSaveError(null);
  };

  const onSaveEdit = async () => {
    if (!edited || edited.id === undefined) {
      setSaveError('Cannot save: missing id');
      return;
    }
    if (!edited.name.trim()) {
      setSaveError('Name is required');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await gearApi.update(edited.id, edited);
      setSelected(updated);
      setMode('view');
      setEdited(null);
      setToastOpen(true);
      void reload();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const onConfirmDelete = async () => {
    if (!selected || selected.id === undefined) {
      setConfirmDelete(false);
      return;
    }
    setDeleting(true);
    try {
      await gearApi.delete(selected.id);
      setToastOpen(true);
      setConfirmDelete(false);
      closeDialog();
      void reload();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setDeleting(false);
    }
  };

  const renderEditor = (item: GearItem) => {
    if (item.kind === 'weapon') {
      return (
        <WeaponEditor
          onUpdateGear={setEditedJson}
          onChange={(w) =>
            setEdited({
              ...item,
              name: w.name,
              cost: w.cost,
              weight: w.weight,
              type: w.type,
              Damage: w.damage,
              Properties: w.properties,
              description: w.description,
            })
          }
        />
      );
    }
    if (item.kind === 'armour') {
      return (
        <ArmourEditor
          onUpdateGear={setEditedJson}
          onChange={(a) =>
            setEdited({
              ...item,
              name: a.name,
              cost: a.cost,
              weight: a.weight,
              type: a.type,
              AC: a.AC,
              Strength: a.strength,
              Stealth: a.stealth,
              description: a.description,
            })
          }
        />
      );
    }
    return (
      <GearEditor
        onUpdateGear={setEditedJson}
        onChange={(g) =>
          setEdited({
            ...item,
            name: g.name,
            cost: g.cost,
            weight: g.weight,
            type: g.type,
            description: g.description,
          })
        }
      />
    );
  };

  return (
    <Container maxWidth="xl">
      <Stack direction="row" justifyContent="space-between">
        <Typography variant="h4">Gear</Typography>
        <CreateGear onCreated={reload} />
      </Stack>
      <Divider orientation="horizontal" sx={{ mb: '1%', mt: '0.5%' }} />
      <TextField
        variant="filled"
        fullWidth
        sx={{ marginBottom: 2 }}
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        label="Search Armaments"
        size="small"
      />
      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load gear: {loadError}
        </Alert>
      )}
      {items === null && !loadError && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      )}
      {items !== null && (
        <Paper sx={{ p: 3 }}>
          <Stack direction="column">
            <Tabs
              value={activeSection}
              onChange={(_event, value) => setActiveSection(value)}
              aria-label="armaments-tabs"
            >
              {Object.keys(rowsBySection).map((title) => (
                <Tab key={title} label={title} value={title} />
              ))}
            </Tabs>
            <Paper sx={{ m: 2 }}>
              <DataGrid
                rows={rowsBySection[activeSection].rows.filter(filter)}
                columns={rowsBySection[activeSection].columns}
                onRowClick={onRowClick}
                initialState={{
                  pagination: {
                    paginationModel: { pageSize: 25 },
                  },
                }}
                pageSizeOptions={[10, 25, 50]}
                getRowId={(row) =>
                  row.id !== undefined
                    ? String(row.id)
                    : `${(row as GearItem).name}|${KIND_BY_SECTION[activeSection]}`
                }
                sx={{ width: '100%' }}
                getDetailPanelContent={(params) =>
                  params.row.description ? (
                    <Box sx={{ p: 2 }}>{params.row.description}</Box>
                  ) : null
                }
                getRowHeight={() => 'auto'}
              />
            </Paper>
          </Stack>
        </Paper>
      )}
      <Dialog
        open={selected !== null}
        onClose={closeDialog}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h5">
              {mode === 'edit' ? `Edit ${selected?.kind}` : 'Gear View'}
            </Typography>
            <Stack direction="row" spacing={1}>
              {mode === 'view' && selected?.id !== undefined && (
                <>
                  <Button
                    startIcon={<Edit />}
                    onClick={onStartEdit}
                    disabled={selected.provenance === 'srd' || selected.provenance === 'derived'}
                    title={
                      selected.provenance !== 'homebrew'
                        ? 'Only homebrew entries can be edited'
                        : 'Edit'
                    }
                  >
                    Edit
                  </Button>
                  <Button
                    startIcon={<Delete />}
                    color="error"
                    onClick={() => setConfirmDelete(true)}
                    disabled={selected.provenance !== 'homebrew'}
                    title={
                      selected.provenance !== 'homebrew'
                        ? 'Only homebrew entries can be deleted'
                        : 'Delete'
                    }
                  >
                    Delete
                  </Button>
                </>
              )}
              {mode === 'edit' && (
                <>
                  <Button
                    startIcon={<Save />}
                    variant="contained"
                    onClick={onSaveEdit}
                    disabled={saving}
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                  <Button onClick={onCancelEdit} disabled={saving}>
                    Cancel
                  </Button>
                </>
              )}
              <IconButton onClick={closeDialog}>
                <Close />
              </IconButton>
            </Stack>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {saveError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {saveError}
            </Alert>
          )}
          {mode === 'view' && selected && <GearItemView item={selected} />}
          {mode === 'edit' && edited && (
            <Stack direction="row" spacing={2} useFlexGap>
              <Box flexGrow={1}>{renderEditor(edited)}</Box>
              <Stack spacing={1} flexGrow={1}>
                <Alert severity="info">JSON preview (also sent to the API on Save)</Alert>
                <TextField
                  fullWidth
                  value={editedJson}
                  disabled
                  inputProps={{ readOnly: true }}
                  multiline
                  sx={{ flex: 1, flexDirection: 'row' }}
                />
              </Stack>
            </Stack>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={confirmDelete}
        onClose={() => !deleting && setConfirmDelete(false)}
      >
        <DialogTitle>Delete gear entry?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete &quot;{selected?.name}&quot; from the database.
            This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button color="error" onClick={onConfirmDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
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
          {mode === 'edit' ? 'Gear updated' : 'Gear deleted'}
        </Alert>
      </Snackbar>
    </Container>
  );
}

// Re-export the legacy types so other modules keep importing them from here.
export type { Armour, Gear, Weapon };

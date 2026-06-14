import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
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
  TextField,
  Typography,
} from '@mui/material';
import { Close, Delete, Edit, Save } from '@mui/icons-material';
import { DataGrid, GridRowParams } from '@mui/x-data-grid';
import { Spell } from '../types/Spell';
import PageIterator from '../shared/page-iterator';
import SpellCard from '../spells/spell-card';
import SpellEditor from './spell-editor';
import { spellColumnDescriptor } from './spell-column-descriptor';
import CreateSpell from './create-spell';
import { spellsApi } from '../api/spells';

type Mode = 'view' | 'edit';

export default function SpellTable() {
  const [spells, setSpells] = useState<Spell[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSpell, setSelectedSpell] = useState<Spell | null>(null);
  const [spellIndex, setSpellIndex] = useState<number>(0);
  const [mode, setMode] = useState<Mode>('view');
  const [editedSpell, setEditedSpell] = useState<Spell | null>(null);
  const [editedJson, setEditedJson] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);

  const reload = useCallback(async () => {
    setLoadError(null);
    try {
      const data = await spellsApi.list();
      setSpells(data);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
      setSpells([]);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const filteredSpells = (spells ?? []).filter((spell) =>
    searchQuery
      .split('+')
      .some((query) => spell.name.toLowerCase().includes(query.toLowerCase()))
  );

  const onViewSpell = useCallback(
    (params: GridRowParams) => {
      setSelectedSpell(params.row as Spell);
      setSpellIndex(
        filteredSpells.findIndex((spell) => spell.name === params.row.name)
      );
      setMode('view');
    },
    [filteredSpells, setSelectedSpell, setSpellIndex]
  );

  const onViewNextSpell = useCallback(
    (newPage: number) => {
      setSpellIndex(newPage);
      setSelectedSpell(filteredSpells[newPage]);
      setMode('view');
    },
    [filteredSpells, setSelectedSpell]
  );

  const closeDialog = () => {
    setSelectedSpell(null);
    setMode('view');
    setEditedSpell(null);
    setEditedJson('');
    setSaveError(null);
  };

  const onStartEdit = () => {
    if (selectedSpell) {
      setEditedSpell({ ...selectedSpell });
      setMode('edit');
      setSaveError(null);
    }
  };

  const onCancelEdit = () => {
    setMode('view');
    setEditedSpell(null);
    setEditedJson('');
    setSaveError(null);
  };

  const onSaveEdit = async () => {
    if (!editedSpell || editedSpell.id === undefined) {
      setSaveError('Cannot save: missing id');
      return;
    }
    if (!editedSpell.name.trim()) {
      setSaveError('Name is required');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await spellsApi.update(editedSpell.id, editedSpell);
      setSelectedSpell(updated);
      setMode('view');
      setEditedSpell(null);
      setToastOpen(true);
      void reload();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const onConfirmDelete = async () => {
    if (!selectedSpell || selectedSpell.id === undefined) {
      setConfirmDelete(false);
      return;
    }
    setDeleting(true);
    try {
      await spellsApi.delete(selectedSpell.id);
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

  return (
    <Container maxWidth="xl">
      <Stack direction="row" justifyContent="space-between">
        <Typography variant="h4">Spells</Typography>
        <CreateSpell onCreated={reload} />
      </Stack>
      <Divider orientation="horizontal" sx={{ mb: '1%', mt: '0.5%' }} />
      <TextField
        variant="filled"
        fullWidth
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        label="Search Spells"
        size="small"
      />
      {loadError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          Failed to load spells: {loadError}
        </Alert>
      )}
      {spells === null && !loadError && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      )}
      {spells !== null && (
        <Paper sx={{ margin: 1 }}>
          <DataGrid
            rows={filteredSpells}
            columns={spellColumnDescriptor}
            onRowClick={onViewSpell}
            initialState={{
              pagination: {
                paginationModel: { pageSize: 25 },
              },
            }}
            pageSizeOptions={[10, 25, 50]}
            getRowId={(row) => (row as Spell).name}
          />
        </Paper>
      )}
      <Dialog
        open={selectedSpell !== null}
        onClose={closeDialog}
        maxWidth="xl"
        fullWidth
      >
        <DialogTitle>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h5">
              {mode === 'edit' ? 'Edit Spell' : 'Spell View'}
            </Typography>
            <PageIterator
              page={spellIndex}
              maxLength={filteredSpells.length}
              pageSetter={onViewNextSpell}
            />
            <Stack direction="row" spacing={1}>
              {mode === 'view' && selectedSpell?.id !== undefined && (
                <>
                  <Button
                    startIcon={<Edit />}
                    onClick={onStartEdit}
                    disabled={selectedSpell.provenance === 'srd'}
                    title={
                      selectedSpell.provenance === 'srd'
                        ? 'SRD content is read-only'
                        : 'Edit'
                    }
                  >
                    Edit
                  </Button>
                  <Button
                    startIcon={<Delete />}
                    color="error"
                    onClick={() => setConfirmDelete(true)}
                    disabled={selectedSpell.provenance === 'srd'}
                    title={
                      selectedSpell.provenance === 'srd'
                        ? 'SRD content is read-only'
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
          {mode === 'view' && selectedSpell && (
            <Container sx={{ justifyContent: 'center', alignContent: 'center' }}>
              <SpellCard spell={selectedSpell} />
            </Container>
          )}
          {mode === 'edit' && editedSpell && (
            <Stack direction="row" spacing={2} useFlexGap>
              <Box flexGrow={1}>
                <SpellEditor
                  initial={editedSpell}
                  onUpdateGear={setEditedJson}
                  onChange={setEditedSpell}
                />
              </Box>
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
        <DialogTitle>Delete spell?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete &quot;{selectedSpell?.name}&quot; from the
            database. This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            color="error"
            onClick={onConfirmDelete}
            disabled={deleting}
          >
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
          {mode === 'edit' ? 'Spell updated' : 'Spell deleted'}
        </Alert>
      </Snackbar>
    </Container>
  );
}

import React, { FC, useCallback, useEffect, useState } from 'react';
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
import { Monster } from '../types/Monster';
import PageIterator from '../shared/page-iterator';
import MonsterCard from './monster-card';
import MonsterEditor from './monster-editor';
import { monsterColumnDescriptor } from './monster-column-descriptor';
import CreateMonster from './create-monster';
import { monstersApi } from '../api/monsters';

type Mode = 'view' | 'edit';

const MonsterTable: FC<{
  onRowClick?: (params: GridRowParams) => void;
  props?: object;
}> = ({ onRowClick, props = {} }) => {
  const [monsters, setMonsters] = useState<Monster[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMonster, setSelectedMonster] = useState<Monster | null>(null);
  const [monsterIndex, setMonsterIndex] = useState<number>(0);
  const [mode, setMode] = useState<Mode>('view');
  const [editedMonster, setEditedMonster] = useState<Monster | null>(null);
  const [editedJson, setEditedJson] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);

  const reload = useCallback(async () => {
    setLoadError(null);
    try {
      const data = await monstersApi.list();
      setMonsters(data);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
      setMonsters([]);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const filteredMonsters = (monsters ?? []).filter((monster) =>
    searchQuery
      .split('+')
      .some((query) => monster.name.toLowerCase().includes(query.toLowerCase()))
  );

  const onViewMonster = useCallback(
    (params: GridRowParams) => {
      setSelectedMonster(params.row as Monster);
      setMonsterIndex(
        filteredMonsters.findIndex(
          (monster) => monster.name === params.row.name
        )
      );
      setMode('view');
    },
    [filteredMonsters, setSelectedMonster, setMonsterIndex]
  );

  const onViewNextMonster = useCallback(
    (newPage: number) => {
      setMonsterIndex(newPage);
      setSelectedMonster(filteredMonsters[newPage]);
      setMode('view');
    },
    [filteredMonsters, setSelectedMonster]
  );

  const closeDialog = () => {
    setSelectedMonster(null);
    setMode('view');
    setEditedMonster(null);
    setEditedJson('');
    setSaveError(null);
  };

  const onStartEdit = () => {
    if (selectedMonster) {
      setEditedMonster({ ...selectedMonster });
      setMode('edit');
      setSaveError(null);
    }
  };

  const onCancelEdit = () => {
    setMode('view');
    setEditedMonster(null);
    setEditedJson('');
    setSaveError(null);
  };

  const onSaveEdit = async () => {
    if (!editedMonster || editedMonster.id === undefined) {
      setSaveError('Cannot save: missing id');
      return;
    }
    if (!editedMonster.name.trim()) {
      setSaveError('Name is required');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await monstersApi.update(editedMonster.id, editedMonster);
      setSelectedMonster(updated);
      setMode('view');
      setEditedMonster(null);
      setToastOpen(true);
      void reload();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const onConfirmDelete = async () => {
    if (!selectedMonster || selectedMonster.id === undefined) {
      setConfirmDelete(false);
      return;
    }
    setDeleting(true);
    try {
      await monstersApi.delete(selectedMonster.id);
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
        <Typography variant="h4">Monsters</Typography>
        <CreateMonster onCreated={reload} />
      </Stack>
      <Divider orientation="horizontal" sx={{ mb: '1%', mt: '0.5%' }} />
      <TextField
        variant="filled"
        fullWidth
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        label="Search Monsters"
        size="small"
      />
      {loadError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          Failed to load monsters: {loadError}
        </Alert>
      )}
      {monsters === null && !loadError && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      )}
      {monsters !== null && (
        <Paper sx={{ margin: 1 }}>
          <DataGrid
            rows={filteredMonsters}
            columns={monsterColumnDescriptor}
            onRowClick={onRowClick ?? onViewMonster}
            initialState={{
              pagination: {
                paginationModel: { pageSize: 25 },
              },
            }}
            pageSizeOptions={[10, 25, 50]}
            getRowId={(row) => (row as Monster).name}
            {...props}
          />
        </Paper>
      )}
      <Dialog
        open={selectedMonster !== null}
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
              {mode === 'edit' ? 'Edit Monster' : 'Monster View'}
            </Typography>
            <PageIterator
              page={monsterIndex}
              maxLength={filteredMonsters.length}
              pageSetter={onViewNextMonster}
            />
            <Stack direction="row" spacing={1}>
              {mode === 'view' && selectedMonster?.id !== undefined && (
                <>
                  <Button
                    startIcon={<Edit />}
                    onClick={onStartEdit}
                    disabled={selectedMonster.provenance === 'srd'}
                    title={
                      selectedMonster.provenance === 'srd'
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
                    disabled={selectedMonster.provenance === 'srd'}
                    title={
                      selectedMonster.provenance === 'srd'
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
          {mode === 'view' && selectedMonster && (
            <Container sx={{ justifyContent: 'center', alignContent: 'center' }}>
              <MonsterCard monster={selectedMonster} />
            </Container>
          )}
          {mode === 'edit' && editedMonster && (
            <Stack direction="row" spacing={2} useFlexGap>
              <Box flexGrow={1}>
                <MonsterEditor
                  initial={editedMonster}
                  onUpdateGear={setEditedJson}
                  onChange={setEditedMonster}
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
        <DialogTitle>Delete monster?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete &quot;{selectedMonster?.name}&quot; from the
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
          {mode === 'edit' ? 'Monster updated' : 'Monster deleted'}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default MonsterTable;

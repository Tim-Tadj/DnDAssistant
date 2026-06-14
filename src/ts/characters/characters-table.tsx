import React, { FC, useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Autocomplete,
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
import { Close, Delete, Edit, Save, Add } from '@mui/icons-material';
import { DataGrid, GridColDef, GridRowParams } from '@mui/x-data-grid';
import { charactersApi, referenceApi } from '../api/characters';
import { Character, DndClass, Race, defaultCharacter } from '../types/Character';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';

const ABILITIES: Array<{ key: keyof Character; label: string }> = [
  { key: 'str', label: 'STR' },
  { key: 'dex', label: 'DEX' },
  { key: 'con', label: 'CON' },
  { key: 'int_', label: 'INT' },
  { key: 'wis', label: 'WIS' },
  { key: 'cha', label: 'CHA' },
];

const CharacterEditor: FC<{
  initial?: Character;
  races: Race[];
  classes: DndClass[];
  onChange?: (c: Character) => void;
}> = ({ initial, races, classes, onChange }) => {
  const [c, setC] = useState<Character>(initial ?? (defaultCharacter as Character));
  useEffect(() => {
    onChange?.(c);
  }, [c, onChange]);

  const set = <K extends keyof Character>(k: K, v: Character[K]) => {
    setC((prev) => ({ ...prev, [k]: v }));
  };

  return (
    <Stack spacing={2} sx={{ width: '100%' }}>
      <Stack direction="row" spacing={2}>
        <TextField
          label="Name"
          value={c.name}
          onChange={(e) => set('name', e.target.value)}
          fullWidth
          size="small"
        />
        <TextField
          label="Level"
          type="number"
          value={c.level}
          onChange={(e) => set('level', Number(e.target.value) || 1)}
          sx={{ width: 100 }}
          size="small"
        />
        <TextField
          label="Alignment"
          value={c.alignment}
          onChange={(e) => set('alignment', e.target.value)}
          sx={{ width: 180 }}
          size="small"
        />
      </Stack>
      <Stack direction="row" spacing={2}>
        <Autocomplete
          sx={{ flex: 1 }}
          size="small"
          options={races}
          getOptionLabel={(o) => o.name}
          value={races.find((r) => r.id === c.race_id) ?? null}
          onChange={(_e, v) => v && set('race_id', v.id)}
          renderInput={(p) => <TextField {...p} label="Race" />}
        />
        <Autocomplete
          sx={{ flex: 1 }}
          size="small"
          options={classes}
          getOptionLabel={(o) => o.name}
          value={classes.find((c2) => c2.id === c.class_id) ?? null}
          onChange={(_e, v) => v && set('class_id', v.id)}
          renderInput={(p) => <TextField {...p} label="Class" />}
        />
      </Stack>
      <Typography variant="subtitle2">Ability scores</Typography>
      <Stack direction="row" spacing={1}>
        {ABILITIES.map(({ key, label }) => (
          <TextField
            key={key}
            label={label}
            type="number"
            value={c[key] as number}
            onChange={(e) => set(key, Number(e.target.value) || 10)}
            sx={{ width: 90 }}
            size="small"
          />
        ))}
      </Stack>
      <Stack direction="row" spacing={2}>
        <TextField
          label="HP max"
          type="number"
          value={c.hp_max}
          onChange={(e) => set('hp_max', Number(e.target.value) || 0)}
          sx={{ width: 120 }}
          size="small"
        />
        <TextField
          label="AC"
          type="number"
          value={c.ac}
          onChange={(e) => set('ac', Number(e.target.value) || 0)}
          sx={{ width: 100 }}
          size="small"
        />
        <TextField
          label="Background"
          value={c.background}
          onChange={(e) => set('background', e.target.value)}
          fullWidth
          size="small"
        />
      </Stack>
      <TextField
        label="Notes"
        value={c.notes}
        onChange={(e) => set('notes', e.target.value)}
        multiline
        rows={3}
        fullWidth
        size="small"
      />
    </Stack>
  );
};

const CharactersTable: FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [characters, setCharacters] = useState<Character[] | null>(null);
  const [races, setRaces] = useState<Race[]>([]);
  const [classes, setClasses] = useState<DndClass[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selected, setSelected] = useState<Character | null>(null);
  const [mode, setMode] = useState<'view' | 'edit' | 'create'>('view');
  const [edited, setEdited] = useState<Character | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);

  const reload = useCallback(async () => {
    setLoadError(null);
    try {
      const [c, r, cl] = await Promise.all([
        charactersApi.list(),
        referenceApi.listRaces(),
        referenceApi.listClasses(),
      ]);
      setCharacters(c);
      setRaces(r);
      setClasses(cl);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
      setCharacters([]);
    }
  }, []);

  useEffect(() => {
    if (user) void reload();
  }, [user, reload]);

  if (!user) {
    return (
      <Container maxWidth="xl">
        <Typography variant="h4">Characters</Typography>
        <Divider sx={{ my: 1 }} />
        <Alert severity="info">
          Sign in to create and manage your characters.
        </Alert>
      </Container>
    );
  }

  const onStartCreate = () => {
    setEdited({
      ...(defaultCharacter as Character),
      owner_user_id: user.id,
    });
    setMode('create');
  };

  const onStartEdit = (c: Character) => {
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
        await charactersApi.create(edited);
        setToastOpen(true);
        close();
      } else {
        await charactersApi.update(edited.id, edited);
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
    if (!selected) return;
    try {
      await charactersApi.delete(selected.id);
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
    {
      field: 'race_id',
      headerName: 'Race',
      flex: 1,
      valueGetter: (params) => races.find((r) => r.id === params.value)?.name ?? '?',
    },
    {
      field: 'class_id',
      headerName: 'Class',
      flex: 1,
      valueGetter: (params) => classes.find((c) => c.id === params.value)?.name ?? '?',
    },
    { field: 'level', headerName: 'Lvl', flex: 0.5 },
    { field: 'hp_max', headerName: 'HP', flex: 0.5 },
    { field: 'ac', headerName: 'AC', flex: 0.5 },
  ];

  return (
    <Container maxWidth="xl">
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h4">Characters</Typography>
        <Button
          variant="outlined"
          startIcon={<Add />}
          onClick={onStartCreate}
        >
          Create Character
        </Button>
      </Stack>
      <Divider sx={{ mb: '1%', mt: '0.5%' }} />
      {loadError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          Failed to load: {loadError}
        </Alert>
      )}
      {characters === null && !loadError && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      )}
      {characters !== null && (
        <Paper sx={{ m: 1 }}>
          <DataGrid
            rows={characters}
            columns={columns}
            onRowClick={(p: GridRowParams) => setSelected(p.row as Character)}
            initialState={{
              pagination: { paginationModel: { pageSize: 25 } },
            }}
            pageSizeOptions={[10, 25, 50]}
            getRowId={(row) => (row as Character).id}
            sx={{ width: '100%' }}
            getRowHeight={() => 'auto'}
          />
        </Paper>
      )}
      <Dialog
        open={mode === 'create' || mode === 'edit'}
        onClose={() => !submitting && close()}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>{mode === 'create' ? 'New Character' : 'Edit Character'}</DialogTitle>
        <DialogContent>
          {submitError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {submitError}
            </Alert>
          )}
          {edited && (
            <CharacterEditor
              initial={edited}
              races={races}
              classes={classes}
              onChange={setEdited}
            />
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
                Lvl {selected.level}{' '}
                {races.find((r) => r.id === selected.race_id)?.name ?? '?'}{' '}
                {classes.find((c) => c.id === selected.class_id)?.name ?? '?'} ·{' '}
                {selected.alignment}
              </Typography>
              <Stack direction="row" spacing={1}>
                <Typography variant="body2">STR {selected.str}</Typography>
                <Typography variant="body2">DEX {selected.dex}</Typography>
                <Typography variant="body2">CON {selected.con}</Typography>
                <Typography variant="body2">INT {selected.int_}</Typography>
                <Typography variant="body2">WIS {selected.wis}</Typography>
                <Typography variant="body2">CHA {selected.cha}</Typography>
              </Stack>
              <Typography variant="body2">
                HP {selected.hp_max} · AC {selected.ac}
                {selected.background ? ` · ${selected.background}` : ''}
              </Typography>
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
        <DialogTitle>Delete character?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete &quot;{selected?.name}&quot;. This cannot be
            undone.
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
          Character saved
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default CharactersTable;

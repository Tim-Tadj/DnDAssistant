/**
 * Characters page.
 *
 * Phase 7: uses the shared EntityBrowser shell. The detail view is
 * CharacterCard. The create flow embeds the existing CharacterEditor.
 */

import React, { FC, useEffect, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { Add, Save } from '@mui/icons-material';
import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import { GridColDef } from '@mui/x-data-grid';
import {
  Character,
  DndClass,
  Race,
  defaultCharacter,
} from '../types/Character';
import { charactersApi, referenceApi } from '../api/characters';
import { useList } from '../shared/useList';
import { EntityBrowser } from '../shared/EntityBrowser';
import CharacterCard from '../shared/CharacterCard';
import { useToast } from '../shared/ToastProvider';
import { useAuth } from '../auth/AuthContext';

const ABILITIES: Array<{ key: keyof Character; label: string }> = [
  { key: 'str', label: 'STR' },
  { key: 'dex', label: 'DEX' },
  { key: 'con', label: 'CON' },
  { key: 'int_', label: 'INT' },
  { key: 'wis', label: 'WIS' },
  { key: 'cha', label: 'CHA' },
];

const CharacterEditorForm: FC<{
  initial: Character;
  races: Race[];
  classes: DndClass[];
  onChange: (c: Character) => void;
}> = ({ initial, races, classes, onChange }) => {
  const [c, setC] = useState<Character>(initial);
  useEffect(() => onChange(c), [c, onChange]);

  const set = <K extends keyof Character>(k: K, v: Character[K]) =>
    setC((prev) => ({ ...prev, [k]: v }));

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2}>
        <TextField
          label="Name"
          value={c.name}
          onChange={(e) => set('name', e.target.value)}
          fullWidth
        />
        <TextField
          label="Level"
          type="number"
          value={c.level}
          onChange={(e) => set('level', Math.max(1, Number(e.target.value) || 1))}
          sx={{ width: 100 }}
        />
        <TextField
          label="Alignment"
          value={c.alignment}
          onChange={(e) => set('alignment', e.target.value)}
          sx={{ width: 180 }}
        />
      </Stack>
      <Stack direction="row" spacing={2}>
        <Autocomplete
          sx={{ flex: 1 }}
          options={races}
          getOptionLabel={(o) => o.name}
          value={races.find((r) => r.id === c.race_id) ?? null}
          onChange={(_e, v) => v && set('race_id', v.id)}
          renderInput={(p) => <TextField {...p} label="Race" />}
        />
        <Autocomplete
          sx={{ flex: 1 }}
          options={classes}
          getOptionLabel={(o) => o.name}
          value={classes.find((c2) => c2.id === c.class_id) ?? null}
          onChange={(_e, v) => v && set('class_id', v.id)}
          renderInput={(p) => <TextField {...p} label="Class" />}
        />
      </Stack>
      <Typography variant="overline" color="text.secondary">
        Ability scores
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {ABILITIES.map(({ key, label }) => (
          <TextField
            key={key as string}
            label={label}
            type="number"
            value={(c[key] as number) ?? 10}
            onChange={(e) => set(key, Math.max(1, Number(e.target.value) || 10))}
            sx={{ width: 110 }}
          />
        ))}
      </Stack>
      <Stack direction="row" spacing={2}>
        <TextField
          label="HP max"
          type="number"
          value={c.hp_max}
          onChange={(e) => set('hp_max', Math.max(0, Number(e.target.value) || 0))}
          sx={{ width: 120 }}
        />
        <TextField
          label="AC"
          type="number"
          value={c.ac}
          onChange={(e) => set('ac', Math.max(0, Number(e.target.value) || 0))}
          sx={{ width: 100 }}
        />
        <TextField
          label="Background"
          value={c.background}
          onChange={(e) => set('background', e.target.value)}
          fullWidth
        />
      </Stack>
      <TextField
        label="Notes"
        value={c.notes}
        onChange={(e) => set('notes', e.target.value)}
        multiline
        rows={4}
        fullWidth
      />
    </Stack>
  );
};

const CharacterCreate: FC<{
  onCreated?: () => void;
}> = ({ onCreated }) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Character | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [races, setRaces] = useState<Race[]>([]);
  const [classes, setClasses] = useState<DndClass[]>([]);
  const { toast } = useToast();
  const theme = useTheme();

  useEffect(() => {
    if (open && (races.length === 0 || classes.length === 0)) {
      Promise.all([referenceApi.listRaces(), referenceApi.listClasses()])
        .then(([r, c]) => {
          setRaces(r);
          setClasses(c);
        })
        .catch(() => undefined);
    }
  }, [open, races.length, classes.length]);

  const onSave = async () => {
    if (!draft || !draft.name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await charactersApi.create({ ...draft, owner_user_id: user?.id ?? '' });
      toast('Character created', 'success');
      setOpen(false);
      setDraft(null);
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
          setDraft({
            ...defaultCharacter,
            owner_user_id: user?.id ?? '',
          } as Character);
          setError(null);
          setOpen(true);
        }}
      >
        Create Character
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
            maxHeight: '90vh',
          },
        }}
      >
        <DialogTitle sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h4">New Character</Typography>
            <Stack direction="row" spacing={1}>
              <Button onClick={() => setOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button
                variant="contained"
                startIcon={<Save />}
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
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}
          {draft && (
            <CharacterEditorForm
              initial={draft}
              races={races}
              classes={classes}
              onChange={setDraft}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

const columns: GridColDef<Character>[] = [
  { field: 'name', headerName: 'Name', flex: 2, sortable: true, filterable: true },
  { field: 'level', headerName: 'Lvl', flex: 0.5, align: 'center', headerAlign: 'center', sortable: true, filterable: true },
  { field: 'alignment', headerName: 'Alignment', flex: 1, sortable: true, filterable: true },
  { field: 'hp_max', headerName: 'HP', flex: 0.6, align: 'center', headerAlign: 'center', sortable: true, filterable: true },
  { field: 'ac', headerName: 'AC', flex: 0.6, align: 'center', headerAlign: 'center', sortable: true, filterable: true },
];

const CharactersTable: FC = () => {
  const { user } = useAuth();
  if (!user) {
    return (
      <Box>
        <Typography variant="h3" sx={{ mb: 2 }}>
          Characters
        </Typography>
        <Alert severity="info">
          Sign in (top right) to create and manage your characters.
        </Alert>
      </Box>
    );
  }
  return (
    <EntityBrowser<Character>
      title="My Characters"
      useList={() => useList(charactersApi.list)}
      mutations={{
        create: charactersApi.create,
        update: charactersApi.update,
        remove: charactersApi.delete,
      }}
      columns={columns as GridColDef[]}
      DetailCard={({ item }) => <CharacterCard item={item} />}
      Editor={({ initial, onChange }) => {
        const [races, setRaces] = useState<Race[]>([]);
        const [classes, setClasses] = useState<DndClass[]>([]);
        useEffect(() => {
          Promise.all([referenceApi.listRaces(), referenceApi.listClasses()])
            .then(([r, c]) => {
              setRaces(r);
              setClasses(c);
            })
            .catch(() => undefined);
        }, []);
        return (
          <CharacterEditorForm
            initial={initial}
            races={races}
            classes={classes}
            onChange={onChange}
          />
        );
      }}
      defaultItem={() =>
        ({ ...defaultCharacter, owner_user_id: user.id } as Character)
      }
      getRowId={(r) => r.id}
      getRowName={(r) => r.name}
      CreateButton={CharacterCreate}
      searchHint="Search characters by name…"
      emptyTitle="No characters yet"
      emptyDescription="Create your first character to get started."
    />
  );
};

export default CharactersTable;

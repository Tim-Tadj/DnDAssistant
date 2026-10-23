/**
 * Characters page.
 *
 * Phase 7: uses the shared EntityBrowser shell. The detail view is
 * CharacterDetailPanel; create and edit use CharacterEditorForm.
 */

import React, { FC, useEffect, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
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
import CharacterDetailPanel from '../shared/CharacterDetailPanel';
import { useAuth } from '../auth/AuthContext';
import PartiesPanel from '../shared/PartiesPanel';
import { useCampaignContext } from '../shared/CampaignContext';
import PartyComposition from '../shared/PartyComposition';

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
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Level"
          type="number"
          value={c.level}
          onChange={(e) => set('level', Math.max(1, Number(e.target.value) || 1))}
          sx={{ width: 100 }}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Alignment"
          value={c.alignment}
          onChange={(e) => set('alignment', e.target.value)}
          sx={{ width: 180 }}
          InputLabelProps={{ shrink: true }}
        />
      </Stack>
      <Stack direction="row" spacing={2}>
        <Autocomplete
          sx={{ flex: 1 }}
          options={races}
          getOptionLabel={(o) => o.name}
          value={races.find((r) => r.id === c.race_id) ?? null}
          onChange={(_e, v) => v && set('race_id', v.id)}
          renderInput={(p) => (
            <TextField {...p} label="Race" InputLabelProps={{ shrink: true }} />
          )}
        />
        <Autocomplete
          sx={{ flex: 1 }}
          options={classes}
          getOptionLabel={(o) => o.name}
          value={classes.find((c2) => c2.id === c.class_id) ?? null}
          onChange={(_e, v) => v && set('class_id', v.id)}
          renderInput={(p) => (
            <TextField {...p} label="Class" InputLabelProps={{ shrink: true }} />
          )}
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
            InputLabelProps={{ shrink: true }}
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
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="AC"
          type="number"
          value={c.ac}
          onChange={(e) => set('ac', Math.max(0, Number(e.target.value) || 0))}
          sx={{ width: 100 }}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Background"
          value={c.background}
          onChange={(e) => set('background', e.target.value)}
          fullWidth
          InputLabelProps={{ shrink: true }}
        />
      </Stack>
      <TextField
        label="Notes"
        value={c.notes}
        onChange={(e) => set('notes', e.target.value)}
        multiline
        rows={4}
        fullWidth
        InputLabelProps={{ shrink: true }}
      />
    </Stack>
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
  const { items, loadError, reload } = useList<Character>(charactersApi.list);
  // Same active party as the switcher in the top bar.
  const { activePartyId, setActivePartyId } = useCampaignContext();
  const [races, setRaces] = useState<Race[]>([]);
  const [classes, setClasses] = useState<DndClass[]>([]);

  useEffect(() => {
    if (!user) return;
    if (races.length > 0 && classes.length > 0) return;
    Promise.all([referenceApi.listRaces(), referenceApi.listClasses()])
      .then(([r, c]) => {
        setRaces(r);
        setClasses(c);
      })
      .catch(() => undefined);
  }, [user, races.length, classes.length]);

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
    <Box>
      <PartyComposition
        characters={items ?? []}
        classes={classes}
      />
      <PartiesPanel
        characters={items ?? []}
        activePartyId={activePartyId}
        onActivePartyChange={setActivePartyId}
      />
      <EntityBrowser<Character>
        title="My Characters"
        items={items}
        loadError={loadError}
        reload={reload}
        mutations={{
          create: charactersApi.create,
          update: charactersApi.update,
          remove: charactersApi.delete,
        }}
        columns={columns as GridColDef[]}
        DetailCard={({ item }) => <CharacterDetailPanel item={item} />}
        Editor={({ initial, onChange }) => (
          <CharacterEditorForm initial={initial} races={races} classes={classes} onChange={onChange} />
        )}
      defaultItem={() =>
        ({ ...defaultCharacter, owner_user_id: user.id } as Character)
      }
      getRowId={(r) => r.id}
      getRowName={(r) => r.name}
      // Characters have no provenance; the API only lists the user's own,
      // so ownership (not 'homebrew') decides Edit/Delete.
      isMine={(r) => r.owner_user_id === user.id}
      isEditable={(r) => r.owner_user_id === user.id}
      isDeletable={(r) => r.owner_user_id === user.id}
      itemName="Character"
      searchHint="Search characters by name…"
      emptyTitle="No characters yet"
      emptyDescription="Create your first character to get started."
      />
    </Box>
  );
};

export default CharactersTable;

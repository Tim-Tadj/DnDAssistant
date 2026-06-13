import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DataGrid, GridRowParams } from '@mui/x-data-grid';
import { Spell } from '../types/Spell';
import PageIterator from '../shared/page-iterator';
import SpellCard from '../spells/spell-card';
import { Close } from '@mui/icons-material';
import { spellColumnDescriptor } from './spell-column-descriptor';
import CreateSpell from './create-spell';
import { spellsApi } from '../api/spells';

export default function SpellTable() {
  const [spells, setSpells] = useState<Spell[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSpell, setSelectedSpell] = useState<Spell | null>(null);
  const [spellIndex, setSpellIndex] = useState<number>(0);

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
    },
    [filteredSpells, setSelectedSpell, setSpellIndex]
  );

  const onViewNextSpell = useCallback(
    (newPage: number) => {
      setSpellIndex(newPage);
      setSelectedSpell(filteredSpells[newPage]);
    },
    [filteredSpells, setSelectedSpell]
  );

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
        onClose={() => setSelectedSpell(null)}
        maxWidth="xl"
      >
        <DialogTitle>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h5">Spell View</Typography>
            <PageIterator
              page={spellIndex}
              maxLength={filteredSpells.length}
              pageSetter={onViewNextSpell}
            />
            <IconButton onClick={() => setSelectedSpell(null)}>
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Container sx={{ justifyContent: 'center', alignContent: 'center' }}>
            {selectedSpell !== null && <SpellCard spell={selectedSpell} />}
          </Container>
        </DialogContent>
      </Dialog>
    </Container>
  );
}

import React, { FC, useCallback, useEffect, useState } from 'react';
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
import { Monster } from '../types/Monster';
import PageIterator from '../shared/page-iterator';
import MonsterCard from './monster-card';
import { Close } from '@mui/icons-material';
import { monsterColumnDescriptor } from './monster-column-descriptor';
import CreateMonster from './create-monster';
import { monstersApi } from '../api/monsters';

const MonsterTable: FC<{
  onRowClick?: (params: GridRowParams) => void;
  props?: object;
}> = ({ onRowClick, props = {} }) => {
  const [monsters, setMonsters] = useState<Monster[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMonster, setSelectedMonster] = useState<Monster | null>(null);
  const [monsterIndex, setMonsterIndex] = useState<number>(0);

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
    },
    [filteredMonsters, setSelectedMonster, setMonsterIndex]
  );

  const onViewNextMonster = useCallback(
    (newPage: number) => {
      setMonsterIndex(newPage);
      setSelectedMonster(filteredMonsters[newPage]);
    },
    [filteredMonsters, setSelectedMonster]
  );

  return (
    <Container maxWidth="xl">
      <Stack direction="row" justifyContent="space-between">
        <Typography variant="h4">Monsters</Typography>
        <CreateMonster />
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
        onClose={() => setSelectedMonster(null)}
        maxWidth="xl"
      >
        <DialogTitle>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h5">Monster View</Typography>
            <PageIterator
              page={monsterIndex}
              maxLength={filteredMonsters.length}
              pageSetter={onViewNextMonster}
            />
            <IconButton onClick={() => setSelectedMonster(null)}>
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Container sx={{ justifyContent: 'center', alignContent: 'center' }}>
            {selectedMonster !== null && (
              <MonsterCard monster={selectedMonster} />
            )}
          </Container>
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default MonsterTable;

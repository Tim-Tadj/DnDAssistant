import * as React from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Container,
  Divider,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  armourColumnDescriptor,
  gearColumnDescriptor,
  weaponColumnDescriptor,
} from './gear-column-descriptors';
import { Armour, Gear, GearItem, Weapon } from '../types/Gear';
import CreateGear from './create-gear';
import { gearApi } from '../api/gear';

type Section = 'Weapons' | 'Armour' | 'Gear';
type SectionsType = { [id: string]: { rows: GearItem[], columns: GridColDef[] } };

const KIND_BY_SECTION: Record<Section, GearItem['kind']> = {
  Weapons: 'weapon',
  Armour: 'armour',
  Gear: 'gear',
};

export default function GearTable() {
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [activeSection, setActiveSection] = React.useState<Section>('Weapons');
  const [items, setItems] = React.useState<GearItem[] | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

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
    const byKind: Record<GearItem['kind'], GearItem[]> = {
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
    </Container>
  );
}

// Re-export the legacy types so other modules keep importing them from here.
export type { Armour, Gear, Weapon };

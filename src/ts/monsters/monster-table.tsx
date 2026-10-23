/**
 * Monsters page.
 *
 * Phase 7: uses the shared EntityBrowser shell; the detail view is
 * MonsterStatBlock (PHB-style).
 */

import React, { FC, useState } from 'react';
import { GridColDef } from '@mui/x-data-grid';
import { Monster, defaultMonster } from '../types/Monster';
import { monstersApi } from '../api/monsters';
import { useList } from '../shared/useList';
import { EntityBrowser } from '../shared/EntityBrowser';
import MonsterStatBlock from '../shared/MonsterStatBlock';
import MonsterEditor from './monster-editor';
import { useAuth } from '../auth/AuthContext';

// "1/4 (50 XP)" → 0.25, so CR sorts as a number.
const crValue = (challenge: string) => {
  const [num, den] = (challenge ?? '').split(' ')[0].split('/').map(Number);
  return den ? num / den : num || 0;
};

const columns: GridColDef<Monster>[] = [
  { field: 'name', headerName: 'Name', flex: 2, sortable: true, filterable: true },
  { field: 'meta', headerName: 'Type', flex: 2, sortable: true, filterable: true },
  {
    field: 'ac',
    headerName: 'AC',
    flex: 0.6,
    sortable: true,
    filterable: true,
    align: 'center',
    headerAlign: 'center',
  },
  {
    field: 'hp',
    headerName: 'HP',
    flex: 0.8,
    sortable: true,
    filterable: true,
    align: 'center',
    headerAlign: 'center',
  },
  {
    field: 'speed',
    headerName: 'Speed',
    flex: 0.8,
    sortable: true,
    filterable: true,
  },
  {
    field: 'challenge',
    headerName: 'CR',
    flex: 0.8,
    sortable: true,
    filterable: true,
    align: 'center',
    headerAlign: 'center',
    sortComparator: (a: string, b: string) => crValue(a) - crValue(b),
  },
  {
    field: 'provenance',
    headerName: 'Source',
    flex: 0.8,
    sortable: true,
    filterable: true,
    align: 'center',
    headerAlign: 'center',
  },
];

const MonsterTable: FC = () => {
  const { user } = useAuth();
  const { items, loadError, reload } = useList<Monster>(monstersApi.list);
  const [mineFilter, setMineFilter] = useState(false);
  return (
    <EntityBrowser<Monster>
      title="Monsters"
      items={items}
      loadError={loadError}
      reload={reload}
      mutations={{
        create: monstersApi.create,
        update: (id, m) => monstersApi.update(id as number, m),
        remove: (id) => monstersApi.delete(id as number),
      }}
      columns={columns as GridColDef[]}
      DetailCard={({ item }) => <MonsterStatBlock monster={item} />}
      Editor={({ initial, onChange }) => (
        <MonsterEditor initial={initial} onChange={onChange} />
      )}
      defaultItem={() => ({
        ...defaultMonster,
        description: '',
        lair_actions: '',
        regional_effects: '',
        traits: '',
        saving_throws: '',
        skills: '',
        damage_vulnerabilities: '',
        damage_resistances: '',
        damage_immunities: '',
        condition_immunities: '',
        reactions: '',
        legendary_actions: '',
      } as Monster)}
      getRowId={(r) => r.id ?? r.name}
      getRowName={(r) => r.name}
      searchHint="Search monsters by name (e.g. dragon, orc)…"
      showMineFilter={!!user}
      mineFilter={mineFilter}
      onMineFilterChange={setMineFilter}
    />
  );
};

export default MonsterTable;

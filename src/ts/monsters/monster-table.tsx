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
import { MonsterAvatar, creatureVisual } from '../shared/EntityAvatar';
import { StackedCell, sourceColumn, splitParen } from '../shared/TableCells';
import { useAuth } from '../auth/AuthContext';

// "1/4 (50 XP)" → 0.25, so CR sorts as a number.
const crValue = (challenge: string) => {
  const [num, den] = (challenge ?? '').split(' ')[0].split('/').map(Number);
  return den ? num / den : num || 0;
};

// "27,500 XP" → "27.5k XP", so it fits under the CR.
const shortXp = (xp: string) => {
  const n = Number(xp.replace(/[^\d]/g, ''));
  if (!xp || Number.isNaN(n)) return xp;
  return n >= 1000 ? `${+(n / 1000).toFixed(1)}k XP` : `${n} XP`;
};

// "40 ft., fly 80 ft." → "40, fly 80": D&D speeds are always in feet.
const shortSpeed = (speed?: string) => (speed ?? '').replace(/\s*ft\.?/g, '');

const columns: GridColDef<Monster>[] = [
  { field: 'name', headerName: 'Name', flex: 2.4, sortable: true, filterable: true },
  {
    field: 'meta',
    headerName: 'Type',
    flex: 1.8,
    sortable: true,
    filterable: true,
    // "Huge dragon, chaotic evil": size and type, alignment underneath.
    renderCell: ({ row }) => {
      const [kind, ...rest] = (row.meta ?? '').split(',');
      const visual = creatureVisual(row.meta);
      return <StackedCell primary={kind} secondary={rest.join(',').trim()} title={row.meta} color={visual.color} />;
    },
  },
  {
    field: 'ac',
    headerName: 'AC',
    flex: 0.5,
    sortable: true,
    filterable: true,
    align: 'center',
    headerAlign: 'center',
    renderCell: ({ row }) => {
      // The armour note ("natural armor") stays in the tooltip.
      return <StackedCell primary={splitParen(row.ac)[0]} title={row.ac} mono />;
    },
  },
  {
    field: 'hp',
    headerName: 'HP',
    flex: 0.7,
    sortable: true,
    filterable: true,
    align: 'center',
    headerAlign: 'center',
    renderCell: ({ row }) => {
      const [value, dice] = splitParen(row.hp);
      return <StackedCell primary={value} secondary={dice} title={row.hp} mono />;
    },
  },
  {
    field: 'speed',
    headerName: 'Speed',
    flex: 1.1,
    sortable: true,
    filterable: true,
    renderCell: ({ row }) => <StackedCell primary={shortSpeed(row.speed)} title={row.speed} />,
  },
  {
    field: 'challenge',
    headerName: 'CR',
    flex: 0.6,
    sortable: true,
    filterable: true,
    align: 'center',
    headerAlign: 'center',
    sortComparator: (a: string, b: string) => crValue(a) - crValue(b),
    renderCell: ({ row }) => {
      const [cr, xp] = splitParen(row.challenge);
      return <StackedCell primary={cr} secondary={shortXp(xp)} title={row.challenge} mono />;
    },
  },
  sourceColumn,
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
      renderAvatar={(r, size) => <MonsterAvatar monster={r} size={size} />}
      searchHint="Search monsters by name (e.g. dragon, orc)…"
      showMineFilter={!!user}
      mineFilter={mineFilter}
      onMineFilterChange={setMineFilter}
    />
  );
};

export default MonsterTable;

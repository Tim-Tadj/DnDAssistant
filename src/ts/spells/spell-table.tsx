/**
 * Spells page.
 *
 * Phase 7: uses the shared EntityBrowser shell; the detail view is
 * SpellCard (PHB-style).
 */

import React, { FC, useState } from 'react';
import { GridColDef } from '@mui/x-data-grid';
import { Spell, defaultSpell } from '../types/Spell';
import { spellsApi } from '../api/spells';
import { useList } from '../shared/useList';
import { EntityBrowser } from '../shared/EntityBrowser';
import SpellCard from '../shared/SpellCard';
import SpellEditor from './spell-editor';
import { SpellAvatar, schoolVisual } from '../shared/EntityAvatar';
import { StackedCell, sourceColumn } from '../shared/TableCells';
import { useAuth } from '../auth/AuthContext';

const levelValue = (level: string) => (level === 'cantrip' ? 0 : Number(level) || 0);

// "Concentration, up to 1 minute" → "1 minute", flagged as concentration.
const CONCENTRATION = /^concentration,\s*(up to\s*)?/i;

const columns: GridColDef<Spell>[] = [
  { field: 'name', headerName: 'Name', flex: 2.2, sortable: true, filterable: true },
  {
    field: 'level',
    headerName: 'Level',
    flex: 0.7,
    sortable: true,
    filterable: true,
    align: 'center',
    headerAlign: 'center',
    sortComparator: (a: string, b: string) => levelValue(a) - levelValue(b),
    renderCell: ({ row }) => <StackedCell primary={row.level === 'cantrip' ? 'Cantrip' : row.level} mono={row.level !== 'cantrip'} />,
  },
  {
    field: 'school',
    headerName: 'School',
    flex: 1.1,
    sortable: true,
    filterable: true,
    renderCell: ({ row }) => {
      const visual = schoolVisual(row.school);
      return <StackedCell primary={visual === schoolVisual(null) ? row.school : visual.label} color={visual.color} />;
    },
  },
  {
    field: 'casting_time',
    headerName: 'Casting Time',
    flex: 1.2,
    sortable: true,
    filterable: true,
    // Reactions carry their trigger ("1 reaction, which you take when…").
    renderCell: ({ row }) => {
      const [time, ...trigger] = (row.casting_time ?? '').split(',');
      return <StackedCell primary={time} secondary={trigger.join(',').trim()} title={row.casting_time} />;
    },
  },
  { field: 'range', headerName: 'Range', flex: 1, sortable: true, filterable: true, renderCell: ({ row }) => <StackedCell primary={row.range} title={row.range} /> },
  {
    field: 'duration',
    headerName: 'Duration',
    flex: 1.2,
    sortable: true,
    filterable: true,
    renderCell: ({ row }) => {
      const conc = CONCENTRATION.test(row.duration ?? '');
      return (
        <StackedCell
          primary={conc ? row.duration.replace(CONCENTRATION, '') : row.duration}
          secondary={[conc && 'Concentration', row.ritual && 'Ritual'].filter(Boolean).join(' · ')}
          title={row.duration}
        />
      );
    },
  },
  sourceColumn,
];

const SpellTable: FC = () => {
  const { user } = useAuth();
  const { items, loadError, reload } = useList<Spell>(spellsApi.list);
  const [mineFilter, setMineFilter] = useState(false);
  return (
    <EntityBrowser<Spell>
      title="Spells"
      items={items}
      loadError={loadError}
      reload={reload}
      mutations={{
        create: spellsApi.create,
        update: (id, s) => spellsApi.update(id as number, s),
        remove: (id) => spellsApi.delete(id as number),
      }}
      columns={columns as GridColDef[]}
      DetailCard={({ item }) => <SpellCard spell={item} />}
      Editor={({ initial, onChange }) => (
        <SpellEditor initial={initial} onChange={onChange} />
      )}
      defaultItem={() => ({ ...defaultSpell, name: '' })}
      getRowId={(r) => r.id ?? r.name}
      getRowName={(r) => r.name}
      renderAvatar={(r, size) => <SpellAvatar spell={r} size={size} />}
      searchHint="Search spells by name (e.g. fireball, eldritch)…"
      showMineFilter={!!user}
      mineFilter={mineFilter}
      onMineFilterChange={setMineFilter}
    />
  );
};

export default SpellTable;

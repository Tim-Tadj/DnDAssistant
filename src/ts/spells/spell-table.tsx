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
import { useAuth } from '../auth/AuthContext';

const columns: GridColDef<Spell>[] = [
  { field: 'name', headerName: 'Name', flex: 2, sortable: true, filterable: true },
  { field: 'level', headerName: 'Level', flex: 0.7, sortable: true, filterable: true, align: 'center', headerAlign: 'center' },
  { field: 'school', headerName: 'School', flex: 1, sortable: true, filterable: true },
  { field: 'casting_time', headerName: 'Casting Time', flex: 1.2, sortable: true, filterable: true },
  { field: 'range', headerName: 'Range', flex: 1, sortable: true, filterable: true },
  { field: 'duration', headerName: 'Duration', flex: 1.2, sortable: true, filterable: true },
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
      searchHint="Search spells by name (e.g. fireball, eldritch)…"
      showMineFilter={!!user}
      mineFilter={mineFilter}
      onMineFilterChange={setMineFilter}
    />
  );
};

export default SpellTable;

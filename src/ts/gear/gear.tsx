/**
 * Gear page.
 *
 * Phase 7: uses the shared EntityBrowser shell. The kind (weapon/armour/
 * gear) is shown as filter chips at the top. GearItemEditor picks the
 * matching per-kind editor (with a kind switch when creating).
 */

import React, { FC, useCallback, useRef, useState } from 'react';
import { Stack, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { GridColDef } from '@mui/x-data-grid';
import { GearItem, GearKind, Armour, Gear, Weapon, defaultGearItem, defaultWeapon, defaultArmour } from '../types/Gear';
import { gearApi } from '../api/gear';
import { useList } from '../shared/useList';
import { EntityBrowser } from '../shared/EntityBrowser';
import GearDetailCard from '../shared/GearDetailCard';
import GearEditor from './gear-editor';
import WeaponEditor from './weapon-editor';
import ArmourEditor from './armour-editor';
import { GearAvatar, gearVisual } from '../shared/EntityAvatar';
import { StackedCell, sourceColumn } from '../shared/TableCells';
import { useAuth } from '../auth/AuthContext';

// GearItem stores type-specific fields capitalised (Damage, Strength…);
// the per-kind editors use their own lower-case shapes.
const toWeapon = (g: GearItem) =>
  ({ ...defaultWeapon, ...g, damage: g.Damage ?? defaultWeapon.damage, properties: g.Properties ?? '' } as unknown as Weapon);
const toArmour = (g: GearItem) =>
  ({ ...defaultArmour, ...g, AC: g.AC ?? defaultArmour.AC, strength: g.Strength ?? '', stealth: g.Stealth ?? '' } as unknown as Armour);
const blankItem = (kind: GearKind): GearItem => ({ ...defaultGearItem, name: '', kind });

// One editor for create and edit. New items get a kind switch; the
// per-kind editors report changes from an effect, so the callbacks
// here stay stable (refs) to avoid re-emitting on every render.
const GearItemEditor: FC<{ initial: GearItem; onChange: (item: GearItem) => void }> = ({ initial, onChange }) => {
  const latest = useRef({ initial, onChange });
  latest.current = { initial, onChange };
  const emit = useCallback(
    (patch: Partial<GearItem>) => latest.current.onChange({ ...latest.current.initial, ...patch }),
    [],
  );
  const onWeapon = useCallback(
    (w: Weapon) =>
      emit({ name: w.name, cost: w.cost, weight: w.weight, type: w.type, Damage: w.damage, Properties: w.properties, description: w.description }),
    [emit],
  );
  const onArmour = useCallback(
    (a: Armour) =>
      emit({ name: a.name, cost: a.cost, weight: a.weight, type: a.type, AC: a.AC, Strength: a.strength, Stealth: a.stealth, description: a.description }),
    [emit],
  );
  const onGear = useCallback(
    (g: Gear) => emit({ name: g.name, cost: g.cost, weight: g.weight, type: g.type, description: g.description }),
    [emit],
  );
  const [kind, setKind] = useState(initial.kind);

  return (
    <Stack spacing={2}>
      {initial.id === undefined && (
        <ToggleButtonGroup
          value={kind}
          exclusive
          onChange={(_e, k: GearKind | null) => {
            if (!k) return;
            setKind(k);
            onChange(blankItem(k));
          }}
          size="small"
          color="primary"
        >
          <ToggleButton value="weapon">Weapon</ToggleButton>
          <ToggleButton value="armour">Armour</ToggleButton>
          <ToggleButton value="gear">Gear</ToggleButton>
        </ToggleButtonGroup>
      )}
      {/* key: switching kind starts that kind's editor fresh */}
      {kind === 'weapon' ? (
        <WeaponEditor key={kind} initial={toWeapon(initial)} onChange={onWeapon} />
      ) : kind === 'armour' ? (
        <ArmourEditor key={kind} initial={toArmour(initial)} onChange={onArmour} />
      ) : (
        <GearEditor key={kind} initial={initial as unknown as Gear} onChange={onGear} />
      )}
    </Stack>
  );
};

const columns: GridColDef<GearItem>[] = [
  { field: 'name', headerName: 'Name', flex: 2, sortable: true, filterable: true },
  {
    field: 'type',
    headerName: 'Type',
    flex: 1.4,
    sortable: true,
    filterable: true,
    // Plain gear has no type; show what the badge means instead.
    renderCell: ({ row }) => {
      const visual = gearVisual(row);
      return <StackedCell primary={row.type || visual.label} color={row.type ? undefined : 'text.secondary'} />;
    },
  },
  { field: 'cost', headerName: 'Cost', flex: 0.8, sortable: true, filterable: true, align: 'center', headerAlign: 'center' },
  { field: 'weight', headerName: 'Weight', flex: 0.8, sortable: true, filterable: true, align: 'center', headerAlign: 'center' },
  {
    field: 'Damage',
    headerName: 'Damage / AC',
    flex: 1.2,
    sortable: true,
    filterable: true,
    // "2d6 slashing" → "2d6" over "slashing"; armour shows its AC.
    renderCell: ({ row }) => {
      if (row.Damage) {
        const [dice, ...type] = row.Damage.split(' ');
        return <StackedCell primary={dice} secondary={type.join(' ')} title={[row.Damage, row.Properties].filter(Boolean).join(' · ')} mono />;
      }
      if (row.AC) {
        const [base, ...rest] = row.AC.split(' + ');
        return <StackedCell primary={`AC ${base}`} secondary={rest.length ? `+ ${rest.join(' + ')}` : ''} title={row.AC} mono />;
      }
      return null;
    },
  },
  sourceColumn,
];

const GearTable: FC = () => {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [mineFilter, setMineFilter] = useState(false);
  const { items, loadError, reload } = useList<GearItem>(() => gearApi.list());
  return (
    <EntityBrowser<GearItem>
      title="Gear"
      items={items}
      loadError={loadError}
      reload={reload}
      mutations={{
        create: gearApi.create,
        update: (id, g) => gearApi.update(id as number, g),
        remove: (id) => gearApi.delete(id as number),
      }}
      columns={columns as GridColDef[]}
      DetailCard={({ item }) => <GearDetailCard item={item} />}
      Editor={GearItemEditor}
      defaultItem={() => blankItem('weapon')}
      getRowId={(r) => r.id ?? r.name}
      getRowName={(r) => r.name}
      renderAvatar={(r, size) => <GearAvatar item={r} size={size} />}
      itemName="Item"
      filterChips={[
        { label: 'Weapons', value: 'weapon' },
        { label: 'Armour', value: 'armour' },
        { label: 'Gear', value: 'gear' },
      ]}
      activeFilter={activeFilter}
      onFilterChange={setActiveFilter}
      searchHint="Search weapons, armour, and gear…"
      isDeletable={(r) => r.provenance === 'homebrew'}
      isEditable={(r) => r.provenance === 'homebrew'}
      showMineFilter={!!user}
      mineFilter={mineFilter}
      onMineFilterChange={setMineFilter}
    />
  );
};

export default GearTable;

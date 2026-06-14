/**
 * Gear page.
 *
 * Phase 7: uses the shared EntityBrowser shell. The kind (weapon/armour/
 * gear) is shown as filter chips at the top. The create flow is a kind
 * picker that dispatches to the matching editor.
 */

import React, { FC, useState } from 'react';
import {
  Button,
  Stack,
  Typography,
  useTheme,
  ToggleButton,
  ToggleButtonGroup,
  Box,
} from '@mui/material';
import { Add, Save } from '@mui/icons-material';
import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import { GridColDef } from '@mui/x-data-grid';
import { GearItem, GearKind, Armour, Gear, Weapon, defaultGearItem, defaultWeapon, defaultArmour, defaultGear } from '../types/Gear';
import { gearApi } from '../api/gear';
import { useList } from '../shared/useList';
import { EntityBrowser } from '../shared/EntityBrowser';
import GearDetailCard from '../shared/GearDetailCard';
import GearEditor from './gear-editor';
import WeaponEditor from './weapon-editor';
import ArmourEditor from './armour-editor';
import { useToast } from '../shared/ToastProvider';
import { useAuth } from '../auth/AuthContext';

const GearCreate: FC<{ onCreated?: () => void }> = ({ onCreated }) => {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<GearKind>('weapon');
  const [draft, setDraft] = useState<GearItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const theme = useTheme();

  const openDialog = (k: GearKind) => {
    const base =
      k === 'weapon'
        ? { ...defaultWeapon, kind: 'weapon' as const }
        : k === 'armour'
        ? { ...defaultArmour, kind: 'armour' as const }
        : { ...defaultGear, kind: 'gear' as const };
    setKind(k);
    setDraft({ ...(base as GearItem), name: '' });
    setError(null);
    setOpen(true);
  };

  const onSave = async () => {
    if (!draft || !draft.name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await gearApi.create(draft);
      toast('Item created', 'success');
      setOpen(false);
      setDraft(null);
      onCreated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const renderEditor = () => {
    if (!draft) return null;
    if (kind === 'weapon') {
      return (
        <WeaponEditor
          onChange={(w) =>
            setDraft({
              ...draft,
              name: w.name,
              cost: w.cost,
              weight: w.weight,
              type: w.type,
              Damage: w.damage,
              Properties: w.properties,
              description: w.description,
              kind: 'weapon',
            })
          }
        />
      );
    }
    if (kind === 'armour') {
      return (
        <ArmourEditor
          onChange={(a) =>
            setDraft({
              ...draft,
              name: a.name,
              cost: a.cost,
              weight: a.weight,
              type: a.type,
              AC: a.AC,
              Strength: a.strength,
              Stealth: a.stealth,
              description: a.description,
              kind: 'armour',
            })
          }
        />
      );
    }
    return (
      <GearEditor
        onChange={(g) =>
          setDraft({
            ...draft,
            name: g.name,
            cost: g.cost,
            weight: g.weight,
            type: g.type,
            description: g.description,
            kind: 'gear',
          })
        }
      />
    );
  };

  return (
    <>
      <Button
        variant="contained"
        startIcon={<Add />}
        onClick={() => openDialog('weapon')}
      >
        Create Item
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
          <Stack spacing={1}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h4">New Item</Typography>
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
            <ToggleButtonGroup
              value={kind}
              exclusive
              onChange={(_e, v) => v && openDialog(v)}
              size="small"
              color="primary"
            >
              <ToggleButton value="weapon">Weapon</ToggleButton>
              <ToggleButton value="armour">Armour</ToggleButton>
              <ToggleButton value="gear">Gear</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {error && (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}
          {renderEditor()}
        </DialogContent>
      </Dialog>
    </>
  );
};

const columns: GridColDef<GearItem>[] = [
  { field: 'name', headerName: 'Name', flex: 2, sortable: true, filterable: true },
  { field: 'type', headerName: 'Type', flex: 1.5, sortable: true, filterable: true },
  { field: 'cost', headerName: 'Cost', flex: 0.8, sortable: true, filterable: true, align: 'center', headerAlign: 'center' },
  { field: 'weight', headerName: 'Weight', flex: 0.8, sortable: true, filterable: true, align: 'center', headerAlign: 'center' },
  {
    field: 'Damage',
    headerName: 'Damage',
    flex: 1,
    sortable: true,
    filterable: true,
    renderCell: (params) =>
      params.value ? (
        <Typography
          variant="body2"
          sx={{ fontFamily: '"JetBrains Mono", monospace', py: 1 }}
        >
          {params.value}
        </Typography>
      ) : (
        params.row.AC ?? ''
      ),
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
      Editor={({ initial, onChange }) => {
        if (initial.kind === 'weapon') {
          return (
            <WeaponEditor
              initial={initial as unknown as Weapon}
              onChange={(w) =>
                onChange({
                  ...initial,
                  name: w.name,
                  cost: w.cost,
                  weight: w.weight,
                  type: w.type,
                  Damage: w.damage,
                  Properties: w.properties,
                  description: w.description,
                })
              }
            />
          );
        }
        if (initial.kind === 'armour') {
          return (
            <ArmourEditor
              initial={initial as unknown as Armour}
              onChange={(a) =>
                onChange({
                  ...initial,
                  name: a.name,
                  cost: a.cost,
                  weight: a.weight,
                  type: a.type,
                  AC: a.AC,
                  Strength: a.strength,
                  Stealth: a.stealth,
                  description: a.description,
                })
              }
            />
          );
        }
        return (
          <GearEditor
            initial={initial as unknown as Gear}
            onChange={(g) =>
              onChange({
                ...initial,
                name: g.name,
                cost: g.cost,
                weight: g.weight,
                type: g.type,
                description: g.description,
              })
            }
          />
        );
      }}
      defaultItem={() => ({ ...defaultGearItem, name: '', kind: 'gear' })}
      getRowId={(r) => r.id ?? r.name}
      getRowName={(r) => r.name}
      CreateButton={GearCreate}
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

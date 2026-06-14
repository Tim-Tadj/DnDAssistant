/**
 * Spells page.
 *
 * Phase 7: uses the shared EntityBrowser shell; the detail view is
 * SpellCard (PHB-style).
 */

import React, { FC, useState } from 'react';
import { Button, Stack, Typography, useTheme } from '@mui/material';
import { Add, Save } from '@mui/icons-material';
import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import { GridColDef } from '@mui/x-data-grid';
import { Spell, defaultSpell } from '../types/Spell';
import { spellsApi } from '../api/spells';
import { useList } from '../shared/useList';
import { EntityBrowser } from '../shared/EntityBrowser';
import SpellCard from '../shared/SpellCard';
import SpellEditor from './spell-editor';
import { useToast } from '../shared/ToastProvider';
import { useAuth } from '../auth/AuthContext';

const SpellCreate: FC<{ onCreated?: () => void }> = ({ onCreated }) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Spell | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const theme = useTheme();

  const onSave = async () => {
    if (!draft || !draft.name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await spellsApi.create(draft);
      toast('Spell created', 'success');
      setOpen(false);
      setDraft(null);
      onCreated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button
        variant="contained"
        startIcon={<Add />}
        onClick={() => {
          setDraft({ ...defaultSpell, name: '' });
          setError(null);
          setOpen(true);
        }}
      >
        Create Spell
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
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h4">New Spell</Typography>
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
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {error && (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}
          {draft && <SpellEditor initial={draft} onChange={setDraft} />}
        </DialogContent>
      </Dialog>
    </>
  );
};

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
      CreateButton={SpellCreate}
      searchHint="Search spells by name (e.g. fireball, eldritch)…"
      showMineFilter={!!user}
      mineFilter={mineFilter}
      onMineFilterChange={setMineFilter}
    />
  );
};

export default SpellTable;

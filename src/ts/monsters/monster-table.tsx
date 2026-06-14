/**
 * Monsters page.
 *
 * Phase 7: uses the shared EntityBrowser shell; the detail view is
 * MonsterStatBlock (PHB-style).
 */

import React, { FC, useState } from 'react';
import { Button, Stack, Typography, useTheme } from '@mui/material';
import { Add, Save } from '@mui/icons-material';
import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import { GridColDef } from '@mui/x-data-grid';
import { Monster, defaultMonster } from '../types/Monster';
import { monstersApi } from '../api/monsters';
import { useList } from '../shared/useList';
import { EntityBrowser } from '../shared/EntityBrowser';
import MonsterStatBlock from '../shared/MonsterStatBlock';
import MonsterEditor from './monster-editor';
import { useToast } from '../shared/ToastProvider';

const MonsterCreate: FC<{ onCreated?: () => void }> = ({ onCreated }) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Monster | null>(null);
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
      await monstersApi.create(draft);
      toast('Monster created', 'success');
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
          setDraft({
            ...defaultMonster,
            description: '',
            Lair_Actions: '',
            Regional_Effects: '',
            Traits: '',
            Saving_Throws: '',
            Skills: '',
            Damage_Vulnerabilities: '',
            Damage_Resistances: '',
            Damage_Immunities: '',
            Condition_Immunities: '',
            Reactions: '',
            Legendary_Actions: '',
          } as Monster);
          setError(null);
          setOpen(true);
        }}
      >
        Create Monster
      </Button>
      <Dialog
        open={open}
        onClose={() => {
          if (saving) return;
          setOpen(false);
        }}
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
            <Typography variant="h4">New Monster</Typography>
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
          {draft && (
            <MonsterEditor
              initial={draft}
              onChange={setDraft}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

const columns: GridColDef<Monster>[] = [
  { field: 'name', headerName: 'Name', flex: 2, sortable: true, filterable: true },
  { field: 'meta', headerName: 'Type', flex: 2, sortable: true, filterable: true },
  {
    field: 'AC',
    headerName: 'AC',
    flex: 0.6,
    sortable: true,
    filterable: true,
    align: 'center',
    headerAlign: 'center',
  },
  {
    field: 'HP',
    headerName: 'HP',
    flex: 0.8,
    sortable: true,
    filterable: true,
    align: 'center',
    headerAlign: 'center',
  },
  {
    field: 'Speed',
    headerName: 'Speed',
    flex: 0.8,
    sortable: true,
    filterable: true,
  },
  {
    field: 'Challenge',
    headerName: 'CR',
    flex: 0.8,
    sortable: true,
    filterable: true,
    align: 'center',
    headerAlign: 'center',
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
  return (
    <EntityBrowser<Monster>
      title="Monsters"
      useList={() => useList(monstersApi.list)}
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
        Lair_Actions: '',
        Regional_Effects: '',
        Traits: '',
        Saving_Throws: '',
        Skills: '',
        Damage_Vulnerabilities: '',
        Damage_Resistances: '',
        Damage_Immunities: '',
        Condition_Immunities: '',
        Reactions: '',
        Legendary_Actions: '',
      } as Monster)}
      getRowId={(r) => r.id ?? r.name}
      getRowName={(r) => r.name}
      CreateButton={MonsterCreate}
      searchHint="Search monsters by name (e.g. dragon, orc)…"
    />
  );
};

export default MonsterTable;

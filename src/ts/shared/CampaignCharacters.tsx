// Phase 9: the campaign's characters. Lists the characters
// linked to this campaign (i.e. those that have a row in
// campaign_characters) and lets the DM:
//   - add characters to the campaign, several at once (creates a
//     row with level / hp_max from the canonical character)
//   - change the campaign-specific level
//   - edit max HP / AC / conditions / death saves for that
//     character in this campaign
//   - remove the character from the campaign
//
// The canonical character row (name, race, class, etc.) is not
// edited here — that's on the Characters page.

import React, { FC, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Delete,
  Edit,
  Person,
  PersonAdd,
} from '@mui/icons-material';
import { CampaignCharacter, defaultCampaignCharacter } from '../types/CampaignCharacter';
import { Character } from '../types/Character';
import { campaignCharactersApi } from '../api/campaign-characters';
import { charactersApi } from '../api/characters';
import { useToast } from './ToastProvider';
import { MultiPickDialog } from './MultiPick';
import FormDialog from './FormDialog';

const STANDARD_CONDITIONS = [
  'Blinded', 'Charmed', 'Deafened', 'Frightened', 'Grappled', 'Incapacitated',
  'Invisible', 'Paralyzed', 'Petrified', 'Poisoned', 'Prone', 'Restrained',
  'Stunned', 'Unconscious',
];

type Props = {
  campaignId: string;
  canEdit: boolean;
};

const CampaignCharacters: FC<Props> = ({ campaignId, canEdit }) => {
  const theme = useTheme();
  const { toast } = useToast();

  const [rows, setRows] = useState<CampaignCharacter[]>([]);
  const [allCharacters, setAllCharacters] = useState<Character[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<CampaignCharacter | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<CampaignCharacter | null>(null);
  const [removing, setRemoving] = useState(false);

  const reload = async () => {
    setLoadError(null);
    try {
      const [data, allChars] = await Promise.all([
        campaignCharactersApi.list(campaignId),
        charactersApi.list(),
      ]);
      setRows(data);
      setAllCharacters(allChars);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => {
    void reload();
  }, [campaignId]);

  const characterById = useMemo(() => {
    const m = new Map<string, Character>();
    for (const c of allCharacters) if (c.id) m.set(c.id, c);
    return m;
  }, [allCharacters]);

  const addable = useMemo(
    () => allCharacters.filter((c) => c.id && !rows.find((r) => r.character_id === c.id)),
    [allCharacters, rows],
  );

  const onAdd = async (picked: Character[]) => {
    try {
      await Promise.all(
        picked.map((c) =>
          campaignCharactersApi.upsert(
            campaignId,
            c.id,
            defaultCampaignCharacter(c.id, c.level ?? 1, c.hp_max ?? 10),
          ),
        ),
      );
      toast(
        picked.length === 1 ? `Added ${picked[0].name} to this campaign` : `Added ${picked.length} characters`,
        'success',
      );
      setAdding(false);
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      await reload();
    }
  };

  const onSave = async (draft: CampaignCharacter) => {
    await campaignCharactersApi.upsert(campaignId, draft.character_id, draft);
    toast('Saved', 'success');
    await reload();
  };

  const onRemove = async () => {
    if (!confirmRemove) return;
    setRemoving(true);
    try {
      await campaignCharactersApi.remove(campaignId, confirmRemove.character_id);
      toast('Removed from campaign', 'success');
      setConfirmRemove(null);
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Person fontSize="small" sx={{ color: 'primary.main' }} />
          <Typography variant="h5">Characters in this campaign</Typography>
          {rows.length > 0 && (
            <Chip
              label={`${rows.length} character${rows.length === 1 ? '' : 's'}`}
              size="small"
              variant="outlined"
            />
          )}
        </Stack>
        {canEdit && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<PersonAdd />}
            onClick={() => setAdding(true)}
            disabled={addable.length === 0}
          >
            Add characters
          </Button>
        )}
      </Stack>
      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}
      {rows.length === 0 && !loadError ? (
        <Card
          variant="outlined"
          sx={{
            p: 2.5,
            textAlign: 'center',
            backgroundColor: alpha(theme.palette.primary.main, 0.04),
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ mb: canEdit && addable.length > 0 ? 1.5 : 0 }}>
            No characters in this campaign yet. Add some to track their level, HP, and conditions here.
          </Typography>
          {canEdit && addable.length > 0 && (
            <Button variant="contained" startIcon={<PersonAdd />} onClick={() => setAdding(true)}>
              Add characters
            </Button>
          )}
        </Card>
      ) : (
        <Stack
          direction="row"
          spacing={1.5}
          flexWrap="wrap"
          useFlexGap
        >
          {rows.map((r) => {
            const c = characterById.get(r.character_id);
            const name = c?.name ?? '(missing character)';
            return (
              <Card key={r.character_id} variant="outlined" sx={{ width: 280, position: 'relative' }}>
                <CardActionArea onClick={() => canEdit && setEditing(r)}>
                  <CardContent sx={{ pb: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                      <Person fontSize="small" sx={{ color: 'primary.main' }} />
                      <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
                        {name}
                      </Typography>
                      <Chip
                        label={`Lv ${r.level}`}
                        size="small"
                        color="primary"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    </Stack>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      component="div"
                      sx={{ fontFamily: '"JetBrains Mono", monospace' }}
                    >
                      Max HP {r.hp_max_override ?? c?.hp_max ?? '?'} · AC {r.ac_override ?? c?.ac ?? '?'}
                    </Typography>
                    {r.conditions.length > 0 && (
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                        {r.conditions.map((cond) => (
                          <Chip
                            key={cond}
                            label={cond}
                            size="small"
                            color="warning"
                            sx={{ height: 18, fontSize: '0.65rem' }}
                          />
                        ))}
                      </Stack>
                    )}
                  </CardContent>
                </CardActionArea>
                {canEdit && (
                  <Stack direction="row" justifyContent="flex-end" sx={{ px: 1, pb: 1 }}>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditing(r);
                      }}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmRemove(r);
                      }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Stack>
                )}
              </Card>
            );
          })}
        </Stack>
      )}

      <MultiPickDialog
        open={adding}
        title="Add characters to this campaign"
        actionLabel="Add"
        actionIcon={<PersonAdd />}
        items={addable}
        getKey={(c) => c.id}
        getLabel={(c) => c.name}
        getSecondary={(c) => `Level ${c.level ?? 1}`}
        emptyText="All your characters are already in this campaign."
        preselectAll
        onClose={() => setAdding(false)}
        onConfirm={onAdd}
      />

      {/* Edit per-campaign state dialog */}
      <CharacterStateDialog
        open={editing !== null}
        row={editing}
        character={editing ? characterById.get(editing.character_id) ?? null : null}
        onClose={() => setEditing(null)}
        onSave={onSave}
      />

      {/* Remove confirm */}
      <Dialog
        open={confirmRemove !== null}
        onClose={() => !removing && setConfirmRemove(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Remove from campaign?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Remove this character from the active campaign? The canonical
            character (on the Characters page) will not be affected.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmRemove(null)} disabled={removing}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={onRemove} disabled={removing}>
            {removing ? 'Removing…' : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const CharacterStateDialog: FC<{
  open: boolean;
  row: CampaignCharacter | null;
  character: Character | null;
  onClose: () => void;
  onSave: (draft: CampaignCharacter) => Promise<void>;
}> = ({ open, row, character, onClose, onSave }) => {
  const [draft, setDraft] = useState<CampaignCharacter | null>(row);

  useEffect(() => {
    setDraft(row);
  }, [row]);

  if (!draft) return null;
  const set = <K extends keyof CampaignCharacter>(k: K, v: CampaignCharacter[K]) =>
    setDraft((prev) => (prev ? { ...prev, [k]: v } : prev));

  return (
    <FormDialog
      open={open}
      title={character?.name ?? 'Character'}
      subtitle="Per-campaign state for the active campaign"
      onClose={onClose}
      onSave={() => onSave(draft)}
      maxWidth="sm"
    >
      <Stack spacing={2}>
        <Stack direction="row" spacing={2}>
          <TextField
            label="Level"
            type="number"
            value={draft.level ?? 1}
            onChange={(e) => set('level', parseInt(e.target.value, 10) || 1)}
            sx={{ width: 100 }}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Max HP override"
            type="number"
            value={draft.hp_max_override ?? 0}
            onChange={(e) => set('hp_max_override', parseInt(e.target.value, 10) || 0)}
            helperText={`Canonical: ${character?.hp_max ?? '?'}`}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="AC override"
            type="number"
            value={draft.ac_override ?? ''}
            onChange={(e) =>
              set('ac_override', e.target.value === '' ? null : parseInt(e.target.value, 10) || 0)
            }
            helperText={`Canonical: ${character?.ac ?? '?'}`}
            InputLabelProps={{ shrink: true }}
          />
        </Stack>
        <Autocomplete
          multiple
          options={STANDARD_CONDITIONS}
          value={draft.conditions}
          onChange={(_e, v) => set('conditions', v)}
          renderInput={(p) => (
            <TextField {...p} label="Conditions" placeholder="Pick or type…" />
          )}
        />
        <Box>
          <Typography variant="overline" color="primary.main">
            Death saves
          </Typography>
          <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
            <DeathSavePips
              label="Successes"
              value={draft.death_save_successes ?? 0}
              onChange={(v) => set('death_save_successes', v)}
              color="success"
            />
            <DeathSavePips
              label="Failures"
              value={draft.death_save_failures ?? 0}
              onChange={(v) => set('death_save_failures', v)}
              color="error"
            />
          </Stack>
        </Box>
        <TextField
          label="Notes"
          value={draft.notes ?? ''}
          onChange={(e) => set('notes', e.target.value)}
          fullWidth
          multiline
          rows={3}
          InputLabelProps={{ shrink: true }}
          placeholder="Per-campaign notes — e.g. subclass picked up, items found, status effects"
        />
      </Stack>
    </FormDialog>
  );
};

const DeathSavePips: FC<{
  label: string;
  value: number;
  onChange: (v: number) => void;
  color: 'success' | 'error';
}> = ({ label, value, onChange, color }) => {
  return (
    <Stack>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
        {label}
      </Typography>
      <Stack direction="row" spacing={0.5}>
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            onClick={() => onChange(i === value ? i - 1 : i + 1)}
            sx={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              border: 2,
              borderColor: i < value ? `${color}.main` : 'divider',
              backgroundColor: i < value ? `${color}.main` : 'transparent',
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
          />
        ))}
      </Stack>
    </Stack>
  );
};

export default CampaignCharacters;

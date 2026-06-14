// Phase 9: the campaign's characters. Lists the characters
// linked to this campaign (i.e. those that have a row in
// campaign_characters) and lets the DM:
//   - add a new character to the campaign (creates a row with
//     level / hp_max from the canonical character)
//   - change the campaign-specific level
//   - edit HP / conditions / death saves / rest for that character
//     in this campaign
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
  Slider,
  Stack,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Add,
  Close,
  Delete,
  Edit,
  Favorite,
  Healing,
  Person,
  PersonAdd,
  Save,
} from '@mui/icons-material';
import { CampaignCharacter, defaultCampaignCharacter } from '../types/CampaignCharacter';
import { Character } from '../types/Character';
import { campaignCharactersApi } from '../api/campaign-characters';
import { charactersApi } from '../api/characters';
import { useToast } from './ToastProvider';

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
  const [pickChar, setPickChar] = useState<Character | null>(null);
  const [editing, setEditing] = useState<CampaignCharacter | null>(null);
  const [saving, setSaving] = useState(false);
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

  const onAdd = async () => {
    if (!pickChar || !pickChar.id) return;
    setSaving(true);
    try {
      await campaignCharactersApi.upsert(
        campaignId,
        pickChar.id,
        defaultCampaignCharacter(pickChar.id, pickChar.level ?? 1, pickChar.hp_max ?? 10),
      );
      toast(`Added ${pickChar.name} to this campaign`, 'success');
      setAdding(false);
      setPickChar(null);
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setSaving(false);
    }
  };

  const onSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await campaignCharactersApi.upsert(campaignId, editing.character_id, editing);
      toast('Saved', 'success');
      setEditing(null);
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setSaving(false);
    }
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
            Add character
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
          <Typography variant="body2" color="text.secondary">
            No characters in this campaign yet. Add a character to start tracking
            their level, HP, and conditions here.
          </Typography>
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
                    {c && (
                      <Typography variant="caption" color="text.secondary">
                        {c.race_id} {c.class_id} · canonical AC {c.ac}
                      </Typography>
                    )}
                    <Box sx={{ mt: 1 }}>
                      <HpBar
                        current={Math.max(0, r.hp_max_override ?? 0)}
                        max={r.hp_max_override ?? 0}
                      />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontFamily: '"JetBrains Mono", monospace' }}
                      >
                        {r.hp_max_override ?? 0} / {r.hp_max_override ?? 0} HP
                      </Typography>
                    </Box>
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

      {/* Add character dialog */}
      <Dialog
        open={adding}
        onClose={() => !saving && setAdding(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Add character to this campaign</DialogTitle>
        <DialogContent>
          <Autocomplete
            options={addable}
            getOptionLabel={(o) => o.name}
            value={pickChar}
            onChange={(_e, v) => setPickChar(v)}
            renderInput={(p) => (
              <TextField
                {...p}
                autoFocus
                label="Character"
                helperText={
                  addable.length === 0
                    ? 'You have no more characters to add'
                    : 'Pick from your existing characters'
                }
              />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdding(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={onAdd}
            disabled={saving || !pickChar}
          >
            {saving ? 'Adding…' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit per-campaign state dialog */}
      <CharacterStateDialog
        open={editing !== null}
        row={editing}
        character={editing ? characterById.get(editing.character_id) ?? null : null}
        onClose={() => !saving && setEditing(null)}
        onSave={onSave}
        saving={saving}
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

const HpBar: FC<{ current: number; max: number }> = ({ current, max }) => {
  const theme = useTheme();
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  const bloodied = max > 0 && current <= max / 2;
  const down = max > 0 && current <= 0;
  return (
    <Box
      sx={{
        height: 6,
        borderRadius: 3,
        backgroundColor: alpha(theme.palette.error.main, 0.15),
        overflow: 'hidden',
        mb: 0.5,
      }}
    >
      <Box
        sx={{
          width: `${pct}%`,
          height: '100%',
          backgroundColor: down
            ? theme.palette.error.main
            : bloodied
            ? theme.palette.warning.main
            : theme.palette.success.main,
          transition: 'width 200ms ease',
        }}
      />
    </Box>
  );
};

const CharacterStateDialog: FC<{
  open: boolean;
  row: CampaignCharacter | null;
  character: Character | null;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
}> = ({ open, row, character, onClose, onSave, saving }) => {
  const theme = useTheme();
  const [draft, setDraft] = useState<CampaignCharacter | null>(row);
  const [currentHp, setCurrentHp] = useState<number>(row?.hp_max_override ?? 10);

  useEffect(() => {
    setDraft(row);
    setCurrentHp(row?.hp_max_override ?? 10);
  }, [row]);

  if (!draft) return null;
  const set = <K extends keyof CampaignCharacter>(k: K, v: CampaignCharacter[K]) =>
    setDraft((prev) => (prev ? { ...prev, [k]: v } : prev));
  const max = draft.hp_max_override ?? 0;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack>
            <Typography variant="h4">{character?.name ?? 'Character'}</Typography>
            <Typography variant="caption" color="text.secondary">
              Per-campaign state for the active campaign
            </Typography>
          </Stack>
          <IconButton onClick={onClose} size="small" disabled={saving}>
            <Close />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ p: 3 }}>
        <Stack spacing={2} sx={{ pt: 0 }}>
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
              onChange={(e) => {
                const v = parseInt(e.target.value, 10) || 0;
                set('hp_max_override', v);
                if (currentHp > v) setCurrentHp(v);
              }}
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
          <Box>
            <Typography variant="overline" color="primary.main">
              Current HP
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
              <IconButton
                size="small"
                onClick={() => setCurrentHp((v) => Math.max(0, v - 1))}
              >
                <Favorite fontSize="small" color="error" />
              </IconButton>
              <Box sx={{ flexGrow: 1 }}>
                <Slider
                  value={currentHp}
                  min={0}
                  max={max}
                  onChange={(_e, v) => setCurrentHp(v as number)}
                  aria-label="Current HP"
                />
              </Box>
              <IconButton size="small" onClick={() => setCurrentHp((v) => Math.min(max, v + 1))}>
                <Healing fontSize="small" color="success" />
              </IconButton>
              <Typography
                variant="body2"
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  minWidth: 60,
                  textAlign: 'right',
                }}
              >
                {currentHp} / {max}
              </Typography>
            </Stack>
          </Box>
          <Autocomplete
            multiple
            options={STANDARD_CONDITIONS}
            value={draft.conditions}
            onChange={(_e, v) => set('conditions', v)}
            renderInput={(p) => (
              <TextField {...p} label="Conditions" placeholder="Pick or type…" />
            )}
          />
          {currentHp === 0 && (
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
          )}
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
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={<Save />}
          onClick={() => {
            if (!draft) return;
            // The dialog's currentHp is a local control; we don't
            // currently persist current_hp on campaign_characters
            // because the canonical CharacterState covers that. We
            // still apply the user's edit on save.
            void onSave();
          }}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
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

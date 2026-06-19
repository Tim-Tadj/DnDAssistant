// Phase 9: the Builder tab. Contains the randomizer / preview
// UI. The output is written to EncounterContext.monstersInCombat
// and the live tracker (Live tab) reads from there.
//
// "Save to campaign" persists the current `monstersInCombat` to
// the active campaign's library (i.e. encounter_saves with
// campaign_id set).

import React, { FC, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Slider,
  Stack,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Casino,
  CasinoOutlined,
  Close,
  People,
  Save,
} from '@mui/icons-material';
import { Monster } from '../types/Monster';
import useGenerateEncounter from './use-generate-encounter';
import { useEncounter } from './EncounterContext';
import { useAuth } from '../auth/AuthContext';
import { useCampaignContext } from '../shared/CampaignContext';
import { useToast } from '../shared/ToastProvider';
import { encounterSavesApi } from '../api/encounter-saves';
import { charactersApi } from '../api/characters';
import { collapseMonstersToRefs } from '../api/hydrate-encounter';
import { EncounterSave } from '../types/EncounterSave';
import { useMonsterStatPane } from '../shared/MonsterStatPane';
import { ENCOUNTER_MULTIPLIERS, MONSTER_TYPES, ALIGNMENTS, SIZES, DIFFICULTIES } from '../constants';

const PARTY_LEVELS = Array.from({ length: 20 }, (_, i) => i + 1);
const PARTY_SIZES = Array.from({ length: 10 }, (_, i) => i + 1);

const EncounterBuilder: FC = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const { toast } = useToast();
  const statPane = useMonsterStatPane();
  const { activeParty, activeCampaign } = useCampaignContext();
  const enc = useEncounter();

  const {
    searchQuery,
    setSearchQuery,
    setMonsterTypes,
    setAlignments,
    setSizes,
    playerLevel,
    setPlayerLevel,
    partySize,
    setPartySize,
    difficulty,
    setDifficulty,
    experience,
    setExperience,
    monstersInCombat: generated,
    determineMonstersInEncounter,
    clearEncounter,
  } = useGenerateEncounter();

  // The encounter context holds the "real" list once the user
  // clicks "Add to live". The builder's preview is the freshly
  // generated list; clicking "Send to Live" copies it in.
  const onAddToLive = () => {
    enc.setMonsters(generated);
    toast('Encounter ready — switch to the Live tab to run it', 'success');
  };

  const onClearPreview = () => {
    clearEncounter();
    toast('Preview cleared', 'info');
  };

  const onUseMyParty = async () => {
    if (!user) return;
    try {
      const chars = await charactersApi.list();
      if (chars.length === 0) {
        toast('You have no characters yet. Create one on the Characters page first.', 'warning');
        return;
      }
      const memberIds = activeParty?.member_ids ?? [];
      const filtered = memberIds.length > 0
        ? chars.filter((c) => c.id && memberIds.includes(c.id))
        : chars;
      if (filtered.length === 0) {
        toast(`Party "${activeParty?.name}" has no members. Add some on the Characters page.`, 'warning');
        return;
      }
      setPartySize(filtered.length);
      const avgLevel = Math.round(
        filtered.reduce((acc, c) => acc + (c.level ?? 1), 0) / filtered.length,
      );
      setPlayerLevel(avgLevel);
      toast(
        `${activeParty ? `Party "${activeParty.name}"` : 'All characters'}: ${filtered.length} character${filtered.length === 1 ? '' : 's'}, average level ${avgLevel}.`,
        'success',
      );
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    }
  };

  // Save dialog state
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveNotes, setSaveNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const onSaveEncounter = async () => {
    if (!user) return;
    if (generated.length === 0) {
      toast('Generate an encounter first', 'warning');
      return;
    }
    if (!activeCampaign) {
      toast('Pick an active campaign to save to', 'warning');
      return;
    }
    setSaving(true);
    try {
      const { refs, totalXp } = collapseMonstersToRefs(generated);
      const save: EncounterSave = {
        campaign_id: activeCampaign.id,
        name: saveName || `Encounter ${new Date().toLocaleDateString()}`,
        monsters: refs,
        party_snapshot_ids: [],
        difficulty,
        total_xp: totalXp,
        played_on: new Date().toISOString().slice(0, 10),
        notes: saveNotes,
      };
      await encounterSavesApi.create(save);
      toast('Encounter saved to library', 'success');
      setSaveOpen(false);
      setSaveName('');
      setSaveNotes('');
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setSaving(false);
    }
  };

  // Preview grouping
  const preview = useMemo(() => {
    const map = new Map<string, Monster>();
    for (const m of generated) map.set(m.name, m);
    return Array.from(map.entries()).map(([name, m]) => ({
      name,
      monster: m,
      count: generated.filter((x) => x.name === name).length,
    }));
  }, [generated]);

  const totalXP = useMemo(
    () =>
      generated.reduce(
        (acc, m) => acc + Number(m.challenge?.split('(')[1]?.replace(/[^0-9.]/g, '') ?? 0),
        0,
      ),
    [generated],
  );

  const adjustedXP = useMemo(() => {
    const mult =
      ENCOUNTER_MULTIPLIERS.find(
        (e) => generated.length <= e.numberOfMonsters || e.numberOfMonsters === 15,
      )?.multiplier ?? 1;
    return Math.round(totalXP * mult);
  }, [generated, totalXP]);

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
      {/* Controls */}
      <Paper sx={{ p: 2, width: { xs: '100%', md: 360 }, flexShrink: 0 }}>
        <Stack spacing={2}>
          <Typography variant="h5">Filters</Typography>
          <TextField
            fullWidth
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            label="Keywords"
            size="small"
            helperText="Match by monster name (e.g. dragon, orc)"
            InputLabelProps={{ shrink: true }}
          />
          <Autocomplete
            multiple
            options={MONSTER_TYPES}
            onChange={(_e, v) => setMonsterTypes(v)}
            size="small"
            renderInput={(p) => <TextField {...p} label="Monster type" InputLabelProps={{ shrink: true }} />}
          />
          <Autocomplete
            multiple
            options={ALIGNMENTS}
            onChange={(_e, v) => setAlignments(v)}
            size="small"
            renderInput={(p) => <TextField {...p} label="Alignment" InputLabelProps={{ shrink: true }} />}
          />
          <Autocomplete
            multiple
            options={SIZES}
            onChange={(_e, v) => setSizes(v)}
            size="small"
            renderInput={(p) => <TextField {...p} label="Size" InputLabelProps={{ shrink: true }} />}
          />
          <Divider />
          <Typography variant="h5">Party</Typography>
          <Stack direction="row" spacing={1}>
            <Autocomplete
              options={PARTY_LEVELS}
              value={playerLevel}
              onChange={(_e, v) => setPlayerLevel(v ?? 1)}
              sx={{ flex: 1 }}
              size="small"
              renderInput={(p) => <TextField {...p} label="Avg level" InputLabelProps={{ shrink: true }} />}
              getOptionLabel={(o) => `${o}`}
            />
            <Autocomplete
              options={PARTY_SIZES}
              value={partySize}
              onChange={(_e, v) => setPartySize(v ?? 1)}
              sx={{ flex: 1 }}
              size="small"
              renderInput={(p) => <TextField {...p} label="Size" InputLabelProps={{ shrink: true }} />}
              getOptionLabel={(o) => `${o}`}
            />
          </Stack>
          <Autocomplete
            options={DIFFICULTIES}
            value={difficulty}
            onChange={(_e, v) => setDifficulty(v ?? 'Easy')}
            size="small"
            renderInput={(p) => <TextField {...p} label="Difficulty" InputLabelProps={{ shrink: true }} />}
          />
          {activeParty && (
            <Alert severity="info" sx={{ py: 0 }}>
              Using party: <strong>{activeParty.name}</strong> ({activeParty.member_ids.length} members)
            </Alert>
          )}
          <Button size="small" variant="outlined" onClick={onUseMyParty} startIcon={<People />}>
            Use my party
          </Button>
          <Divider />
          <Typography variant="h5">XP range</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              size="small"
              type="number"
              value={experience[0]}
              onChange={(e) =>
                setExperience([parseInt(e.target.value, 10) || 0, experience[1]])
              }
              sx={{ width: 80 }}
              label="Min"
              InputLabelProps={{ shrink: true }}
            />
            <Slider
              value={experience}
              onChange={(_e, v) => setExperience(v as number[])}
              valueLabelDisplay="auto"
              min={0}
              max={2000}
              sx={{ flexGrow: 1 }}
            />
            <TextField
              size="small"
              type="number"
              value={experience[1]}
              onChange={(e) =>
                setExperience([experience[0], parseInt(e.target.value, 10) || 0])
              }
              sx={{ width: 80 }}
              label="Max"
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
          <Button
            variant="contained"
            size="large"
            startIcon={<Casino />}
            onClick={determineMonstersInEncounter}
          >
            Generate
          </Button>
        </Stack>
      </Paper>

      {/* Preview */}
      <Paper sx={{ p: 2, flex: '1 1 auto', minHeight: 360, width: '100%' }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}
        >
          <Stack>
            <Typography variant="h5">Preview</Typography>
            <Typography variant="caption" color="text.secondary">
              {generated.length === 0
                ? 'No encounter generated yet.'
                : `${generated.length} combatant${generated.length === 1 ? '' : 's'} · ${totalXP} XP raw · ${adjustedXP} XP adjusted`}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            {generated.length > 0 && (
              <Button
                size="small"
                variant="outlined"
                color="inherit"
                startIcon={<Close />}
                onClick={onClearPreview}
              >
                Clear
              </Button>
            )}
            {generated.length > 0 && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<Save />}
                onClick={() => setSaveOpen(true)}
                disabled={!activeCampaign}
              >
                Save to library
              </Button>
            )}
            {generated.length > 0 && (
              <Button
                size="small"
                variant="contained"
                onClick={onAddToLive}
              >
                Send to Live
              </Button>
            )}
          </Stack>
        </Stack>

        {generated.length === 0 ? (
          <Box
            sx={{
              py: 6,
              textAlign: 'center',
              border: `1px dashed ${theme.palette.divider}`,
              borderRadius: 2,
              color: 'text.secondary',
            }}
          >
            <CasinoOutlined sx={{ fontSize: 48, opacity: 0.4 }} />
            <Typography variant="h6" sx={{ mt: 1 }}>
              Generate an encounter
            </Typography>
            <Typography variant="body2">
              Pick filters and click <strong>Generate</strong>.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1}>
            {preview.map(({ name, monster, count }) => (
              <Stack
                key={name}
                direction="row"
                alignItems="center"
                spacing={1.5}
                sx={{
                  p: 1.5,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 1,
                  backgroundColor: alpha(theme.palette.primary.main, 0.04),
                }}
              >
                <Chip
                  label={`×${count}`}
                  color="primary"
                  sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700 }}
                />
                <Box
                  sx={{ flexGrow: 1, minWidth: 0, cursor: 'pointer' }}
                  onClick={() => statPane.open(monster)}
                >
                  <Typography
                    variant="body1"
                    fontWeight={600}
                    noWrap
                    sx={{ '&:hover': { textDecoration: 'underline' } }}
                  >
                    {name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {monster.meta}
                  </Typography>
                </Box>
                <Stack alignItems="flex-end">
                  <Typography
                    variant="body2"
                    sx={{ fontFamily: '"JetBrains Mono", monospace' }}
                  >
                    CR {monster.challenge}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    AC {monster.ac} · HP {monster.hp}
                  </Typography>
                </Stack>
              </Stack>
            ))}
          </Stack>
        )}
      </Paper>

      <Dialog
        open={saveOpen}
        onClose={() => !saving && setSaveOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Save encounter to {activeCampaign?.name ?? 'campaign'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 0 }}>
            <TextField
              label="Encounter name"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
              placeholder="e.g. Ambush at Iron Keep"
            />
            <TextField
              label="Notes"
              value={saveNotes}
              onChange={(e) => setSaveNotes(e.target.value)}
              fullWidth
              multiline
              rows={3}
              InputLabelProps={{ shrink: true }}
              placeholder="What happened, who's TPK'd, etc."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={onSaveEncounter}
            disabled={saving}
            startIcon={<Save />}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default EncounterBuilder;

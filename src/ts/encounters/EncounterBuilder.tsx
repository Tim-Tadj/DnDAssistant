// The Build tab. Generate an encounter for the active party, then
// tweak it: every monster group has a checkbox (all ticked after
// Generate), so "Reroll selected" works as a reroll-all that you
// narrow down by unticking the groups you want to keep. Groups can
// also be removed, resized, or added by hand. "Run encounter" hands
// the list to the tracker (EncounterContext) and switches to Run.
//
// "Save to library" persists the list to the active campaign's
// library (encounter_saves with campaign_id set).

import React, { FC, useEffect, useMemo, useState } from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Slider,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Add,
  ArrowForward,
  Autorenew,
  Casino,
  CasinoOutlined,
  Delete,
  ExpandLess,
  ExpandMore,
  Remove,
  Save,
  Sync,
} from '@mui/icons-material';
import { Monster } from '../types/Monster';
import useGenerateEncounter, { getMonsterXP, multiplierFor, rateDifficulty } from './use-generate-encounter';
import { useEncounter } from './EncounterContext';
import { useAuth } from '../auth/AuthContext';
import { useCampaignContext } from '../shared/CampaignContext';
import { useSettings } from '../shared/SettingsContext';
import { useToast } from '../shared/ToastProvider';
import { useConfirm } from '../shared/useConfirm';
import { encounterSavesApi } from '../api/encounter-saves';
import { charactersApi } from '../api/characters';
import { collapseMonstersToRefs } from '../api/hydrate-encounter';
import { EncounterSave } from '../types/EncounterSave';
import { useMonsterStatPane } from '../shared/MonsterStatPane';
import { MONSTER_TYPES, ALIGNMENTS, SIZES, DIFFICULTIES } from '../constants';
import SelectMonster from './select-monster';
import { useEncounterTab } from './encounter-tab';

const PARTY_LEVELS = Array.from({ length: 20 }, (_, i) => i + 1);
const PARTY_SIZES = Array.from({ length: 10 }, (_, i) => i + 1);

const DIFFICULTY_COLORS: Record<string, 'default' | 'success' | 'info' | 'warning' | 'error'> = {
  Trivial: 'default',
  Easy: 'success',
  Medium: 'info',
  Hard: 'warning',
  Deadly: 'error',
};

const mono = { fontFamily: '"JetBrains Mono", monospace' };

const EncounterBuilder: FC = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const { toast } = useToast();
  const statPane = useMonsterStatPane();
  const { activeParty, activeCampaign } = useCampaignContext();
  const { settings } = useSettings();
  const enc = useEncounter();
  const [, setTab] = useEncounterTab();
  const { confirm, dialog } = useConfirm<'replace' | 'append'>();

  const gen = useGenerateEncounter(settings.defaultDifficulty);
  const { monstersInCombat: generated, playerLevel, partySize, difficulty } = gen;

  const [showMore, setShowMore] = useState(settings.showAdvancedFilters);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [partyLabel, setPartyLabel] = useState<string | null>(null);

  // Pull level + size from the active party whenever it changes, so
  // the DM doesn't have to press a button before every generate.
  const syncParty = async (announce: boolean) => {
    if (!user) return;
    try {
      const chars = await charactersApi.list();
      const memberIds = activeParty?.member_ids ?? [];
      const members = memberIds.length > 0 ? chars.filter((c) => c.id && memberIds.includes(c.id)) : [];
      if (members.length === 0) {
        setPartyLabel(null);
        if (announce) toast('No party members found. Set up a party on the Characters page.', 'warning');
        return;
      }
      const avgLevel = Math.round(members.reduce((acc, c) => acc + (c.level ?? 1), 0) / members.length);
      gen.setPartySize(members.length);
      gen.setPlayerLevel(Math.min(20, Math.max(1, avgLevel)));
      setPartyLabel(activeParty?.name ?? null);
      if (announce) toast(`Synced ${members.length} characters, average level ${avgLevel}`, 'success');
    } catch (e) {
      if (announce) toast(e instanceof Error ? e.message : String(e), 'error');
    }
  };

  useEffect(() => {
    void syncParty(false);
  }, [user, activeParty?.id, activeParty?.member_ids.length]);

  // Preview grouping, in first-appearance order.
  const preview = useMemo(() => {
    const map = new Map<string, { monster: Monster; count: number }>();
    for (const m of generated) {
      const g = map.get(m.name);
      if (g) g.count += 1;
      else map.set(m.name, { monster: m, count: 1 });
    }
    return Array.from(map.entries()).map(([name, g]) => ({ name, ...g }));
  }, [generated]);

  // Drop selections for groups that no longer exist.
  useEffect(() => {
    setSelected((prev) => {
      const names = new Set(preview.map((p) => p.name));
      const next = new Set(Array.from(prev).filter((n) => names.has(n)));
      return next.size === prev.size ? prev : next;
    });
  }, [preview]);

  const totalXP = useMemo(() => generated.reduce((acc, m) => acc + getMonsterXP(m), 0), [generated]);
  const adjustedXP = Math.round(totalXP * multiplierFor(generated.length));
  const rating = generated.length > 0 ? rateDifficulty(adjustedXP, playerLevel, partySize) : null;

  const onGenerate = () => {
    const next = gen.determineMonstersInEncounter();
    if (next.length === 0) {
      toast('No monsters fit those filters and budget. Try loosening the filters.', 'warning');
    }
    setSelected(new Set(next.map((m) => m.name)));
  };

  const selectedNames = Array.from(selected);
  const allSelected = preview.length > 0 && selected.size === preview.length;

  const onRerollSelected = (names: string[]) => {
    const swaps = gen.rerollGroups(names);
    if (swaps.size === 0) {
      toast('No alternatives found for those monsters', 'info');
      return;
    }
    // Rerolled groups stay ticked so you can keep rolling them.
    setSelected((prev) => {
      const next = new Set(prev);
      swaps.forEach((to, from) => {
        if (next.delete(from)) next.add(to);
      });
      return next;
    });
  };

  const onRemoveSelected = () => {
    gen.removeGroups(selectedNames);
    setSelected(new Set());
  };

  const onRun = async () => {
    if (enc.monstersInCombat.length > 0) {
      const choice = await confirm({
        title: 'An encounter is already running',
        body: 'Replace it with this one, or add these monsters to the current fight?',
        choices: [
          { label: 'Add to current fight', value: 'append' },
          { label: 'Replace', value: 'replace', primary: true },
        ],
      });
      if (!choice) return;
      if (choice === 'append') enc.addMonsters(generated);
      else enc.setMonsters(generated);
    } else {
      enc.setMonsters(generated);
    }
    setTab('run');
  };

  // Save dialog state
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveNotes, setSaveNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const onSaveEncounter = async () => {
    if (!user || !activeCampaign || generated.length === 0) return;
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

  const advancedCount =
    gen.monsterTypes.length + gen.alignments.length + gen.sizes.length;

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
      {dialog}
      {/* Controls */}
      <Paper sx={{ p: 2, width: { xs: '100%', md: 340 }, flexShrink: 0 }}>
        <Stack spacing={2}>
          {/* Party */}
          <Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="overline" color="text.secondary">
                Party
              </Typography>
              {activeParty && (
                <Tooltip title="Re-sync level and size from the active party" arrow>
                  <IconButton size="small" onClick={() => syncParty(true)}>
                    <Sync fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
            {partyLabel && (
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                {partyLabel}
              </Typography>
            )}
            <Stack direction="row" spacing={1}>
              <Autocomplete
                options={PARTY_SIZES}
                value={partySize}
                onChange={(_e, v) => gen.setPartySize(v ?? 1)}
                sx={{ flex: 1 }}
                size="small"
                disableClearable
                renderInput={(p) => <TextField {...p} label="Characters" InputLabelProps={{ shrink: true }} />}
                getOptionLabel={(o) => `${o}`}
              />
              <Autocomplete
                options={PARTY_LEVELS}
                value={playerLevel}
                onChange={(_e, v) => gen.setPlayerLevel(v ?? 1)}
                sx={{ flex: 1 }}
                size="small"
                disableClearable
                renderInput={(p) => <TextField {...p} label="Avg level" InputLabelProps={{ shrink: true }} />}
                getOptionLabel={(o) => `${o}`}
              />
            </Stack>
          </Box>

          {/* Difficulty */}
          <Box>
            <Typography variant="overline" color="text.secondary">
              Difficulty
            </Typography>
            <ToggleButtonGroup
              exclusive
              fullWidth
              size="small"
              value={difficulty}
              onChange={(_e, v) => v && gen.setDifficulty(v)}
            >
              {DIFFICULTIES.map((d) => (
                <ToggleButton key={d} value={d}>
                  {d}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary">
              XP budget: {gen.xpBudget.toLocaleString()}
            </Typography>
          </Box>

          <TextField
            fullWidth
            value={gen.searchQuery}
            onChange={(e) => gen.setSearchQuery(e.target.value)}
            label="Monster names (optional)"
            size="small"
            placeholder="e.g. goblin+wolf"
            InputLabelProps={{ shrink: true }}
          />

          <Button
            size="small"
            color="inherit"
            onClick={() => setShowMore((s) => !s)}
            endIcon={showMore ? <ExpandLess /> : <ExpandMore />}
            sx={{ alignSelf: 'flex-start' }}
          >
            {showMore ? 'Fewer filters' : `More filters${advancedCount ? ` (${advancedCount})` : ''}`}
          </Button>
          <Collapse in={showMore} unmountOnExit={false}>
            <Stack spacing={2}>
              <Autocomplete
                multiple
                options={MONSTER_TYPES}
                value={gen.monsterTypes}
                onChange={(_e, v) => gen.setMonsterTypes(v)}
                size="small"
                renderInput={(p) => <TextField {...p} label="Monster type" InputLabelProps={{ shrink: true }} />}
              />
              <Autocomplete
                multiple
                options={ALIGNMENTS}
                value={gen.alignments}
                onChange={(_e, v) => gen.setAlignments(v)}
                size="small"
                renderInput={(p) => <TextField {...p} label="Alignment" InputLabelProps={{ shrink: true }} />}
              />
              <Autocomplete
                multiple
                options={SIZES}
                value={gen.sizes}
                onChange={(_e, v) => gen.setSizes(v)}
                size="small"
                renderInput={(p) => <TextField {...p} label="Size" InputLabelProps={{ shrink: true }} />}
              />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  XP per monster: {gen.experience[0].toLocaleString()} – {gen.experience[1].toLocaleString()}
                </Typography>
                <Slider
                  value={gen.experience}
                  onChange={(_e, v) => gen.setExperience(v as number[])}
                  valueLabelDisplay="auto"
                  min={0}
                  max={Math.max(2000, gen.xpBudget)}
                  size="small"
                />
              </Box>
            </Stack>
          </Collapse>

          <Button variant="contained" size="large" startIcon={<Casino />} onClick={onGenerate}>
            {generated.length > 0 ? 'Generate new' : 'Generate'}
          </Button>
        </Stack>
      </Paper>

      {/* Preview */}
      <Paper sx={{ p: 2, flex: '1 1 auto', minHeight: 360, width: '100%' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1, flexWrap: 'wrap', gap: 1 }}>
          <Stack>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="h5">Encounter</Typography>
              {rating && (
                <Tooltip title={`Rated for ${partySize} characters at level ${playerLevel}`} arrow>
                  <Chip size="small" label={rating} color={DIFFICULTY_COLORS[rating]} />
                </Tooltip>
              )}
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {generated.length === 0
                ? 'Nothing here yet.'
                : `${generated.length} monster${generated.length === 1 ? '' : 's'} · ${totalXP.toLocaleString()} XP · ${adjustedXP.toLocaleString()} adjusted`}
            </Typography>
          </Stack>
          <SelectMonster
            onSelectMonster={gen.addMonsters}
            buttonLabel="Add by hand"
            actionLabel="to encounter"
            buttonProps={{ variant: 'text' }}
          />
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
            <Typography variant="body2" sx={{ mb: 2 }}>
              Pick a difficulty and hit <strong>Generate</strong>, or add monsters by hand.
            </Typography>
            <Button variant="contained" startIcon={<Casino />} onClick={onGenerate}>
              Generate
            </Button>
          </Box>
        ) : (
          <>
            {/* Selection toolbar */}
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              flexWrap="wrap"
              useFlexGap
              sx={{
                px: 0.5,
                py: 0.5,
                mb: 1,
                borderRadius: 1,
                backgroundColor: selected.size > 0 ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
              }}
            >
              <Checkbox
                size="small"
                checked={allSelected}
                indeterminate={selected.size > 0 && !allSelected}
                onChange={() => setSelected(allSelected ? new Set() : new Set(preview.map((p) => p.name)))}
                inputProps={{ 'aria-label': 'select all' }}
              />
              <Typography variant="body2" sx={{ mr: 1 }}>
                {selected.size === 0
                  ? 'Tick monsters to reroll or remove them'
                  : `${selected.size} of ${preview.length} selected`}
              </Typography>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Autorenew />}
                disabled={selected.size === 0}
                onClick={() => onRerollSelected(selectedNames)}
              >
                Reroll selected
              </Button>
              <Button
                size="small"
                color="inherit"
                startIcon={<Delete />}
                disabled={selected.size === 0}
                onClick={onRemoveSelected}
              >
                Remove
              </Button>
            </Stack>

            <Stack spacing={1}>
              {preview.map(({ name, monster, count }) => {
                const checked = selected.has(name);
                return (
                  <Stack
                    key={name}
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{
                      p: 1,
                      pl: 0.5,
                      border: `1px solid ${checked ? alpha(theme.palette.primary.main, 0.5) : theme.palette.divider}`,
                      borderRadius: 1,
                      backgroundColor: checked ? alpha(theme.palette.primary.main, 0.06) : 'transparent',
                    }}
                  >
                    <Checkbox
                      size="small"
                      checked={checked}
                      onChange={() =>
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(name)) next.delete(name);
                          else next.add(name);
                          return next;
                        })
                      }
                      inputProps={{ 'aria-label': `select ${name}` }}
                    />
                    <Stack
                      direction="row"
                      alignItems="center"
                      sx={{ border: 1, borderColor: 'divider', borderRadius: 1, flexShrink: 0 }}
                    >
                      <IconButton size="small" aria-label="fewer" onClick={() => gen.setGroupCount(name, count - 1)}>
                        <Remove sx={{ fontSize: 16 }} />
                      </IconButton>
                      <Typography variant="body2" sx={{ ...mono, minWidth: 24, textAlign: 'center', fontWeight: 700 }}>
                        ×{count}
                      </Typography>
                      <IconButton size="small" aria-label="more" onClick={() => gen.setGroupCount(name, count + 1)}>
                        <Add sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Stack>
                    <Box sx={{ flexGrow: 1, minWidth: 0, cursor: 'pointer', pl: 0.5 }} onClick={() => statPane.open(monster)}>
                      <Typography
                        variant="body1"
                        fontWeight={600}
                        noWrap
                        sx={{ '&:hover': { textDecoration: 'underline' } }}
                      >
                        {name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap component="div">
                        {monster.meta}
                      </Typography>
                    </Box>
                    <Stack alignItems="flex-end" sx={{ flexShrink: 0 }}>
                      <Typography variant="body2" sx={mono}>
                        CR {monster.challenge}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        AC {monster.ac} · HP {monster.hp}
                      </Typography>
                    </Stack>
                    <Tooltip title="Reroll this one" arrow>
                      <IconButton size="small" onClick={() => onRerollSelected([name])}>
                        <Autorenew fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                );
              })}
            </Stack>

            <Divider sx={{ my: 2 }} />

            {/* Next step */}
            <Stack direction="row" alignItems="center" spacing={1} justifyContent="flex-end" flexWrap="wrap" useFlexGap>
              <Button color="inherit" onClick={gen.clearEncounter}>
                Clear
              </Button>
              <Tooltip title={activeCampaign ? '' : 'Pick a campaign at the top to save encounters'} arrow>
                <span>
                  <Button
                    variant="outlined"
                    startIcon={<Save />}
                    onClick={() => setSaveOpen(true)}
                    disabled={!activeCampaign}
                  >
                    Save to library
                  </Button>
                </span>
              </Tooltip>
              <Button variant="contained" size="large" endIcon={<ArrowForward />} onClick={onRun}>
                Run encounter
              </Button>
            </Stack>
          </>
        )}
      </Paper>

      <Dialog open={saveOpen} onClose={() => !saving && setSaveOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Save encounter to {activeCampaign?.name ?? 'campaign'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Encounter name"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              fullWidth
              autoFocus
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
          <Button variant="contained" onClick={onSaveEncounter} disabled={saving} startIcon={<Save />}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default EncounterBuilder;

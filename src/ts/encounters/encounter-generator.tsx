/**
 * Encounter generator - controls on the left, generated encounter preview
 * on the right. The preview lists each monster with count, CR, and a
 * running XP total. "Add to combat" sends the encounter to the tracker.
 */

import React, { FC, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Paper,
  Slider,
  Stack,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Add,
  Casino,
  CasinoOutlined,
  Close,
  Group,
  People,
} from '@mui/icons-material';
import {
  ALIGNMENTS,
  DIFFICULTIES,
  ENCOUNTER_MULTIPLIERS,
  EXPERIENCE_THRESHOLDS,
  MAX_EXPERIENCE,
  MIN_EXPERIENCE,
  MONSTER_TYPES,
  SIZES,
} from '../constants';
import { Monster } from '../types/Monster';
import useGenerateEncounter from './use-generate-encounter';
import EncounterTracker from './encounter-tracker';
import { charactersApi } from '../api/characters';
import { partiesApi } from '../api/parties';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../shared/ToastProvider';
import { Party } from '../types/Party';

const PARTY_LEVELS = Array.from({ length: 20 }, (_, i) => i + 1);
const PARTY_SIZES = Array.from({ length: 10 }, (_, i) => i + 1);

const EncounterGenerator: FC = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const { toast } = useToast();
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
    monstersInCombat,
    determineMonstersInEncounter,
    clearEncounter,
  } = useGenerateEncounter();

  const [partyHint, setPartyHint] = useState<string | null>(null);
  const [partyHintError, setPartyHintError] = useState<string | null>(null);
  const [parties, setParties] = useState<Party[]>([]);
  const [activePartyId, setActivePartyId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    partiesApi
      .list()
      .then((p) => setParties(p))
      .catch(() => undefined);
  }, [user]);

  const onUseMyParty = async () => {
    if (!user) return;
    try {
      const party = activePartyId
        ? parties.find((p) => p.id === activePartyId)
        : null;
      let chars = party
        ? (await charactersApi.list()).filter((c) =>
            party.member_ids.includes(c.id)
          )
        : await charactersApi.list();
      // Fall back to all chars if a party has 0 members
      if (chars.length === 0 && !party) {
        setPartyHintError(
          'You have no characters yet. Create one on the Characters page first.'
        );
        setPartyHint(null);
        return;
      }
      if (chars.length === 0 && party) {
        setPartyHintError(
          `Party "${party.name}" has no members. Add some on the Characters page.`
        );
        setPartyHint(null);
        return;
      }
      setPartySize(chars.length);
      const avgLevel = Math.round(
        chars.reduce((acc, c) => acc + (c.level ?? 1), 0) / chars.length
      );
      setPlayerLevel(avgLevel);
      setPartyHint(
        party
          ? `Party "${party.name}": ${chars.length} character${
              chars.length === 1 ? '' : 's'
            }, average level ${avgLevel}.`
          : `All characters: ${chars.length} character${
              chars.length === 1 ? '' : 's'
            }, average level ${avgLevel}.`
      );
      setPartyHintError(null);
    } catch (e) {
      setPartyHintError(e instanceof Error ? e.message : String(e));
    }
  };

  // Group generated monsters by name for the preview
  const preview = useMemo(() => {
    const map = new Map<string, Monster>();
    for (const m of monstersInCombat) {
      map.set(m.name, m);
    }
    return Array.from(map.entries()).map(([name, m]) => ({
      name,
      monster: m,
      count: monstersInCombat.filter((x) => x.name === name).length,
    }));
  }, [monstersInCombat]);

  const totalXP = useMemo(
    () =>
      monstersInCombat.reduce(
        (acc, m) =>
          acc +
          Number(m.Challenge.split('(')[1]?.replace(/[^0-9.]/g, '') ?? 0),
        0
      ),
    [monstersInCombat]
  );

  const adjustedXP = useMemo(() => {
    const mult =
      ENCOUNTER_MULTIPLIERS.find(
        (e) =>
          monstersInCombat.length <= e.numberOfMonsters ||
          e.numberOfMonsters === 15
      )?.multiplier ?? 1;
    return Math.round(totalXP * mult);
  }, [monstersInCombat, totalXP]);

  return (
    <Stack spacing={3}>
      <Typography variant="h3">Encounter Builder</Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
        {/* Controls */}
        <Paper sx={{ p: 2, width: { xs: '100%', md: 360 }, flexShrink: 0 }}>
          <Stack spacing={2}>
            <Typography variant="h5">Filters</Typography>
            <TextField
              fullWidth
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              label="Keywords"
              size="small"
              helperText="Match by monster name (e.g. dragon, orc)"
            />
            <Autocomplete
              multiple
              options={MONSTER_TYPES}
              onChange={(_e, v) => setMonsterTypes(v)}
              size="small"
              renderInput={(p) => <TextField {...p} label="Monster type" />}
            />
            <Autocomplete
              multiple
              options={ALIGNMENTS}
              onChange={(_e, v) => setAlignments(v)}
              size="small"
              renderInput={(p) => <TextField {...p} label="Alignment" />}
            />
            <Autocomplete
              multiple
              options={SIZES}
              onChange={(_e, v) => setSizes(v)}
              size="small"
              renderInput={(p) => <TextField {...p} label="Size" />}
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
                renderInput={(p) => <TextField {...p} label="Avg level" />}
                getOptionLabel={(o) => `${o}`}
              />
              <Autocomplete
                options={PARTY_SIZES}
                value={partySize}
                onChange={(_e, v) => setPartySize(v ?? 1)}
                sx={{ flex: 1 }}
                size="small"
                renderInput={(p) => <TextField {...p} label="Size" />}
                getOptionLabel={(o) => `${o}`}
              />
            </Stack>
            <Autocomplete
              options={DIFFICULTIES}
              value={difficulty}
              onChange={(_e, v) => setDifficulty(v ?? 'Easy')}
              size="small"
              renderInput={(p) => <TextField {...p} label="Difficulty" />}
            />
            {user && parties.length > 0 && (
              <Autocomplete
                size="small"
                options={parties}
                getOptionLabel={(o) => o.name}
                value={parties.find((p) => p.id === activePartyId) ?? null}
                onChange={(_e, v) => setActivePartyId(v?.id ?? null)}
                renderInput={(p) => (
                  <TextField
                    {...p}
                    label="Party"
                    helperText={activePartyId ? '' : 'No party selected — use all characters'}
                  />
                )}
              />
            )}
            {user && (
              <Button
                size="small"
                variant="outlined"
                onClick={onUseMyParty}
                startIcon={<People />}
                disabled={parties.length > 0 && !activePartyId}
              >
                Use my party
              </Button>
            )}
            {partyHint && (
              <Alert severity="success" sx={{ py: 0 }}>
                {partyHint}
              </Alert>
            )}
            {partyHintError && (
              <Alert severity="warning" sx={{ py: 0 }}>
                {partyHintError}
              </Alert>
            )}
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
              />
              <Slider
                value={experience}
                onChange={(_e, v) => setExperience(v as number[])}
                valueLabelDisplay="auto"
                min={MIN_EXPERIENCE}
                max={MAX_EXPERIENCE}
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
            sx={{ mb: 2 }}
          >
            <Stack>
              <Typography variant="h5">Preview</Typography>
              <Typography variant="caption" color="text.secondary">
                {monstersInCombat.length === 0
                  ? 'No encounter generated yet.'
                  : `${monstersInCombat.length} combatant${monstersInCombat.length === 1 ? '' : 's'} · ${totalXP} XP raw · ${adjustedXP} XP adjusted`}
              </Typography>
            </Stack>
            {monstersInCombat.length > 0 && (
              <Button
                size="small"
                variant="outlined"
                color="inherit"
                startIcon={<Close />}
                onClick={() => {
                  clearEncounter();
                  toast('Encounter cleared', 'info');
                }}
              >
                Clear
              </Button>
            )}
          </Stack>

          {monstersInCombat.length === 0 ? (
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
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="body1" fontWeight={600} noWrap>
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
                      CR {monster.Challenge}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      AC {monster.AC} · HP {monster.HP}
                    </Typography>
                  </Stack>
                </Stack>
              ))}
            </Stack>
          )}
        </Paper>
      </Stack>

      <EncounterTracker monstersInCombat={monstersInCombat} />
    </Stack>
  );
};

export default EncounterGenerator;

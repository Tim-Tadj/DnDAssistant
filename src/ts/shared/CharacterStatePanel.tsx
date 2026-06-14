/**
 * CharacterStatePanel - the in-session runtime state for a character.
 *
 * - HP slider + numeric input (max from character stat block)
 * - Temp HP input
 * - Conditions multi-select chips (with a quick-remove)
 * - Hit dice used counter
 * - Short rest / long rest buttons
 * - Death saves (3 success / 3 failure pips), only shown
 *   when current_hp is 0
 */

import React, { FC, useEffect, useState } from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Slider,
  Stack,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import { Add, Bedtime, Close, Favorite, Healing, Hotel } from '@mui/icons-material';
import { Character, DndClass } from '../types/Character';
import { CharacterState, STANDARD_CONDITIONS } from '../types/CharacterState';
import { characterStateApi } from '../api/character-state';
import { referenceApi } from '../api/characters';
import { useToast } from './ToastProvider';
import { getDndClass } from './character-classes';

type Props = {
  character: Character;
  classes?: DndClass[];
};

const defaultState = (character: Character): CharacterState => ({
  character_id: character.id,
  current_hp: character.hp_max,
  temp_hp: 0,
  conditions: [],
  death_save_successes: 0,
  death_save_failures: 0,
  hit_dice_used: 0,
  last_long_rest: null,
  last_short_rest: null,
});

const CharacterStatePanel: FC<Props> = ({ character, classes: classesProp }) => {
  const theme = useTheme();
  const { toast } = useToast();
  const [state, setState] = useState<CharacterState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [classes, setClasses] = useState<DndClass[]>(classesProp ?? []);

  useEffect(() => {
    if (classesProp) return;
    referenceApi
      .listClasses()
      .then(setClasses)
      .catch(() => undefined);
  }, [classesProp]);

  useEffect(() => {
    setLoading(true);
    characterStateApi
      .get(character.id)
      .then(setState)
      .catch(() => setState(defaultState(character)))
      .finally(() => setLoading(false));
  }, [character.id, character.hp_max]);

  const update = async (next: CharacterState) => {
    setState(next);
    setSaving(true);
    try {
      await characterStateApi.update(character.id, next);
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !state) {
    return <Typography variant="body2" color="text.secondary">Loading state…</Typography>;
  }

  const max = character.hp_max;
  const hp = Math.max(0, Math.min(max, state.current_hp));
  const hpPct = max > 0 ? (hp / max) * 100 : 0;
  const bloodied = max > 0 && hp <= max / 2 && hp > 0;
  const down = max > 0 && hp === 0;
  const dndClass = getDndClass(classes, character.class_id);
  const hitDieMax = parseInt(dndClass?.hit_die?.replace(/\D/g, '') ?? '8', 10) || 8;
  const hitDiceRemaining = Math.max(0, character.level - state.hit_dice_used);

  const onHeal = (delta: number) =>
    update({ ...state, current_hp: Math.max(0, Math.min(max, hp + delta)) });
  const onTempHp = (n: number) =>
    update({ ...state, temp_hp: Math.max(0, n) });
  const onAddCondition = (name: string | null) => {
    if (!name) return;
    if (state.conditions.includes(name)) return;
    update({ ...state, conditions: [...state.conditions, name] });
  };
  const onRemoveCondition = (name: string) =>
    update({
      ...state,
      conditions: state.conditions.filter((c) => c !== name),
    });
  const onShortRest = () => {
    update({
      ...state,
      hit_dice_used: Math.min(character.level, state.hit_dice_used + 1),
      last_short_rest: new Date().toISOString(),
    });
    toast(`Short rest: spent 1 hit die. ${Math.max(0, character.level - state.hit_dice_used - 1)} remaining.`);
  };
  const onLongRest = () => {
    update({
      ...state,
      current_hp: max,
      temp_hp: 0,
      conditions: [],
      death_save_successes: 0,
      death_save_failures: 0,
      hit_dice_used: 0,
      last_long_rest: new Date().toISOString(),
    });
    toast('Long rest: HP, hit dice, conditions reset.');
  };
  const onDeathSave = (kind: 'success' | 'failure') => {
    if (kind === 'success') {
      const v = (state.death_save_successes + 1) % 4;
      update({
        ...state,
        death_save_successes: v,
        // 3 successes = stabilized back to 1 HP
        current_hp: v === 0 ? 1 : state.current_hp,
        death_save_failures: v === 0 ? 0 : state.death_save_failures,
      });
      if (v === 0) toast('Stabilized. Back to 1 HP.');
    } else {
      const v = (state.death_save_failures + 1) % 4;
      update({
        ...state,
        death_save_failures: v,
        // 3 failures = dead
        current_hp: v === 0 ? 0 : state.current_hp,
        death_save_successes: v === 0 ? 0 : state.death_save_successes,
      });
      if (v === 0) toast('Character has died.');
    }
  };

  return (
    <Stack spacing={2}>
      {/* HP */}
      <Box>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Favorite fontSize="small" sx={{ color: down ? 'error.main' : bloodied ? 'warning.main' : 'success.main' }} />
            <Typography variant="overline" color="text.secondary">
              Hit points
            </Typography>
          </Stack>
          <Typography
            variant="body2"
            sx={{ fontFamily: '"JetBrains Mono", monospace' }}
            color="text.secondary"
          >
            {hp} / {max}
          </Typography>
        </Stack>
        <Box
          sx={{
            position: 'relative',
            height: 10,
            borderRadius: 5,
            backgroundColor: alpha(theme.palette.error.main, 0.15),
            overflow: 'hidden',
            mb: 1,
          }}
        >
          <Box
            sx={{
              width: `${hpPct}%`,
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
        <Slider
          size="small"
          value={hp}
          min={0}
          max={max}
          onChange={(_e, v) => update({ ...state, current_hp: v as number })}
          aria-label="Current HP"
          sx={{ mb: 0.5 }}
        />
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            size="small"
            label="HP"
            type="number"
            value={state.current_hp}
            onChange={(e) => update({ ...state, current_hp: Math.max(0, Math.min(max, Number(e.target.value) || 0)) })}
            sx={{ width: 100 }}
          />
          <Button size="small" onClick={() => onHeal(-1)} color="error" variant="outlined">
            -1
          </Button>
          <Button size="small" onClick={() => onHeal(1)} color="success" variant="outlined">
            +1
          </Button>
          <TextField
            size="small"
            label="Temp HP"
            type="number"
            value={state.temp_hp}
            onChange={(e) => onTempHp(Number(e.target.value) || 0)}
            sx={{ width: 110 }}
            InputProps={{ startAdornment: <Healing fontSize="small" sx={{ mr: 0.5, color: 'info.main' }} /> }}
          />
        </Stack>
      </Box>

      {/* Death saves, only when down */}
      {down && (
        <Box
          sx={{
            p: 1.5,
            border: `1px solid ${theme.palette.error.main}`,
            borderRadius: 1,
            backgroundColor: alpha(theme.palette.error.main, 0.06),
          }}
        >
          <Typography variant="overline" color="error.main">
            Death saving throws
          </Typography>
          <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
            <Stack alignItems="center" spacing={0.5}>
              <Typography variant="caption" color="text.secondary">Successes</Typography>
              <Stack direction="row" spacing={0.5}>
                {[0, 1, 2].map((i) => (
                  <Box
                    key={i}
                    onClick={() => onDeathSave('success')}
                    sx={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      border: `2px solid ${theme.palette.success.main}`,
                      backgroundColor: i < state.death_save_successes
                        ? theme.palette.success.main
                        : 'transparent',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </Stack>
            </Stack>
            <Stack alignItems="center" spacing={0.5}>
              <Typography variant="caption" color="text.secondary">Failures</Typography>
              <Stack direction="row" spacing={0.5}>
                {[0, 1, 2].map((i) => (
                  <Box
                    key={i}
                    onClick={() => onDeathSave('failure')}
                    sx={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      border: `2px solid ${theme.palette.error.main}`,
                      backgroundColor: i < state.death_save_failures
                        ? theme.palette.error.main
                        : 'transparent',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </Stack>
            </Stack>
          </Stack>
        </Box>
      )}

      {/* Conditions */}
      <Box>
        <Typography variant="overline" color="text.secondary">
          Conditions
        </Typography>
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 1, mt: 0.5 }}>
          {state.conditions.length === 0 ? (
            <Typography variant="caption" color="text.disabled">
              None
            </Typography>
          ) : (
            state.conditions.map((c) => (
              <Chip
                key={c}
                label={c}
                size="small"
                color="warning"
                onDelete={() => onRemoveCondition(c)}
                deleteIcon={<Close fontSize="small" />}
              />
            ))
          )}
        </Stack>
        <Autocomplete
          size="small"
          options={STANDARD_CONDITIONS.filter((c) => !state.conditions.includes(c))}
          onChange={(_e, v) => onAddCondition(v)}
          renderInput={(p) => (
            <TextField
              {...p}
              label="Add condition"
              InputProps={{ ...p.InputProps, startAdornment: <Add fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} /> }}
            />
          )}
        />
      </Box>

      {/* Hit dice + rest */}
      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack>
            <Typography variant="overline" color="text.secondary">
              Hit dice
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontFamily: '"JetBrains Mono", monospace' }}
            >
              {hitDiceRemaining} / {character.level} d{hitDieMax}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<Hotel />}
              onClick={onShortRest}
              disabled={hitDiceRemaining === 0}
            >
              Short rest
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<Bedtime />}
              onClick={onLongRest}
            >
              Long rest
            </Button>
          </Stack>
        </Stack>
        {(state.last_long_rest || state.last_short_rest) && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {state.last_long_rest && (
              <>Last long rest: {new Date(state.last_long_rest).toLocaleString()}. </>
            )}
            {state.last_short_rest && (
              <>Last short rest: {new Date(state.last_short_rest).toLocaleString()}.</>
            )}
          </Typography>
        )}
      </Box>

      {saving && (
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right' }}>
          Saving…
        </Typography>
      )}
    </Stack>
  );
};

export default CharacterStatePanel;

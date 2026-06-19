import React, { FC, useCallback, useEffect, useState } from 'react';
import {
  Box,
  Stack,
  TextField,
  Typography,
  Divider,
} from '@mui/material';
import { defaultMonster, Monster } from '../types/Monster';

const ABILITIES: Array<{
  key: keyof Monster;
  label: string;
  modKey: keyof Monster;
}> = [
  { key: 'str', label: 'STR', modKey: 'str_mod' },
  { key: 'dex', label: 'DEX', modKey: 'dex_mod' },
  { key: 'con', label: 'CON', modKey: 'con_mod' },
  { key: 'int', label: 'INT', modKey: 'int_mod' },
  { key: 'wis', label: 'WIS', modKey: 'wis_mod' },
  { key: 'cha', label: 'CHA', modKey: 'cha_mod' },
];

type FieldProps = {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  onBlur?: () => void;
  fullWidth?: boolean;
  multiline?: boolean;
  rows?: number;
};

const Field: FC<FieldProps> = ({ label, value, onChange, onBlur, fullWidth, multiline, rows }) => (
  <TextField
    fullWidth={fullWidth}
    multiline={multiline}
    rows={rows}
    value={value ?? ''}
    onChange={(e) => onChange(e.target.value)}
    onBlur={onBlur}
    label={label}
    size="small"
  />
);

const MonsterEditor: FC<{
  onUpdateGear?: (jsonInput: string) => void;
  onChange?: (monster: Monster) => void;
  initial?: Monster;
}> = ({ onUpdateGear, onChange, initial }) => {
  const [m, setM] = useState<Monster>(
    initial ?? ({
      ...defaultMonster,
      description: '',
      lair_actions: '',
      regional_effects: '',
      traits: '',
      saving_throws: '',
      skills: '',
      damage_vulnerabilities: '',
      damage_resistances: '',
      damage_immunities: '',
      condition_immunities: '',
      reactions: '',
      legendary_actions: '',
    } as Monster)
  );

  const set = useCallback(<K extends keyof Monster>(key: K, value: Monster[K]) => {
    setM((prev) => ({ ...prev, [key]: value }));
  }, []);

  const onUpdateGearFormatted = useCallback(
    () => onUpdateGear?.(JSON.stringify(m, null, '\t')),
    [m, onUpdateGear]
  );

  useEffect(() => {
    onUpdateGearFormatted();
  }, [onUpdateGearFormatted]);
  useEffect(() => onChange?.(m), [m, onChange]);

  return (
    <Stack spacing={2} direction="column" sx={{ width: '100%', pt: 0 }}>
      <Box>
        <Typography variant="subtitle1">Basic</Typography>
        <Stack spacing={1} direction="column" sx={{ pt: 1 }}>
          <Field label="Name" value={m.name} onChange={(v) => set('name', v)} onBlur={onUpdateGearFormatted} fullWidth />
          <Field label="Meta (size, type, alignment)" value={m.meta} onChange={(v) => set('meta', v)} onBlur={onUpdateGearFormatted} fullWidth />
          <Stack direction="row" spacing={1}>
            <Field label="AC" value={m.ac} onChange={(v) => set('ac', v)} onBlur={onUpdateGearFormatted} fullWidth />
            <Field label="HP" value={m.hp} onChange={(v) => set('hp', v)} onBlur={onUpdateGearFormatted} fullWidth />
            <Field label="Speed" value={m.speed} onChange={(v) => set('speed', v)} onBlur={onUpdateGearFormatted} fullWidth />
            <Field label="Challenge" value={m.challenge} onChange={(v) => set('challenge', v)} onBlur={onUpdateGearFormatted} fullWidth />
          </Stack>
        </Stack>
      </Box>
      <Divider />
      <Box>
        <Typography variant="subtitle1">Ability scores</Typography>
        <Stack spacing={1} sx={{ pt: 1 }}>
          {ABILITIES.map(({ key, label, modKey }) => (
            <Stack direction="row" spacing={1} key={key}>
              <Field label={label} value={m[key] as string} onChange={(v) => set(key, v)} onBlur={onUpdateGearFormatted} fullWidth />
              <Field label={`${label} mod`} value={m[modKey] as string} onChange={(v) => set(modKey, v)} onBlur={onUpdateGearFormatted} fullWidth />
            </Stack>
          ))}
        </Stack>
      </Box>
      <Divider />
      <Box>
        <Typography variant="subtitle1">Defenses & skills</Typography>
        <Stack spacing={1} sx={{ pt: 1 }}>
          <Field label="Saving Throws" value={m.saving_throws} onChange={(v) => set('saving_throws', v)} onBlur={onUpdateGearFormatted} fullWidth />
          <Field label="Skills" value={m.skills} onChange={(v) => set('skills', v)} onBlur={onUpdateGearFormatted} fullWidth />
          <Field label="Damage Vulnerabilities" value={m.damage_vulnerabilities} onChange={(v) => set('damage_vulnerabilities', v)} onBlur={onUpdateGearFormatted} fullWidth />
          <Field label="Damage Resistances" value={m.damage_resistances} onChange={(v) => set('damage_resistances', v)} onBlur={onUpdateGearFormatted} fullWidth />
          <Field label="Damage Immunities" value={m.damage_immunities} onChange={(v) => set('damage_immunities', v)} onBlur={onUpdateGearFormatted} fullWidth />
          <Field label="Condition Immunities" value={m.condition_immunities} onChange={(v) => set('condition_immunities', v)} onBlur={onUpdateGearFormatted} fullWidth />
        </Stack>
      </Box>
      <Divider />
      <Box>
        <Typography variant="subtitle1">Senses, languages, art</Typography>
        <Stack spacing={1} sx={{ pt: 1 }}>
          <Field label="Senses" value={m.senses} onChange={(v) => set('senses', v)} onBlur={onUpdateGearFormatted} fullWidth />
          <Field label="Languages" value={m.languages} onChange={(v) => set('languages', v)} onBlur={onUpdateGearFormatted} fullWidth />
          <Field label="img_url" value={m.img_url} onChange={(v) => set('img_url', v)} onBlur={onUpdateGearFormatted} fullWidth />
        </Stack>
      </Box>
      <Divider />
      <Box>
        <Typography variant="subtitle1">Traits & actions (HTML allowed)</Typography>
        <Stack spacing={1} sx={{ pt: 1 }}>
          <Field label="Traits" value={m.traits} onChange={(v) => set('traits', v)} onBlur={onUpdateGearFormatted} fullWidth multiline rows={4} />
          <Field label="Actions" value={m.actions} onChange={(v) => set('actions', v)} onBlur={onUpdateGearFormatted} fullWidth multiline rows={4} />
          <Field label="Reactions" value={m.reactions} onChange={(v) => set('reactions', v)} onBlur={onUpdateGearFormatted} fullWidth multiline rows={3} />
          <Field label="Legendary Actions" value={m.legendary_actions} onChange={(v) => set('legendary_actions', v)} onBlur={onUpdateGearFormatted} fullWidth multiline rows={3} />
        </Stack>
      </Box>
      <Divider />
      <Box>
        <Typography variant="subtitle1">Lore</Typography>
        <Stack spacing={1} sx={{ pt: 1 }}>
          <Field label="Description" value={m.description} onChange={(v) => set('description', v)} onBlur={onUpdateGearFormatted} fullWidth multiline rows={4} />
          <Field label="Lair Actions" value={m.lair_actions} onChange={(v) => set('lair_actions', v)} onBlur={onUpdateGearFormatted} fullWidth multiline rows={3} />
          <Field label="Regional Effects" value={m.regional_effects} onChange={(v) => set('regional_effects', v)} onBlur={onUpdateGearFormatted} fullWidth multiline rows={3} />
        </Stack>
      </Box>
    </Stack>
  );
};

export default MonsterEditor;


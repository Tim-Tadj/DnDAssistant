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
  { key: 'STR', label: 'STR', modKey: 'STR_mod' },
  { key: 'DEX', label: 'DEX', modKey: 'DEX_mod' },
  { key: 'CON', label: 'CON', modKey: 'CON_mod' },
  { key: 'INT', label: 'INT', modKey: 'INT_mod' },
  { key: 'WIS', label: 'WIS', modKey: 'WIS_mod' },
  { key: 'CHA', label: 'CHA', modKey: 'CHA_mod' },
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
    <Stack spacing={2} direction="column" sx={{ width: '100%', pt: 4 }}>
      <Box>
        <Typography variant="subtitle1">Basic</Typography>
        <Stack spacing={1} direction="column">
          <Field label="Name" value={m.name} onChange={(v) => set('name', v)} onBlur={onUpdateGearFormatted} fullWidth />
          <Field label="Meta (size, type, alignment)" value={m.meta} onChange={(v) => set('meta', v)} onBlur={onUpdateGearFormatted} fullWidth />
          <Stack direction="row" spacing={1}>
            <Field label="AC" value={m.AC} onChange={(v) => set('AC', v)} onBlur={onUpdateGearFormatted} fullWidth />
            <Field label="HP" value={m.HP} onChange={(v) => set('HP', v)} onBlur={onUpdateGearFormatted} fullWidth />
            <Field label="Speed" value={m.Speed} onChange={(v) => set('Speed', v)} onBlur={onUpdateGearFormatted} fullWidth />
            <Field label="Challenge" value={m.Challenge} onChange={(v) => set('Challenge', v)} onBlur={onUpdateGearFormatted} fullWidth />
          </Stack>
        </Stack>
      </Box>
      <Divider />
      <Box>
        <Typography variant="subtitle1">Ability scores</Typography>
        <Stack spacing={1}>
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
        <Stack spacing={1}>
          <Field label="Saving Throws" value={m.Saving_Throws} onChange={(v) => set('Saving_Throws', v)} onBlur={onUpdateGearFormatted} fullWidth />
          <Field label="Skills" value={m.Skills} onChange={(v) => set('Skills', v)} onBlur={onUpdateGearFormatted} fullWidth />
          <Field label="Damage Vulnerabilities" value={m.Damage_Vulnerabilities} onChange={(v) => set('Damage_Vulnerabilities', v)} onBlur={onUpdateGearFormatted} fullWidth />
          <Field label="Damage Resistances" value={m.Damage_Resistances} onChange={(v) => set('Damage_Resistances', v)} onBlur={onUpdateGearFormatted} fullWidth />
          <Field label="Damage Immunities" value={m.Damage_Immunities} onChange={(v) => set('Damage_Immunities', v)} onBlur={onUpdateGearFormatted} fullWidth />
          <Field label="Condition Immunities" value={m.Condition_Immunities} onChange={(v) => set('Condition_Immunities', v)} onBlur={onUpdateGearFormatted} fullWidth />
        </Stack>
      </Box>
      <Divider />
      <Box>
        <Typography variant="subtitle1">Senses, languages, art</Typography>
        <Stack spacing={1}>
          <Field label="Senses" value={m.Senses} onChange={(v) => set('Senses', v)} onBlur={onUpdateGearFormatted} fullWidth />
          <Field label="Languages" value={m.Languages} onChange={(v) => set('Languages', v)} onBlur={onUpdateGearFormatted} fullWidth />
          <Field label="img_url" value={m.img_url} onChange={(v) => set('img_url', v)} onBlur={onUpdateGearFormatted} fullWidth />
        </Stack>
      </Box>
      <Divider />
      <Box>
        <Typography variant="subtitle1">Traits & actions (HTML allowed)</Typography>
        <Stack spacing={1}>
          <Field label="Traits" value={m.Traits} onChange={(v) => set('Traits', v)} onBlur={onUpdateGearFormatted} fullWidth multiline rows={4} />
          <Field label="Actions" value={m.Actions} onChange={(v) => set('Actions', v)} onBlur={onUpdateGearFormatted} fullWidth multiline rows={4} />
          <Field label="Reactions" value={m.Reactions} onChange={(v) => set('Reactions', v)} onBlur={onUpdateGearFormatted} fullWidth multiline rows={3} />
          <Field label="Legendary Actions" value={m.Legendary_Actions} onChange={(v) => set('Legendary_Actions', v)} onBlur={onUpdateGearFormatted} fullWidth multiline rows={3} />
        </Stack>
      </Box>
      <Divider />
      <Box>
        <Typography variant="subtitle1">Lore</Typography>
        <Stack spacing={1}>
          <Field label="Description" value={m.description} onChange={(v) => set('description', v)} onBlur={onUpdateGearFormatted} fullWidth multiline rows={4} />
          <Field label="Lair Actions" value={m.Lair_Actions} onChange={(v) => set('Lair_Actions', v)} onBlur={onUpdateGearFormatted} fullWidth multiline rows={3} />
          <Field label="Regional Effects" value={m.Regional_Effects} onChange={(v) => set('Regional_Effects', v)} onBlur={onUpdateGearFormatted} fullWidth multiline rows={3} />
        </Stack>
      </Box>
    </Stack>
  );
};

export default MonsterEditor;

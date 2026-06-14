import React, { FC, useCallback, useEffect, useState } from 'react';
import { defaultWeapon, Weapon } from '../types/Gear';
import { Stack, TextField } from '@mui/material';

const WeaponEditor: FC<{
  onUpdateGear?: (jsonInput: string) => void;
  onChange?: (weapon: Weapon) => void;
  initial?: Weapon;
}> = ({ onUpdateGear, onChange, initial }) => {
  const [newWeapon, setNewWeapon] = useState<Weapon>(initial ?? defaultWeapon);

  const onUpdateGearFormatted = useCallback(() => {
    onUpdateGear?.(
      JSON.stringify(newWeapon, null, "\t")
        .replaceAll("],\n\t\"", "],\n\n\t\"")
    )
  }, [newWeapon]);

  useEffect(() => {
    onUpdateGearFormatted();
  }, [onUpdateGearFormatted]);
  useEffect(() => onChange?.(newWeapon), [newWeapon, onChange]);

  return (
    <Stack spacing={2} direction="column" justifyContent="space-between" alignItems="center" sx={{ pt: 4 }}>
      <TextField
        fullWidth
        value={newWeapon.name}
        onChange={(event) => setNewWeapon({ ...newWeapon, name: event.target.value })}
        onBlur={onUpdateGearFormatted}
        label="Name"
      />
      <Stack spacing={1} direction="row" justifyContent="space-between" alignItems="center">
        <Stack spacing={1} direction="column" justifyContent="space-between">
          <TextField
            fullWidth
            value={newWeapon.damage}
            onChange={(event) => setNewWeapon({ ...newWeapon, damage: event.target.value })}
            onBlur={onUpdateGearFormatted}
            label="Damage"
          />
          <TextField
            fullWidth
            value={newWeapon.type}
            onChange={(event) => setNewWeapon({ ...newWeapon, type: event.target.value })}
            onBlur={onUpdateGearFormatted}
            label="Type"
          />
        </Stack>
        <Stack spacing={1} direction="column" justifyContent="space-between">
          <TextField
            fullWidth
            value={newWeapon.cost}
            onChange={(event) => setNewWeapon({ ...newWeapon, cost: event.target.value })}
            onBlur={onUpdateGearFormatted}
            label="Cost"
          />
          <TextField
            fullWidth
            value={newWeapon.weight}
            onChange={(event) => setNewWeapon({ ...newWeapon, weight: event.target.value })}
            onBlur={onUpdateGearFormatted}
            label="Weight"
          />
        </Stack>
      </Stack>
      <TextField
        fullWidth
        value={newWeapon.properties}
        onChange={(event) => setNewWeapon({ ...newWeapon, properties: event.target.value })}
        onBlur={onUpdateGearFormatted}
        label="Properties"
      />
      <TextField
        fullWidth
        multiline
        rows={4}
        value={newWeapon.description}
        onChange={(event) => setNewWeapon({ ...newWeapon, description: event.target.value })}
        onBlur={onUpdateGearFormatted}
        label="Description"
      />
    </Stack>
  )
}

export default WeaponEditor;

import React, { FC, useCallback, useEffect, useState } from 'react';
import { Armour, defaultArmour } from '../types/Gear';
import { Autocomplete, Stack, TextField } from '@mui/material';

enum ARMOUR_TYPE {
  LIGHT = 'Light',
  MEDIUM = 'Medium',
  HEAVY = 'Heavy',
  SHIELD = 'Shield'
}

const ArmourEditor: FC<{
  onUpdateGear?: (jsonInput: string) => void;
  onChange?: (armour: Armour) => void;
  initial?: Armour;
}> = ({ onUpdateGear, onChange, initial }) => {
  const [newArmour, setNewArmour] = useState<Armour>(initial ?? defaultArmour);

  const onUpdateGearFormatted = useCallback(() => {
    onUpdateGear?.(
      JSON.stringify(newArmour, null, "\t")
        .replaceAll("],\n\t\"", "],\n\n\t\"")
    )
  }, [newArmour]);

  useEffect(() => {
    onUpdateGearFormatted();
  }, [onUpdateGearFormatted]);
  useEffect(() => onChange?.(newArmour), [newArmour, onChange]);

  const computeAC = (ac: string, type: string): string => {
    switch (type) {
      case ARMOUR_TYPE.LIGHT: return `${parseFloat(ac)} + Dex modifier`;
      case ARMOUR_TYPE.MEDIUM: return `${parseFloat(ac)} + Dex modifier (max 2)`;
      case ARMOUR_TYPE.HEAVY: return `${parseFloat(ac)}`;
      case ARMOUR_TYPE.SHIELD: return `+${parseFloat(ac)}`;
      default: return ac
    }
  };

  return (
    <Stack spacing={2} direction="column" justifyContent="space-between" alignItems="center">
      <TextField
        fullWidth
        value={newArmour.name}
        onChange={(event) => setNewArmour({ ...newArmour, name: event.target.value })}
        onBlur={onUpdateGearFormatted}
        label="Name"
      />
      <Stack spacing={1} direction="column" justifyContent="space-between" alignItems="center">
        <Stack spacing={1} direction="row" justifyContent="space-between" alignItems="center">
          <TextField
            fullWidth
            value={parseFloat(newArmour.AC)}
            onChange={(event) => setNewArmour({ ...newArmour, AC: computeAC(event.target.value, newArmour.type) })}
            onBlur={onUpdateGearFormatted}
            label="AC"
          />
          <Autocomplete
            fullWidth
            value={newArmour.type}
            onChange={(_event, type) => type !== null && setNewArmour({ ...newArmour, type, AC: computeAC(newArmour.AC, type) })}
            onBlur={onUpdateGearFormatted}
            options={Object.values(ARMOUR_TYPE)}
            renderInput={(params) => (<TextField {...params} label="Armour Type" />)}
          />
          <TextField
            fullWidth
            value={newArmour.strength}
            onChange={(event) => setNewArmour({ ...newArmour, strength: event.target.value })}
            onBlur={onUpdateGearFormatted}
            label="Strength Req."
          />
        </Stack>
        <Stack spacing={1} direction="row" justifyContent="space-between" alignItems="center">
          <TextField
            fullWidth
            value={newArmour.cost}
            onChange={(event) => setNewArmour({ ...newArmour, cost: event.target.value })}
            onBlur={onUpdateGearFormatted}
            label="Cost"
          />
          <TextField
            fullWidth
            value={newArmour.weight}
            onChange={(event) => setNewArmour({ ...newArmour, weight: event.target.value })}
            onBlur={onUpdateGearFormatted}
            label="Weight"
          />
        </Stack>
      </Stack>
      <TextField
        fullWidth
        multiline
        rows={4}
        value={newArmour.description}
        onChange={(event) => setNewArmour({ ...newArmour, description: event.target.value })}
        onBlur={onUpdateGearFormatted}
        label="Description"
      />
    </Stack>
  )
}

export default ArmourEditor;

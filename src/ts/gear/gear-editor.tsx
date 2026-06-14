import React, { FC, useCallback, useEffect, useState } from 'react';
import { defaultGear, Gear } from '../types/Gear';
import { Stack, TextField } from '@mui/material';

const GearEditor: FC<{
  onUpdateGear?: (jsonInput: string) => void;
  onChange?: (gear: Gear) => void;
  initial?: Gear;
}> = ({ onUpdateGear, onChange, initial }) => {
  const [newGear, setNewGear] = useState<Gear>(initial ?? defaultGear);

  const onUpdateGearFormatted = useCallback(() => {
    onUpdateGear?.(
      JSON.stringify(newGear, null, "\t")
        .replaceAll("],\n\t\"", "],\n\n\t\"")
    )
  }, [newGear]);

  useEffect(() => {
    onUpdateGearFormatted();
  }, [onUpdateGearFormatted]);
  useEffect(() => onChange?.(newGear), [newGear, onChange]);

  return (
    <Stack spacing={2} direction="column" justifyContent="space-between" alignItems="center" sx={{ pt: 4 }}>
      <TextField
        fullWidth
        value={newGear.name}
        onChange={(event) => setNewGear({ ...newGear, name: event.target.value })}
        onBlur={onUpdateGearFormatted}
        label="Name"
      />
      <Stack spacing={1} direction="row" justifyContent="space-between" alignItems="center">
        <TextField
          fullWidth
          value={newGear.type}
          onChange={(event) => setNewGear({ ...newGear, type: event.target.value })}
          onBlur={onUpdateGearFormatted}
          label="Type"
        />
        <TextField
          fullWidth
          value={newGear.cost}
          onChange={(event) => setNewGear({ ...newGear, cost: event.target.value })}
          onBlur={onUpdateGearFormatted}
          label="Cost"
        />
        <TextField
          fullWidth
          value={newGear.weight}
          onChange={(event) => setNewGear({ ...newGear, weight: event.target.value })}
          onBlur={onUpdateGearFormatted}
          label="Weight"
        />
      </Stack>
      <TextField
        fullWidth
        multiline
        rows={4}
        value={newGear.description}
        onChange={(event) => setNewGear({ ...newGear, description: event.target.value })}
        onBlur={onUpdateGearFormatted}
        label="Description"
      />
    </Stack>
  )
}

export default GearEditor;

import React, { FC, useCallback, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Snackbar,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { Add, Close, Save } from '@mui/icons-material';
import GearEditor from './gear-editor';
import WeaponEditor from './weapon-editor';
import ArmourEditor from './armour-editor';
import { GearItem, defaultArmour, defaultGear, defaultWeapon } from '../types/Gear';
import { gearApi } from '../api/gear';

enum GEAR_TYPE {
  ARMOUR = 'Armour',
  WEAPON = 'Weapon',
  GEAR = 'Gear'
}

const KIND_BY_TYPE: Record<GEAR_TYPE, GearItem['kind']> = {
  [GEAR_TYPE.WEAPON]: 'weapon',
  [GEAR_TYPE.ARMOUR]: 'armour',
  [GEAR_TYPE.GEAR]: 'gear',
};

const CreateGear: FC<{ onCreated?: () => void }> = ({ onCreated }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [gearType, setGearType] = useState<GEAR_TYPE>(GEAR_TYPE.GEAR);
  const [newGearJSON, setNewGearJSON] = useState("");
  const [currentItem, setCurrentItem] = useState<GearItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [toastOpen, setToastOpen] = useState(false);

  const close = useCallback(() => {
    setIsOpen(false);
    setSubmitError(null);
    setCurrentItem(null);
    setNewGearJSON('');
  }, []);

  const onSave = async () => {
    if (!currentItem || !currentItem.name.trim()) {
      setSubmitError('Name is required');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload: GearItem = { ...currentItem, kind: KIND_BY_TYPE[gearType] };
      await gearApi.create(payload);
      setToastOpen(true);
      onCreated?.();
      close();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const renderGearEditor = useCallback(() => {
    switch (gearType) {
      case GEAR_TYPE.WEAPON:
        return (
          <WeaponEditor
            onUpdateGear={setNewGearJSON}
            onChange={(w) =>
              setCurrentItem({
                name: w.name,
                kind: 'weapon',
                cost: w.cost,
                weight: w.weight,
                type: w.type,
                Damage: w.damage,
                Properties: w.properties,
                description: w.description,
              })
            }
          />
        );
      case GEAR_TYPE.ARMOUR:
        return (
          <ArmourEditor
            onUpdateGear={setNewGearJSON}
            onChange={(a) =>
              setCurrentItem({
                name: a.name,
                kind: 'armour',
                cost: a.cost,
                weight: a.weight,
                type: a.type,
                AC: a.AC,
                Strength: a.strength,
                Stealth: a.stealth,
                description: a.description,
              })
            }
          />
        );
      default:
        return (
          <GearEditor
            onUpdateGear={setNewGearJSON}
            onChange={(g) =>
              setCurrentItem({
                name: g.name,
                kind: 'gear',
                cost: g.cost,
                weight: g.weight,
                type: g.type,
                description: g.description,
              })
            }
          />
        );
    }
  }, [gearType]);

  return (
    <Box>
      <Button variant="outlined" startIcon={<Add />} onClick={() => setIsOpen(true)}>
        Create Gear
      </Button>
      <Dialog open={isOpen} onClose={close} fullWidth maxWidth="lg">
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h5">Create Gear</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={onSave}
                disabled={submitting}
              >
                {submitting ? 'Saving…' : 'Save'}
              </Button>
              <IconButton onClick={close}>
                <Close />
              </IconButton>
            </Stack>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {submitError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {submitError}
            </Alert>
          )}
          <Card sx={{ flex: 1, flexGrow: 1, maxWidth: "lg" }}>
            <CardContent>
              <Stack spacing={2} direction="row" justifyContent="space-between" useFlexGap maxWidth="auto">
                <Stack spacing={2} direction="column" justifyContent="space-between" flexGrow={1}>
                  <Autocomplete
                    fullWidth
                    value={gearType}
                    onChange={(_event, newValue) => {
                      if (newValue !== null) {
                        setGearType(newValue);
                        setCurrentItem(null);
                        setNewGearJSON('');
                      }
                    }}
                    options={Object.values(GEAR_TYPE)}
                    renderInput={(params) => (<TextField {...params} label="Gear Type" />)}
                  />
                  {renderGearEditor()}
                </Stack>
                <Stack spacing={2} direction="column" justifyContent="space-between" flexGrow={1}>
                  <Alert severity="info">JSON preview (also sent to the API on Save)</Alert>
                  <TextField
                    fullWidth
                    value={newGearJSON}
                    disabled
                    inputProps={{ readOnly: true }}
                    multiline
                    sx={{ flex: 1, flexDirection: 'row' }}
                  />
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
      <Snackbar
        open={toastOpen}
        autoHideDuration={3000}
        onClose={() => setToastOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="success" onClose={() => setToastOpen(false)}>
          Gear saved
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default CreateGear;

// Settings dialog, opened from the gear icon in the AppBar. Holds the
// preferences that were previously scattered across pages as
// always-visible controls.

import React, { FC, ReactNode } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Stack,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { DIFFICULTIES } from '../constants';
import { useSettings } from './SettingsContext';

const Section: FC<{ title: string; children: ReactNode }> = ({ title, children }) => (
  <Stack spacing={1}>
    <Typography variant="overline" color="text.secondary">
      {title}
    </Typography>
    {children}
  </Stack>
);

const Toggle: FC<{
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, hint, checked, onChange }) => (
  <FormControlLabel
    sx={{ alignItems: 'flex-start', ml: 0, gap: 1 }}
    control={<Switch checked={checked} onChange={(e) => onChange(e.target.checked)} sx={{ mt: -0.5 }} />}
    label={
      <Box>
        <Typography variant="body2" fontWeight={500}>
          {label}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      </Box>
    }
  />
);

const SettingsDialog: FC = () => {
  const { settings, update, reset, dialogOpen, closeDialog } = useSettings();

  return (
    <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
      <DialogTitle>Settings</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3}>
          <Section title="Encounter builder">
            <Typography variant="body2" fontWeight={500}>
              Default difficulty
            </Typography>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={settings.defaultDifficulty}
              onChange={(_e, v) => v && update({ defaultDifficulty: v })}
            >
              {DIFFICULTIES.map((d) => (
                <ToggleButton key={d} value={d} sx={{ px: 2 }}>
                  {d}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Toggle
              label="Show advanced filters"
              hint="Monster type, alignment, size and XP range. Hidden behind 'More filters' when off."
              checked={settings.showAdvancedFilters}
              onChange={(v) => update({ showAdvancedFilters: v })}
            />
          </Section>

          <Divider />

          <Section title="Combat tracker">
            <Toggle
              label="Add the active party automatically"
              hint="When an encounter starts, roll initiative for your party's characters too."
              checked={settings.autoAddParty}
              onChange={(v) => update({ autoAddParty: v })}
            />
            <Toggle
              label="Group identical monsters on one initiative"
              hint="All goblins act on the same count, as the DMG suggests for big fights."
              checked={settings.groupInitiative}
              onChange={(v) => update({ groupInitiative: v })}
            />
            <Toggle
              label="Confirm before resetting or ending combat"
              hint="Asks before throwing away HP, conditions and turn order."
              checked={settings.confirmDestructive}
              onChange={(v) => update({ confirmDestructive: v })}
            />
          </Section>

          <Divider />

          <Section title="Layout">
            <Toggle
              label="Show campaign & party switcher on reference pages"
              hint="Guides, Monsters, Spells and Gear don't use the active campaign, so it's hidden there by default."
              checked={settings.contextOnReferencePages}
              onChange={(v) => update({ contextOnReferencePages: v })}
            />
            <Toggle
              label="Show the example world (Tales of Avandria)"
              hint="The bundled map and lore on the Campaigns page."
              checked={settings.showExampleWorld}
              onChange={(v) => update({ showExampleWorld: v })}
            />
          </Section>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={reset} sx={{ mr: 'auto' }}>
          Restore defaults
        </Button>
        <Button variant="contained" onClick={closeDialog}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SettingsDialog;

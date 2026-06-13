import React, { FC, useState } from 'react';
import {
  Alert,
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
  Typography,
} from '@mui/material';
import { Add, Close, Save } from '@mui/icons-material';
import SpellEditor from './spell-editor';
import { Spell } from '../types/Spell';
import { spellsApi } from '../api/spells';

const CreateSpell: FC<{ onCreated?: () => void }> = ({ onCreated }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newSpellJSON, setNewSpellJSON] = useState('');
  const [currentSpell, setCurrentSpell] = useState<Spell | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [toastOpen, setToastOpen] = useState(false);

  const close = () => {
    setIsOpen(false);
    setSubmitError(null);
    setCurrentSpell(null);
    setNewSpellJSON('');
  };

  const onSave = async () => {
    if (!currentSpell || !currentSpell.name.trim()) {
      setSubmitError('Name is required');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await spellsApi.create(currentSpell);
      setToastOpen(true);
      onCreated?.();
      close();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <Button
        variant="outlined"
        startIcon={<Add />}
        onClick={() => setIsOpen(true)}
      >
        Create Spell
      </Button>
      <Dialog open={isOpen} onClose={close} fullWidth maxWidth="lg">
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h5">Create Spell</Typography>
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
          <Card sx={{ flex: 1, flexGrow: 1, maxWidth: 'lg' }}>
            <CardContent>
              <Stack spacing={2} direction="row" justifyContent="space-between" useFlexGap maxWidth="auto">
                <Box flexGrow={1}>
                  <SpellEditor
                    onUpdateGear={setNewSpellJSON}
                    onChange={setCurrentSpell}
                  />
                </Box>
                <Stack spacing={2} direction="column" justifyContent="space-between" flexGrow={1}>
                  <Alert severity="info">JSON preview (also sent to the API on Save)</Alert>
                  <TextField
                    fullWidth
                    value={newSpellJSON}
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
          Spell saved
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CreateSpell;

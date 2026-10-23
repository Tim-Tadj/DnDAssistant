/**
 * FormDialog - the one shell for create/edit forms.
 *
 * Title (+ optional subtitle) with a close button, scrolling content,
 * and a pinned footer with Cancel / Save. It owns the saving + error
 * state: `onSave` just does the work and throws to show an error
 * (e.g. `requireName(draft)`); when it resolves the dialog closes.
 * Paper, title border and content padding come from the theme.
 */

import React, { FC, ReactNode, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogProps,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { Close, Save } from '@mui/icons-material';

type Props = {
  open: boolean;
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  onSave: () => unknown | Promise<unknown>;
  saveLabel?: string;
  maxWidth?: DialogProps['maxWidth'];
  children: ReactNode;
};

/** Throws the standard validation error when a draft has no name. */
export const requireName = (draft: { name?: string } | null | undefined) => {
  if (!draft?.name?.trim()) throw new Error('Name is required');
};

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

const FormDialog: FC<Props> = ({
  open,
  title,
  subtitle,
  onClose,
  onSave,
  saveLabel = 'Save',
  maxWidth = 'md',
  children,
}) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  const close = () => !saving && onClose();

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth={maxWidth} PaperProps={{ sx: { maxHeight: '90vh' } }}>
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
          <Stack sx={{ minWidth: 0 }}>
            <Typography variant="h4" noWrap>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Stack>
          <IconButton onClick={close} size="small" disabled={saving} aria-label="Close">
            <Close />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {children}
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" startIcon={<Save />} onClick={save} disabled={saving}>
          {saving ? 'Saving…' : saveLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FormDialog;

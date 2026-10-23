// Checkbox list with a "select all" row and an optional filter box,
// for picking several things at once (characters into a campaign,
// members into a party, parties into a campaign). `CheckList` is the
// inline list; `MultiPickDialog` wraps it with a title and an
// "Add N" action.

import React, { ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material';

type CheckListProps<T> = {
  items: T[];
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  getSecondary?: (item: T) => ReactNode;
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  emptyText?: ReactNode;
  maxHeight?: number;
};

export function CheckList<T>({
  items,
  getKey,
  getLabel,
  getSecondary,
  selected,
  onChange,
  emptyText = 'Nothing to pick',
  maxHeight = 320,
}: CheckListProps<T>) {
  const [query, setQuery] = useState('');
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter((i) => getLabel(i).toLowerCase().includes(q)) : items;
  }, [items, query, getLabel]);

  const shownKeys = shown.map(getKey);
  const shownSelected = shownKeys.filter((k) => selected.has(k)).length;
  const allShown = shown.length > 0 && shownSelected === shown.length;

  const toggleAll = () => {
    const next = new Set(selected);
    if (allShown) shownKeys.forEach((k) => next.delete(k));
    else shownKeys.forEach((k) => next.add(k));
    onChange(next);
  };
  const toggle = (k: string) => {
    const next = new Set(selected);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    onChange(next);
  };

  if (items.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
        {emptyText}
      </Typography>
    );
  }

  return (
    <Box>
      {items.length > 8 && (
        <TextField
          size="small"
          fullWidth
          placeholder="Filter…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ mb: 1 }}
        />
      )}
      <List dense disablePadding sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
        <ListItemButton onClick={toggleAll} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <Checkbox
              edge="start"
              size="small"
              checked={allShown}
              indeterminate={shownSelected > 0 && !allShown}
              tabIndex={-1}
              disableRipple
            />
          </ListItemIcon>
          <ListItemText
            primary={allShown ? 'Deselect all' : `Select all${query ? ' shown' : ''} (${shown.length})`}
            primaryTypographyProps={{ fontWeight: 600 }}
            secondary={selected.size > 0 ? `${selected.size} selected` : undefined}
          />
        </ListItemButton>
        <Box sx={{ maxHeight, overflowY: 'auto' }}>
          {shown.map((item) => {
            const k = getKey(item);
            return (
              <ListItemButton key={k} onClick={() => toggle(k)}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <Checkbox edge="start" size="small" checked={selected.has(k)} tabIndex={-1} disableRipple />
                </ListItemIcon>
                <ListItemText primary={getLabel(item)} secondary={getSecondary?.(item)} />
              </ListItemButton>
            );
          })}
        </Box>
      </List>
    </Box>
  );
}

type MultiPickDialogProps<T> = Omit<CheckListProps<T>, 'selected' | 'onChange'> & {
  open: boolean;
  title: string;
  // e.g. "Add" → "Add 3"
  actionLabel: string;
  actionIcon?: ReactNode;
  // Everything starts ticked, so the common case is one click.
  preselectAll?: boolean;
  onClose: () => void;
  onConfirm: (items: T[]) => Promise<void> | void;
};

export function MultiPickDialog<T>({
  open,
  title,
  actionLabel,
  actionIcon,
  preselectAll = false,
  onClose,
  onConfirm,
  ...list
}: MultiPickDialogProps<T>) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setSelected(preselectAll ? new Set(list.items.map(list.getKey)) : new Set());
  }, [open]);

  const submit = async () => {
    setBusy(true);
    try {
      await onConfirm(list.items.filter((i) => selected.has(list.getKey(i))));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !busy && onClose()} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <CheckList {...list} selected={selected} onChange={setSelected} />
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant="contained" startIcon={actionIcon} onClick={submit} disabled={busy || selected.size === 0}>
          {busy ? 'Working…' : `${actionLabel}${selected.size ? ` ${selected.size}` : ''}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

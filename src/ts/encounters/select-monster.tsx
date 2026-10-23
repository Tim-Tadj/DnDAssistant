/**
 * SelectMonster - opens a dialog with a searchable, multi-select
 * monster picker.
 *
 * Tick as many monsters as you like (or "Select all shown" after a
 * search, then untick the ones you don't want), set a quantity for
 * each, and add them all in one go.
 *
 * Uses the monsters API directly (not the entity browser) so this stays
 * decoupled from the monster-table page.
 */

import React, { FC, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  ButtonProps,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  ListItemButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Add, Close, Remove, Search as SearchIcon } from '@mui/icons-material';
import { monstersApi } from '../api/monsters';
import { Monster } from '../types/Monster';
import { useToast } from '../shared/ToastProvider';

const SHOWN_LIMIT = 200;

const keyOf = (m: Monster) => `${m.id ?? ''}-${m.name}`;

const QtyStepper: FC<{ qty: number; onChange: (n: number) => void }> = ({ qty, onChange }) => (
  <Stack
    direction="row"
    alignItems="center"
    onClick={(e) => e.stopPropagation()}
    sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}
  >
    <IconButton size="small" aria-label="fewer" onClick={() => onChange(qty - 1)}>
      <Remove sx={{ fontSize: 16 }} />
    </IconButton>
    <Typography
      variant="body2"
      sx={{ minWidth: 20, textAlign: 'center', fontFamily: '"JetBrains Mono", monospace' }}
    >
      {qty}
    </Typography>
    <IconButton size="small" aria-label="more" onClick={() => onChange(qty + 1)}>
      <Add sx={{ fontSize: 16 }} />
    </IconButton>
  </Stack>
);

const SelectMonster: FC<{
  onSelectMonster: (monsters: Monster[]) => void;
  buttonLabel?: string;
  actionLabel?: string;
  buttonProps?: ButtonProps;
}> = ({ onSelectMonster, buttonLabel = 'Add monsters', actionLabel = 'to combat', buttonProps }) => {
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState<Monster[]>([]);
  const [picked, setPicked] = useState<Map<string, { monster: Monster; qty: number }>>(new Map());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && all.length === 0) {
      setLoading(true);
      monstersApi
        .list()
        .then(setAll)
        .finally(() => setLoading(false));
    }
  }, [open, all.length]);

  const filtered = useMemo(() => {
    if (!search.trim()) return all;
    const q = search.toLowerCase();
    return all.filter((m) => m.name.toLowerCase().includes(q) || m.meta?.toLowerCase().includes(q));
  }, [all, search]);
  const shown = filtered.slice(0, SHOWN_LIMIT);

  const shownPicked = shown.filter((m) => picked.has(keyOf(m))).length;
  const allShownPicked = shown.length > 0 && shownPicked === shown.length;
  const totalQty = Array.from(picked.values()).reduce((n, p) => n + p.qty, 0);

  const setQty = (m: Monster, qty: number) =>
    setPicked((prev) => {
      const next = new Map(prev);
      if (qty <= 0) next.delete(keyOf(m));
      else next.set(keyOf(m), { monster: m, qty });
      return next;
    });

  const toggle = (m: Monster) => setQty(m, picked.has(keyOf(m)) ? 0 : 1);

  const toggleAllShown = () =>
    setPicked((prev) => {
      const next = new Map(prev);
      if (allShownPicked) shown.forEach((m) => next.delete(keyOf(m)));
      else shown.forEach((m) => !next.has(keyOf(m)) && next.set(keyOf(m), { monster: m, qty: 1 }));
      return next;
    });

  const close = () => {
    setOpen(false);
    setSearch('');
  };

  const onSubmit = () => {
    const monsters = Array.from(picked.values()).flatMap(({ monster, qty }) =>
      Array.from({ length: qty }, () => monster),
    );
    onSelectMonster(monsters);
    setPicked(new Map());
    close();
    toast(`${monsters.length} monster${monsters.length === 1 ? '' : 's'} added`, 'success');
  };

  return (
    <>
      <Button size="small" variant="outlined" startIcon={<Add />} onClick={() => setOpen(true)} {...buttonProps}>
        {buttonLabel}
      </Button>
      <Dialog open={open} onClose={close} maxWidth="lg" fullWidth PaperProps={{ sx: { minHeight: 540 } }}>
        <DialogTitle>Add monsters</DialogTitle>
        <DialogContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ minHeight: 440 }}>
            {/* Picker */}
            <Paper sx={{ flex: 1, p: 1.5, overflow: 'hidden' }}>
              <TextField
                fullWidth
                autoFocus
                size="small"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or type (e.g. goblin, undead)…"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ my: 0.5, pl: 1 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={allShownPicked}
                      indeterminate={shownPicked > 0 && !allShownPicked}
                      onChange={toggleAllShown}
                      disabled={shown.length === 0}
                    />
                  }
                  label={
                    <Typography variant="body2">
                      {allShownPicked ? 'Deselect' : 'Select'} all {shown.length} shown
                    </Typography>
                  }
                />
                {filtered.length > SHOWN_LIMIT && (
                  <Typography variant="caption" color="text.secondary">
                    Showing first {SHOWN_LIMIT} of {filtered.length} — refine your search
                  </Typography>
                )}
              </Stack>
              {loading ? (
                <Box sx={{ p: 2, textAlign: 'center' }}>
                  <Typography color="text.secondary">Loading…</Typography>
                </Box>
              ) : (
                <Box sx={{ maxHeight: 360, overflowY: 'auto' }}>
                  <Stack spacing={0.25}>
                    {shown.map((m) => {
                      const p = picked.get(keyOf(m));
                      return (
                        <ListItemButton
                          key={keyOf(m)}
                          onClick={() => toggle(m)}
                          selected={Boolean(p)}
                          sx={{ borderRadius: 1, py: 0.5, pl: 0.5 }}
                        >
                          <Checkbox size="small" checked={Boolean(p)} tabIndex={-1} disableRipple />
                          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={500} noWrap>
                              {m.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap component="div">
                              {m.meta}
                            </Typography>
                          </Box>
                          {p && <QtyStepper qty={p.qty} onChange={(n) => setQty(m, n)} />}
                          <Chip
                            label={`CR ${m.challenge}`}
                            size="small"
                            sx={{ fontFamily: '"JetBrains Mono", monospace', ml: 1 }}
                          />
                        </ListItemButton>
                      );
                    })}
                  </Stack>
                </Box>
              )}
            </Paper>

            {/* Selected */}
            <Paper sx={{ width: { xs: '100%', md: 300 }, p: 1.5 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="overline" color="text.secondary">
                  Selected ({totalQty})
                </Typography>
                {picked.size > 0 && (
                  <Button size="small" color="inherit" onClick={() => setPicked(new Map())}>
                    Clear
                  </Button>
                )}
              </Stack>
              <Box sx={{ maxHeight: 380, overflowY: 'auto', mt: 1 }}>
                {picked.size === 0 ? (
                  <Box
                    sx={{
                      p: 2,
                      textAlign: 'center',
                      border: '1px dashed',
                      borderColor: 'divider',
                      borderRadius: 1,
                      color: 'text.secondary',
                    }}
                  >
                    <Typography variant="body2">Tick monsters on the left, or select all after a search.</Typography>
                  </Box>
                ) : (
                  <Stack spacing={0.5}>
                    {Array.from(picked.values()).map(({ monster, qty }) => (
                      <Stack key={keyOf(monster)} direction="row" alignItems="center" spacing={1}>
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Typography variant="body2" noWrap>
                            {monster.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap component="div">
                            CR {monster.challenge}
                          </Typography>
                        </Box>
                        <QtyStepper qty={qty} onChange={(n) => setQty(monster, n)} />
                        <IconButton size="small" aria-label="remove" onClick={() => setQty(monster, 0)}>
                          <Close fontSize="small" />
                        </IconButton>
                      </Stack>
                    ))}
                  </Stack>
                )}
              </Box>
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={close}>Cancel</Button>
          <Button variant="contained" size="large" onClick={onSubmit} disabled={totalQty === 0} startIcon={<Add />}>
            Add {totalQty > 0 ? `${totalQty} ` : ''}
            {actionLabel}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SelectMonster;

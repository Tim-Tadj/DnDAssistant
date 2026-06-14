/**
 * SelectMonster - opens a dialog with a searchable monster picker.
 *
 * Uses the monsters API directly (not the entity browser) so this stays
 * decoupled from the monster-table page.
 */

import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  List,
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

const PAGE_SIZE = 12;

const SelectMonster: FC<{
  onSelectMonster: (monsters: Monster[]) => void;
}> = ({ onSelectMonster }) => {
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState<Monster[]>([]);
  const [picked, setPicked] = useState<Monster[]>([]);
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
    return all.filter((m) => m.name.toLowerCase().includes(q));
  }, [all, search]);

  const onPick = (m: Monster) => {
    setPicked((prev) => [...prev, m]);
  };

  const onUnpick = (i: number) => {
    setPicked((prev) => prev.filter((_, idx) => idx !== i));
  };

  const onSubmit = () => {
    onSelectMonster(picked);
    setPicked([]);
    setOpen(false);
    toast(`${picked.length} combatant${picked.length === 1 ? '' : 's'} added`, 'success');
  };

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        startIcon={<Add />}
        onClick={() => setOpen(true)}
      >
        Add
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { minHeight: 540 } }}
      >
        <DialogTitle>Add combatants</DialogTitle>
        <DialogContent>
          <Stack direction="row" spacing={2} sx={{ minHeight: 440 }}>
            {/* Picker */}
            <Paper sx={{ flex: 1, p: 1.5, overflow: 'hidden' }}>
              <TextField
                fullWidth
                size="small"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search monsters…"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 1.5 }}
              />
              {loading ? (
                <Box sx={{ p: 2, textAlign: 'center' }}>
                  <Typography color="text.secondary">Loading…</Typography>
                </Box>
              ) : (
                <Box sx={{ maxHeight: 380, overflowY: 'auto' }}>
                  <Stack spacing={0.5}>
                    {filtered.slice(0, 200).map((m) => (
                      <ListItemButton
                        key={`${m.id}-${m.name}`}
                        onClick={() => onPick(m)}
                        sx={{ borderRadius: 1 }}
                      >
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={500} noWrap>
                            {m.name}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            noWrap
                          >
                            {m.meta}
                          </Typography>
                        </Box>
                        <Chip
                          label={m.Challenge}
                          size="small"
                          sx={{
                            fontFamily: '"JetBrains Mono", monospace',
                            ml: 1,
                          }}
                        />
                      </ListItemButton>
                    ))}
                  </Stack>
                </Box>
              )}
            </Paper>

            {/* Selected */}
            <Paper sx={{ width: 280, p: 1.5 }}>
              <Typography variant="overline" color="text.secondary">
                Selected ({picked.length})
              </Typography>
              <Box sx={{ maxHeight: 380, overflowY: 'auto', mt: 1 }}>
                {picked.length === 0 ? (
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
                    <Typography variant="body2">
                      Click a monster on the left to add it.
                    </Typography>
                  </Box>
                ) : (
                  <List dense>
                    {picked.map((m, i) => (
                      <ListItemButton key={`${m.id}-${i}`} sx={{ borderRadius: 1 }}>
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Typography variant="body2" noWrap>
                            {m.name}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            noWrap
                          >
                            CR {m.Challenge}
                          </Typography>
                        </Box>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUnpick(i);
                          }}
                        >
                          <Remove fontSize="small" />
                        </IconButton>
                      </ListItemButton>
                    ))}
                  </List>
                )}
              </Box>
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={onSubmit}
            disabled={picked.length === 0}
            startIcon={<Add />}
          >
            Add {picked.length > 0 ? `${picked.length} ` : ''}to combat
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SelectMonster;

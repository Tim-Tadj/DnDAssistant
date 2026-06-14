// Phase 9: a global monster stat pane. Any component can call
// useMonsterStatPane().open(monster) and a side drawer slides
// in from the right with the monster's stat block. The pane is
// shared across the app — only one monster at a time — so it
// acts as a quick reference the DM can pull up during combat
// or session prep without losing their place.
//
// Usage: in a tracker row:
//   <Box onClick={() => statPane.open(monster)}>...</Box>
// And mount <MonsterStatPane /> once at the app root.

import React, { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import {
  Box,
  Drawer,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useTheme,
  alpha,
} from '@mui/material';
import { Close, OpenInNew } from '@mui/icons-material';
import { Monster } from '../types/Monster';
import MonsterStatBlock from './MonsterStatBlock';
import { useNavigate } from 'react-router-dom';

type StatPaneValue = {
  monster: Monster | null;
  open: (m: Monster) => void;
  close: () => void;
  isOpen: boolean;
};

const Ctx = createContext<StatPaneValue | null>(null);

export function MonsterStatPaneProvider({ children }: { children: ReactNode }) {
  const [monster, setMonster] = useState<Monster | null>(null);
  const navigate = useNavigate();
  const open = useCallback((m: Monster) => setMonster(m), []);
  const close = useCallback(() => setMonster(null), []);

  const value = useMemo<StatPaneValue>(
    () => ({ monster, open, close, isOpen: monster !== null }),
    [monster, open, close],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <Drawer
        anchor="right"
        open={monster !== null}
        onClose={close}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 480, md: 560 },
            p: 0,
            backgroundColor: 'background.paper',
          },
        }}
      >
        {monster && (
          <StatPaneContents monster={monster} onClose={close} onOpenFull={() => {
            close();
            navigate('monsters');
          }} />
        )}
      </Drawer>
    </Ctx.Provider>
  );
}

const StatPaneContents: React.FC<{
  monster: Monster;
  onClose: () => void;
  onOpenFull: () => void;
}> = ({ monster, onClose, onOpenFull }) => {
  const theme = useTheme();
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{
          p: 1.5,
          borderBottom: `1px solid ${theme.palette.divider}`,
          backgroundColor: alpha(theme.palette.primary.main, 0.08),
        }}
      >
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ flexGrow: 1, letterSpacing: 1 }}
        >
          Quick reference
        </Typography>
        <Tooltip title="Open in Monster browser" arrow>
          <IconButton size="small" onClick={onOpenFull}>
            <OpenInNew fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Close" arrow>
          <IconButton size="small" onClick={onClose}>
            <Close fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
        <MonsterStatBlock monster={monster} />
      </Box>
    </Box>
  );
};

export function useMonsterStatPane(): StatPaneValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useMonsterStatPane must be used within <MonsterStatPaneProvider>');
  return ctx;
}

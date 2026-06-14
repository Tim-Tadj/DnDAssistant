/**
 * GearDetailCard - PHB-style layout for a single gear item.
 *
 * Switches per kind: weapon shows damage/properties; armour shows AC/
 * requirements; plain gear shows description only.
 */

import React, { FC } from 'react';
import {
  Box,
  Divider,
  Stack,
  Typography,
  alpha,
  useTheme,
  Chip,
} from '@mui/material';
import { GearItem } from '../types/Gear';
import ProvenanceChip from './ProvenanceChip';

const Row: FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => {
  const theme = useTheme();
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{ py: 0.5, borderBottom: `1px dotted ${theme.palette.divider}` }}
    >
      <Typography
        variant="body2"
        sx={{ fontWeight: 700, minWidth: 120, color: 'primary.main' }}
      >
        {label}
      </Typography>
      <Typography variant="body2" component="div" sx={{ flexGrow: 1 }}>
        {value}
      </Typography>
    </Stack>
  );
};

const GearDetailCard: FC<{ item: GearItem }> = ({ item }) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        p: 2,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
        backgroundColor: alpha(theme.palette.background.default, 0.5),
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
        <Typography
          variant="h4"
          component="h2"
          sx={{
            fontFamily: '"Cinzel", serif',
            fontStyle: 'italic',
            flexGrow: 1,
            lineHeight: 1.1,
          }}
        >
          {item.name}
        </Typography>
        <ProvenanceChip value={item.provenance} />
      </Stack>
      <Typography
        variant="subtitle1"
        sx={{ fontStyle: 'italic', color: 'text.secondary', mb: 1.5 }}
      >
        {item.type} · {item.kind}
      </Typography>
      <Divider sx={{ borderColor: theme.palette.divider }} />
      <Box sx={{ my: 1.5 }}>
        <Row label="Cost" value={item.cost} />
        <Row label="Weight" value={item.weight} />
        {item.kind === 'weapon' && (
          <>
            <Row
              label="Damage"
              value={
                <Chip
                  label={item.Damage ?? '—'}
                  size="small"
                  sx={{ fontFamily: '"JetBrains Mono", monospace' }}
                />
              }
            />
            <Row
              label="Properties"
              value={
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                  {(item.Properties ?? '')
                    .split(',')
                    .map((p) => p.trim())
                    .filter(Boolean)
                    .map((p) => (
                      <Chip key={p} label={p} size="small" variant="outlined" />
                    ))}
                </Stack>
              }
            />
          </>
        )}
        {item.kind === 'armour' && (
          <>
            <Row label="Armor Class" value={item.AC} />
            <Row label="Strength" value={item.Strength || '—'} />
            <Row label="Stealth" value={item.Stealth || '—'} />
          </>
        )}
      </Box>
      {item.description && (
        <Box
          sx={{
            mt: 1.5,
            '& p': { m: '6px 0' },
            fontSize: '0.9rem',
            lineHeight: 1.55,
          }}
          dangerouslySetInnerHTML={{ __html: item.description }}
        />
      )}
    </Box>
  );
};

export default GearDetailCard;

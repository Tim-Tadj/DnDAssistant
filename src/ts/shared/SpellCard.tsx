/**
 * SpellCard - PHB-style spell layout.
 *
 * - Italic name, level·school sub-line
 * - Casting time, Range, Components, Duration row
 * - Description in the body
 * - Higher levels section (if present)
 */

import React, { FC } from 'react';
import { Box, Divider, Stack, Typography, alpha, useTheme, Chip } from '@mui/material';
import { Spell } from '../types/Spell';
import ProvenanceChip from './ProvenanceChip';

const formatLevel = (level: string) =>
  level === 'cantrip' ? 'Cantrip' : `Level ${level}`;

const SpellCard: FC<{ spell: Spell }> = ({ spell }) => {
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
          {spell.name}
        </Typography>
        <ProvenanceChip value={spell.provenance} />
      </Stack>
      <Typography
        variant="subtitle1"
        sx={{ fontStyle: 'italic', color: 'text.secondary', mb: 1.5 }}
      >
        {formatLevel(spell.level)} {spell.school}
        {spell.ritual ? ' (ritual)' : ''}
      </Typography>
      <Divider sx={{ borderColor: theme.palette.divider }} />
      <Stack spacing={0.75} sx={{ my: 1.5 }}>
        <Row label="Casting Time" value={spell.casting_time} />
        <Row label="Range" value={spell.range} />
        <Row
          label="Components"
          value={
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {spell.components.verbal && <Chip label="V" size="small" />}
              {spell.components.somatic && <Chip label="S" size="small" />}
              {spell.components.material && <Chip label="M" size="small" />}
              {(spell.components.materials_needed ?? []).length > 0 && (
                <Typography variant="body2" color="text.secondary">
                  ({(spell.components.materials_needed ?? []).join(', ')})
                </Typography>
              )}
            </Stack>
          }
        />
        <Row label="Duration" value={spell.duration} />
        {spell.classes.length > 0 && (
          <Row
            label="Classes"
            value={
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {spell.classes.map((c) => (
                  <Chip
                    key={c}
                    label={c}
                    size="small"
                    variant="outlined"
                    sx={{ textTransform: 'capitalize' }}
                  />
                ))}
              </Stack>
            }
          />
        )}
      </Stack>
      <Divider sx={{ borderColor: theme.palette.divider }} />
      <Box
        sx={{
          mt: 1.5,
          '& p': { m: '6px 0' },
          '& strong, & b': { color: 'primary.main', fontWeight: 600 },
          fontSize: '0.9rem',
          lineHeight: 1.55,
        }}
        dangerouslySetInnerHTML={{ __html: spell.description }}
      />
      {spell.higher_levels && (
        <Box
          sx={{
            mt: 1.5,
            '& p': { m: '6px 0' },
            '& strong, & b': { color: 'primary.main', fontWeight: 600 },
            fontSize: '0.9rem',
            lineHeight: 1.55,
          }}
        >
          <Typography
            variant="overline"
            sx={{
              display: 'block',
              color: 'primary.main',
              fontFamily: '"Cinzel", serif',
              fontSize: '0.8rem',
              letterSpacing: '0.12em',
            }}
          >
            At higher levels
          </Typography>
          <div dangerouslySetInnerHTML={{ __html: spell.higher_levels }} />
        </Box>
      )}
    </Box>
  );
};

const Row: FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => {
  const theme = useTheme();
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{ py: 0.25, borderBottom: `1px dotted ${theme.palette.divider}` }}
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

export default SpellCard;

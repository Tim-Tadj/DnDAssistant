/**
 * PartyComposition - a small dashboard at the top of the
 * Characters page summarising the user's PCs.
 *
 * Computes on read from the existing character list: average
 * level, average AC, total / average HP, class breakdown, role
 * heuristics (healer / tank / striker / nuker / utility).
 */

import React, { FC, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import { Groups, Shield, Favorite, Star } from '@mui/icons-material';
import { Character, DndClass } from '../types/Character';

type Props = {
  characters: Character[];
  classes?: DndClass[];
};

// Role inference based on class name. Lightweight heuristic for
// "what role does this character play in the party?".
function roleFor(character: Character, className: string): string {
  const n = className.toLowerCase();
  if (n === 'cleric' || n === 'druid' || n === 'bard' || n === 'paladin')
    return 'Healer/Support';
  if (n === 'fighter' || n === 'barbarian' || n === 'paladin')
    return 'Tank';
  if (n === 'rogue' || n === 'monk' || n === 'ranger') return 'Striker';
  if (n === 'wizard' || n === 'sorcerer' || n === 'warlock') return 'Caster';
  return 'Other';
}

const PartyComposition: FC<Props> = ({ characters, classes = [] }) => {
  const theme = useTheme();
  const summary = useMemo(() => {
    if (characters.length === 0) return null;
    const count = characters.length;
    const totalLevel = characters.reduce((acc, c) => acc + (c.level || 1), 0);
    const avgLevel = Math.round(totalLevel / count);
    const totalHp = characters.reduce((acc, c) => acc + (c.hp_max || 0), 0);
    const avgHp = Math.round(totalHp / count);
    const totalAc = characters.reduce((acc, c) => acc + (c.ac || 10), 0);
    const avgAc = Math.round(totalAc / count);
    const byClass: Record<string, number> = {};
    const byRole: Record<string, number> = {};
    for (const c of characters) {
      const k = classes.find((cl) => cl.id === c.class_id)?.name ?? '?';
      byClass[k] = (byClass[k] ?? 0) + 1;
      const role = roleFor(c, k);
      byRole[role] = (byRole[role] ?? 0) + 1;
    }
    return { count, avgLevel, avgHp, avgAc, byClass, byRole };
  }, [characters, classes]);

  if (!summary) return null;

  return (
    <Card
      variant="outlined"
      sx={{
        mb: 3,
        backgroundColor: alpha(theme.palette.primary.main, 0.04),
        borderColor: alpha(theme.palette.primary.main, 0.2),
      }}
    >
      <CardContent>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ mb: 1.5 }}
        >
          <Groups fontSize="small" sx={{ color: 'primary.main' }} />
          <Typography variant="h5">Party composition</Typography>
        </Stack>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          divider={
            <Divider
              orientation="vertical"
              flexItem
              sx={{ display: { xs: 'none', md: 'block' } }}
            />
          }
        >
          <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
            <Stat label="Characters" value={summary.count} />
            <Stat label="Avg level" value={summary.avgLevel} />
            <Stat label="Avg HP" value={summary.avgHp} icon={<Favorite fontSize="small" />} />
            <Stat label="Avg AC" value={summary.avgAc} icon={<Shield fontSize="small" />} />
          </Stack>
          <Divider
            orientation="horizontal"
            sx={{ display: { xs: 'block', md: 'none' }, width: '100%' }}
          />
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ display: 'block', mb: 0.5 }}
            >
              Class breakdown
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {Object.entries(summary.byClass).map(([cls, n]) => (
                <Chip
                  key={cls}
                  label={`${n} ${cls}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Stack>
          </Box>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ display: 'block', mb: 0.5 }}
            >
              Roles
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {Object.entries(summary.byRole).map(([role, n]) => (
                <Chip
                  key={role}
                  label={`${n} ${role}`}
                  size="small"
                  icon={<Star fontSize="small" />}
                  variant="outlined"
                />
              ))}
            </Stack>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

const Stat: FC<{ label: string; value: React.ReactNode; icon?: React.ReactNode }> = ({
  label,
  value,
  icon,
}) => (
  <Stack spacing={0.5} alignItems="center">
    <Stack direction="row" spacing={0.5} alignItems="center">
      {icon}
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Stack>
    <Typography
      variant="h5"
      sx={{ fontFamily: '"JetBrains Mono", monospace' }}
    >
      {value}
    </Typography>
  </Stack>
);

export default PartyComposition;

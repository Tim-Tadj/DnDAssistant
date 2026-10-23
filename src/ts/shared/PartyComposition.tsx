/**
 * PartyComposition - summary of a group of PCs.
 *
 * Computes on read from the character list: average level, AC and
 * HP, class breakdown and role heuristics (healer / tank / striker /
 * caster). Class names come from the shared reference cache unless
 * `classes` is passed in.
 *
 * - default: the dashboard card at the top of the Characters page.
 * - `compact`: a borderless strip for narrow cards (campaign parties).
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
import { classNameOf, useClasses } from './useReference';

type Props = {
  characters: Character[];
  classes?: DndClass[];
  compact?: boolean;
};

const UNKNOWN_CLASS = 'Unknown class';

// Role inference based on class name. Lightweight heuristic for
// "what role does this character play in the party?".
function roleFor(className: string): string {
  const n = className.toLowerCase();
  if (n === 'cleric' || n === 'druid' || n === 'bard' || n === 'paladin') return 'Healer/Support';
  if (n === 'fighter' || n === 'barbarian') return 'Tank';
  if (n === 'rogue' || n === 'monk' || n === 'ranger') return 'Striker';
  if (n === 'wizard' || n === 'sorcerer' || n === 'warlock') return 'Caster';
  return 'Other';
}

const avg = (cs: Character[], f: (c: Character) => number) =>
  Math.round(cs.reduce((acc, c) => acc + f(c), 0) / cs.length);

export function summarizeParty(characters: Character[], classes: DndClass[]) {
  if (characters.length === 0) return null;
  const byClass: Record<string, number> = {};
  const byRole: Record<string, number> = {};
  for (const c of characters) {
    const cls = classNameOf(classes, c.class_id) ?? UNKNOWN_CLASS;
    byClass[cls] = (byClass[cls] ?? 0) + 1;
    if (cls === UNKNOWN_CLASS) continue;
    const role = roleFor(cls);
    byRole[role] = (byRole[role] ?? 0) + 1;
  }
  return {
    count: characters.length,
    avgLevel: avg(characters, (c) => c.level || 1),
    avgHp: avg(characters, (c) => c.hp_max || 0),
    avgAc: avg(characters, (c) => c.ac || 10),
    byClass,
    byRole,
  };
}

const ChipRow: FC<{ counts: Record<string, number>; icon?: React.ReactElement; color?: 'primary' }> = ({
  counts,
  icon,
  color,
}) => (
  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
    {Object.entries(counts).map(([label, n]) => (
      <Chip key={label} label={`${n} ${label}`} size="small" icon={icon} color={color} variant="outlined" />
    ))}
  </Stack>
);

const PartyComposition: FC<Props> = ({ characters, classes: given, compact }) => {
  const theme = useTheme();
  const loaded = useClasses(!given);
  const classes = given ?? loaded;
  const summary = useMemo(() => summarizeParty(characters, classes), [characters, classes]);

  if (!summary) return null;

  if (compact) {
    return (
      <Stack spacing={1}>
        <Stack direction="row" spacing={2.5}>
          <Stat label="Avg level" value={summary.avgLevel} small />
          <Stat label="Avg HP" value={summary.avgHp} icon={<Favorite sx={{ fontSize: 14 }} />} small />
          <Stat label="Avg AC" value={summary.avgAc} icon={<Shield sx={{ fontSize: 14 }} />} small />
        </Stack>
        <ChipRow counts={summary.byClass} color="primary" />
        {Object.keys(summary.byRole).length > 0 && (
          <ChipRow counts={summary.byRole} icon={<Star fontSize="small" />} />
        )}
      </Stack>
    );
  }

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
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
          <Groups fontSize="small" sx={{ color: 'primary.main' }} />
          <Typography variant="h5">Party composition</Typography>
        </Stack>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          divider={<Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />}
        >
          <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
            <Stat label="Characters" value={summary.count} />
            <Stat label="Avg level" value={summary.avgLevel} />
            <Stat label="Avg HP" value={summary.avgHp} icon={<Favorite fontSize="small" />} />
            <Stat label="Avg AC" value={summary.avgAc} icon={<Shield fontSize="small" />} />
          </Stack>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="overline" sx={{ display: 'block', mb: 0.5 }}>
              Class breakdown
            </Typography>
            <ChipRow counts={summary.byClass} color="primary" />
          </Box>
          {Object.keys(summary.byRole).length > 0 && (
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="overline" sx={{ display: 'block', mb: 0.5 }}>
                Roles
              </Typography>
              <ChipRow counts={summary.byRole} icon={<Star fontSize="small" />} />
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

const Stat: FC<{ label: string; value: React.ReactNode; icon?: React.ReactNode; small?: boolean }> = ({
  label,
  value,
  icon,
  small,
}) => (
  <Stack spacing={small ? 0 : 0.5} alignItems={small ? 'flex-start' : 'center'}>
    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: 'text.secondary' }}>
      {icon}
      <Typography variant="caption" color="text.secondary" noWrap>
        {label}
      </Typography>
    </Stack>
    <Typography variant={small ? 'body1' : 'h5'} sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 }}>
      {value}
    </Typography>
  </Stack>
);

export default PartyComposition;

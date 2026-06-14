/**
 * CharacterCard - mini stat-block layout for a character.
 *
 * - Name + race/class header
 * - HP / AC / Speed boxed stats
 * - 3x2 ability score grid with computed mods
 * - Notes section
 */

import React, { FC, useEffect, useState } from 'react';
import { Box, Stack, Typography, alpha, useTheme, Divider } from '@mui/material';
import { Theme } from '@mui/material/styles';
import { Character, DndClass, Race } from '../types/Character';
import { referenceApi } from '../api/characters';
import ProvenanceChip from './ProvenanceChip';

const ABILITIES: Array<{ key: keyof Character; label: string }> = [
  { key: 'str', label: 'STR' },
  { key: 'dex', label: 'DEX' },
  { key: 'con', label: 'CON' },
  { key: 'int_', label: 'INT' },
  { key: 'wis', label: 'WIS' },
  { key: 'cha', label: 'CHA' },
];

const abilityMod = (score: number): string => {
  const m = Math.floor((score - 10) / 2);
  return m >= 0 ? `+${m}` : `${m}`;
};

const StatBox: FC<{ label: string; value: React.ReactNode; theme: Theme }> = ({
  label,
  value,
  theme,
}) => (
  <Box
    sx={{
      flex: 1,
      p: 1,
      textAlign: 'center',
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: 1,
      backgroundColor: alpha(theme.palette.primary.main, 0.06),
    }}
  >
    <Typography
      variant="overline"
      sx={{ display: 'block', fontSize: '0.65rem', lineHeight: 1 }}
      color="text.secondary"
    >
      {label}
    </Typography>
    <Typography
      sx={{
        fontFamily: '"JetBrains Mono", monospace',
        fontWeight: 600,
        fontSize: '1.05rem',
        lineHeight: 1.2,
      }}
    >
      {value}
    </Typography>
  </Box>
);

const CharacterCard: FC<{ item: Character }> = ({ item }) => {
  const theme = useTheme();
  const [races, setRaces] = useState<Race[] | null>(null);
  const [classes, setClasses] = useState<DndClass[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([referenceApi.listRaces(), referenceApi.listClasses()])
      .then(([r, c]) => {
        if (!cancelled) {
          setRaces(r);
          setClasses(c);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRaces([]);
          setClasses([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const race = races?.find((r) => r.id === item.race_id);
  const klass = classes?.find((c) => c.id === item.class_id);

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
        <ProvenanceChip value="homebrew" />
      </Stack>
      <Typography
        variant="subtitle1"
        sx={{ fontStyle: 'italic', color: 'text.secondary', mb: 1.5 }}
      >
        Level {item.level}{' '}
        {race ? race.name : races === null ? '…' : 'Unknown race'} ·{' '}
        {klass ? klass.name : classes === null ? '…' : 'Unknown class'}
        {item.alignment ? ` · ${item.alignment}` : ''}
      </Typography>
      <Divider sx={{ borderColor: theme.palette.divider }} />
      <Stack direction="row" spacing={1} sx={{ my: 1.5 }}>
        <StatBox label="Hit Points" value={item.hp_max} theme={theme} />
        <StatBox label="Armor Class" value={item.ac} theme={theme} />
        <StatBox label="Speed" value={race ? `${race.speed} ft` : '—'} theme={theme} />
      </Stack>
      <Divider sx={{ borderColor: theme.palette.divider }} />
      <Stack direction="row" spacing={1} sx={{ my: 1.5 }} flexWrap="wrap" useFlexGap>
        {ABILITIES.slice(0, 3).map((a) => (
          <StatBox
            key={a.key as string}
            label={a.label}
            value={
              <span>
                {(item[a.key] as number) ?? 10}{' '}
                <Typography
                  component="span"
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontFamily: '"JetBrains Mono", monospace' }}
                >
                  ({abilityMod((item[a.key] as number) ?? 10)})
                </Typography>
              </span>
            }
            theme={theme}
          />
        ))}
      </Stack>
      <Stack direction="row" spacing={1} sx={{ mb: 1.5 }} flexWrap="wrap" useFlexGap>
        {ABILITIES.slice(3).map((a) => (
          <StatBox
            key={a.key as string}
            label={a.label}
            value={
              <span>
                {(item[a.key] as number) ?? 10}{' '}
                <Typography
                  component="span"
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontFamily: '"JetBrains Mono", monospace' }}
                >
                  ({abilityMod((item[a.key] as number) ?? 10)})
                </Typography>
              </span>
            }
            theme={theme}
          />
        ))}
      </Stack>
      {item.background && (
        <>
          <Divider sx={{ borderColor: theme.palette.divider }} />
          <Stack direction="row" spacing={1} sx={{ py: 0.5 }}>
            <Typography
              variant="body2"
              sx={{ fontWeight: 700, minWidth: 100, color: 'primary.main' }}
            >
              Background
            </Typography>
            <Typography variant="body2" sx={{ flexGrow: 1 }}>
              {item.background}
            </Typography>
          </Stack>
        </>
      )}
      {item.notes && (
        <>
          <Divider sx={{ borderColor: theme.palette.divider }} />
          <Typography
            variant="overline"
            sx={{ display: 'block', color: 'primary.main', mt: 1, mb: 0.5 }}
          >
            Notes
          </Typography>
          <Typography
            variant="body2"
            sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.55 }}
          >
            {item.notes}
          </Typography>
        </>
      )}
    </Box>
  );
};

export default CharacterCard;

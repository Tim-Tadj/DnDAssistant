/**
 * MonsterStatBlock - PHB-style stat block layout.
 *
 * Reference: Player's Handbook, page 6 ("Statistics" / "Stat Blocks").
 *  - Italic name
 *  - Italic meta line
 *  - 3-column stat row (AC, HP, Speed)
 *  - 3x2 monospace ability-score grid
 *  - Sectioned body (saves/skills/dmg, senses/langs/CR, traits, actions,
 *    reactions, legendary, lair, regional, description)
 *
 * The 5e PHB uses a serifed italic name; we use Cinzel italic via a
 * variant override on <Typography>.
 */

import React, { FC } from 'react';
import {
  Box,
  Divider,
  Stack,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import { Theme } from '@mui/material/styles';
import { Monster, resolveImgUrl } from '../types/Monster';
import ProvenanceChip from './ProvenanceChip';

const abilityMod = (score: string): string => {
  const n = parseInt(score, 10);
  if (isNaN(n)) return '+0';
  const m = Math.floor((n - 10) / 2);
  return m >= 0 ? `+${m}` : `${m}`;
};

const ABILITIES: Array<{ key: keyof Monster; label: string; mod: keyof Monster }> = [
  { key: 'STR', label: 'STR', mod: 'STR_mod' },
  { key: 'DEX', label: 'DEX', mod: 'DEX_mod' },
  { key: 'CON', label: 'CON', mod: 'CON_mod' },
  { key: 'INT', label: 'INT', mod: 'INT_mod' },
  { key: 'WIS', label: 'WIS', mod: 'WIS_mod' },
  { key: 'CHA', label: 'CHA', mod: 'CHA_mod' },
];

const Section: FC<{ title: string; theme: Theme; children: React.ReactNode }> = ({
  title,
  theme,
  children,
}) => (
  <Box sx={{ mt: 1.5 }}>
    <Typography
      variant="overline"
      sx={{
        display: 'block',
        color: 'primary.main',
        fontFamily: '"Cinzel", serif',
        fontSize: '0.8rem',
        letterSpacing: '0.12em',
        borderBottom: `1px solid ${theme.palette.divider}`,
        pb: 0.25,
        mb: 0.75,
      }}
    >
      {title}
    </Typography>
    <Box
      sx={{
        '& p': { m: '4px 0' },
        '& strong': { color: 'text.primary' },
        color: 'text.primary',
        fontSize: '0.9rem',
        lineHeight: 1.55,
      }}
      dangerouslySetInnerHTML={{ __html: children as string }}
    />
  </Box>
);

const StatBox: FC<{ label: string; value: string | undefined; accent?: boolean }> = ({
  label,
  value,
  accent,
}) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        flex: 1,
        p: 1,
        textAlign: 'center',
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 1,
        backgroundColor: accent
          ? alpha(theme.palette.primary.main, 0.08)
          : 'transparent',
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
        variant="h5"
        sx={{
          fontFamily: '"JetBrains Mono", monospace',
          fontWeight: 600,
          fontSize: '1rem',
          lineHeight: 1.2,
        }}
      >
        {value || '—'}
      </Typography>
    </Box>
  );
};

const AbilityBox: FC<{ label: string; score: string; mod: string }> = ({ label, score, mod }) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        flex: 1,
        p: 1,
        textAlign: 'center',
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 1,
        backgroundColor: alpha(theme.palette.primary.main, 0.04),
      }}
    >
      <Typography
        variant="overline"
        sx={{
          display: 'block',
          fontSize: '0.65rem',
          fontWeight: 700,
          lineHeight: 1,
          color: 'primary.main',
        }}
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
        {score || '—'}
      </Typography>
      <Typography
        sx={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.8rem',
          lineHeight: 1.2,
          color: 'text.secondary',
        }}
      >
        ({mod})
      </Typography>
    </Box>
  );
};

const MonsterStatBlock: FC<{ monster: Monster; compact?: boolean }> = ({
  monster,
  compact,
}) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        p: 2,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
        backgroundColor: alpha(theme.palette.background.default, 0.5),
        position: 'relative',
        backgroundImage: `repeating-linear-gradient(0deg, transparent 0, transparent 27px, ${alpha(
          theme.palette.primary.main,
          0.04
        )} 27px, ${alpha(theme.palette.primary.main, 0.04)} 28px)`,
      }}
    >
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
        <Typography
          variant="h3"
          component="h2"
          sx={{
            fontFamily: '"Cinzel", serif',
            fontStyle: 'italic',
            flexGrow: 1,
            lineHeight: 1.1,
          }}
        >
          {monster.name}
        </Typography>
        <ProvenanceChip value={monster.provenance} />
      </Stack>
      <Typography
        variant="subtitle1"
        sx={{
          fontStyle: 'italic',
          color: 'text.secondary',
          mb: 1.5,
        }}
      >
        {monster.meta}
      </Typography>

      {!compact && monster.img_url && (
        <Box
          sx={{
            mb: 2,
            borderRadius: 1,
            overflow: 'hidden',
            border: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.background.paper,
            display: 'flex',
            justifyContent: 'center',
            maxHeight: 320,
          }}
        >
          <img
            src={resolveImgUrl(monster.img_url)}
            alt={monster.name}
            style={{
              maxWidth: '100%',
              maxHeight: 320,
              objectFit: 'contain',
            }}
          />
        </Box>
      )}

      <Divider sx={{ borderColor: theme.palette.divider }} />

      {/* Defense row */}
      <Stack direction="row" spacing={1} sx={{ my: 1.5 }}>
        <StatBox label="Armor Class" value={monster.AC} accent />
        <StatBox label="Hit Points" value={monster.HP} accent />
        <StatBox label="Speed" value={monster.Speed} />
      </Stack>

      <Divider sx={{ borderColor: theme.palette.divider }} />

      {/* Ability scores */}
      <Stack
        direction="row"
        spacing={1}
        sx={{ my: 1.5 }}
        flexWrap="wrap"
        useFlexGap
      >
        {ABILITIES.slice(0, 3).map((a) => (
          <AbilityBox
            key={a.key as string}
            label={a.label}
            score={monster[a.key] as string}
            mod={abilityMod(monster[a.key] as string)}
          />
        ))}
      </Stack>
      <Stack direction="row" spacing={1} sx={{ mb: 1.5 }} flexWrap="wrap" useFlexGap>
        {ABILITIES.slice(3).map((a) => (
          <AbilityBox
            key={a.key as string}
            label={a.label}
            score={monster[a.key] as string}
            mod={abilityMod(monster[a.key] as string)}
          />
        ))}
      </Stack>

      <Divider sx={{ borderColor: theme.palette.divider }} />

      {/* Defenses / senses / CR */}
      {[
        { label: 'Saving Throws', val: monster.Saving_Throws },
        { label: 'Skills', val: monster.Skills },
        { label: 'Damage Vulnerabilities', val: monster.Damage_Vulnerabilities },
        { label: 'Damage Resistances', val: monster.Damage_Resistances },
        { label: 'Damage Immunities', val: monster.Damage_Immunities },
        { label: 'Condition Immunities', val: monster.Condition_Immunities },
        { label: 'Senses', val: monster.Senses },
        { label: 'Languages', val: monster.Languages },
        { label: 'Challenge', val: monster.Challenge },
      ]
        .filter((row) => row.val && row.val.trim() && row.val !== '--')
        .map((row) => (
          <Stack
            key={row.label}
            direction="row"
            spacing={1}
            sx={{ py: 0.5, borderBottom: `1px dotted ${theme.palette.divider}` }}
          >
            <Typography
              variant="body2"
              sx={{
                fontWeight: 700,
                minWidth: 180,
                color: 'primary.main',
              }}
            >
              {row.label}
            </Typography>
            <Typography variant="body2" sx={{ flexGrow: 1 }}>
              {row.val}
            </Typography>
          </Stack>
        ))}

      {/* Lore */}
      {monster.description && (
        <Box
          sx={{
            mt: 1.5,
            fontStyle: 'italic',
            color: 'text.secondary',
            fontSize: '0.9rem',
            lineHeight: 1.55,
            '& p': { m: '6px 0' },
          }}
          dangerouslySetInnerHTML={{ __html: monster.description }}
        />
      )}

      {monster.Traits && <Section title="Traits" theme={theme}>{monster.Traits}</Section>}
      {monster.Actions && <Section title="Actions" theme={theme}>{monster.Actions}</Section>}
      {monster.Reactions && <Section title="Reactions" theme={theme}>{monster.Reactions}</Section>}
      {monster.Legendary_Actions && (
        <Section title="Legendary Actions" theme={theme}>{monster.Legendary_Actions}</Section>
      )}
      {monster.Lair_Actions && <Section title="Lair Actions" theme={theme}>{monster.Lair_Actions}</Section>}
      {monster.Regional_Effects && (
        <Section title="Regional Effects" theme={theme}>{monster.Regional_Effects}</Section>
      )}
    </Box>
  );
};

export default MonsterStatBlock;

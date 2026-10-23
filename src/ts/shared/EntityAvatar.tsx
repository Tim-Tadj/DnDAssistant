// Small visual markers for list rows, search results and detail headers,
// so a long list can be scanned by shape and colour as well as by name:
//   - monsters: their art (thumbnail), or a creature-type badge when they
//     only have D&D Beyond's stock picture; the frame is the type colour
//   - spells: a badge in the school's colour
//   - gear: a badge for the kind (melee/ranged weapon, armour, focus…)
//   - characters and NPCs: initials in a circle, coloured by class/role
// Badges are decorative (aria-hidden): the name always sits next to them.

import React, { FC, ReactNode } from 'react';
import { Box, Typography, alpha, createSvgIcon } from '@mui/material';
import {
  Air,
  AutoAwesome,
  AutoStories,
  Autorenew,
  Backpack,
  BlurOn,
  Bolt,
  Brightness7,
  DarkMode,
  Diamond,
  Favorite,
  Handyman,
  HelpOutline,
  LocalDrink,
  LocalFireDepartment,
  MusicNote,
  Nightlight,
  Park,
  PestControl,
  Person,
  Pets,
  PrecisionManufacturing,
  Sailing,
  SelfImprovement,
  Shield,
  Spa,
  Terrain,
  TrackChanges,
  Visibility,
  VisibilityOff,
  WaterDrop,
  Whatshot,
} from '@mui/icons-material';
import type { SvgIconComponent } from '@mui/icons-material';
import ArtImage from './ArtImage';
import { hasOwnArt } from './images';

// "sword" from Material Design Icons (Pictogrammers, Apache 2.0).
const Sword = createSvgIcon(
  <path d="M6.92,5H5L14,14L15,13.06M19.96,19.12L19.12,19.96C18.73,20.35 18.1,20.35 17.71,19.96L14.59,16.84L11.91,19.5L10.5,18.09L11.92,16.67L3,7.75V3H7.75L16.67,11.92L18.09,10.5L19.5,11.91L16.83,14.58L19.95,17.7C20.35,18.1 20.35,18.73 19.96,19.12Z" />,
  'Sword',
);

export type Visual = { label: string; color: string; Icon: SvgIconComponent };

const UNKNOWN: Visual = { label: 'Unknown', color: '#9a9ba1', Icon: HelpOutline };

const CREATURES: Record<string, Visual> = {
  aberration: { label: 'Aberration', color: '#c27ba0', Icon: Visibility },
  beast: { label: 'Beast', color: '#b39770', Icon: Pets },
  celestial: { label: 'Celestial', color: '#e6c372', Icon: Brightness7 },
  construct: { label: 'Construct', color: '#9aa5b1', Icon: PrecisionManufacturing },
  dragon: { label: 'Dragon', color: '#e07b4f', Icon: Whatshot },
  elemental: { label: 'Elemental', color: '#5fb3c9', Icon: Air },
  fey: { label: 'Fey', color: '#7fc9a0', Icon: Spa },
  fiend: { label: 'Fiend', color: '#d0505e', Icon: LocalFireDepartment },
  giant: { label: 'Giant', color: '#a08a6a', Icon: Terrain },
  humanoid: { label: 'Humanoid', color: '#7d96b3', Icon: Person },
  monstrosity: { label: 'Monstrosity', color: '#c08a5a', Icon: PestControl },
  ooze: { label: 'Ooze', color: '#9ccc65', Icon: WaterDrop },
  plant: { label: 'Plant', color: '#6fa86b', Icon: Park },
  undead: { label: 'Undead', color: '#9c8fc4', Icon: Nightlight },
};

// Monster `meta` reads like "Large dragon, chaotic evil" or "Medium
// humanoid (goblinoid), neutral evil"; the type is in the first part.
export const creatureVisual = (meta?: string | null): Visual => {
  const head = (meta ?? '').split(',')[0].toLowerCase();
  const type = Object.keys(CREATURES).find((t) => head.includes(t));
  return type ? CREATURES[type] : UNKNOWN;
};

const SCHOOLS: Record<string, Visual> = {
  abjuration: { label: 'Abjuration', color: '#7d96b3', Icon: Shield },
  conjuration: { label: 'Conjuration', color: '#d6a157', Icon: AutoAwesome },
  divination: { label: 'Divination', color: '#8cc6dc', Icon: Visibility },
  enchantment: { label: 'Enchantment', color: '#d48bb0', Icon: Favorite },
  evocation: { label: 'Evocation', color: '#e07b4f', Icon: Bolt },
  illusion: { label: 'Illusion', color: '#a58fd6', Icon: BlurOn },
  necromancy: { label: 'Necromancy', color: '#8fa36b', Icon: DarkMode },
  transmutation: { label: 'Transmutation', color: '#5fb3a0', Icon: Autorenew },
};

export const schoolVisual = (school?: string | null): Visual =>
  SCHOOLS[(school ?? '').trim().toLowerCase()] ?? UNKNOWN;

type GearLike = { kind?: string; type?: string; name?: string };

export const gearVisual = ({ kind, type = '', name = '' }: GearLike): Visual => {
  const t = type.toLowerCase();
  const n = name.toLowerCase();
  if (kind === 'weapon') {
    return t.includes('ranged')
      ? { label: 'Ranged weapon', color: '#c9a14a', Icon: TrackChanges }
      : { label: 'Melee weapon', color: '#d0705e', Icon: Sword };
  }
  if (kind === 'armour') return { label: t === 'shield' ? 'Shield' : 'Armour', color: '#9aa5b1', Icon: Shield };
  if (t.includes('arcane')) return { label: 'Arcane focus', color: '#a58fd6', Icon: AutoAwesome };
  if (t.includes('druidic')) return { label: 'Druidic focus', color: '#6fa86b', Icon: Spa };
  if (t.includes('holy')) return { label: 'Holy symbol', color: '#e6c372', Icon: Brightness7 };
  if (t.includes('wondrous')) return { label: 'Wondrous item', color: '#d48bb0', Icon: Diamond };
  if (t.includes('ammunition')) return { label: 'Ammunition', color: '#c9a14a', Icon: TrackChanges };
  if (/potion|vial|flask|oil|water|antitoxin|poison/.test(n)) return { label: 'Consumable', color: '#5fb3c9', Icon: LocalDrink };
  if (/instrument|lute|flute|drum|horn|lyre|bagpipes|viol|dulcimer|pan flute|shawm/.test(n))
    return { label: 'Instrument', color: '#d48bb0', Icon: MusicNote };
  if (/kit|tools|supplies|hammer|crowbar|pick|shovel|piton|tackle/.test(n)) return { label: 'Tools', color: '#b39770', Icon: Handyman };
  if (/boat|ship|galley|keelboat|longship|sailing|rowboat|warship/.test(n)) return { label: 'Vehicle', color: '#5fb3c9', Icon: Sailing };
  return { label: 'Gear', color: '#a08a6a', Icon: Backpack };
};

const CLASSES: Record<string, Visual> = {
  barbarian: { label: 'Barbarian', color: '#d0505e', Icon: Whatshot },
  bard: { label: 'Bard', color: '#d48bb0', Icon: MusicNote },
  cleric: { label: 'Cleric', color: '#e6c372', Icon: Brightness7 },
  druid: { label: 'Druid', color: '#6fa86b', Icon: Spa },
  fighter: { label: 'Fighter', color: '#9aa5b1', Icon: Sword },
  monk: { label: 'Monk', color: '#5fb3c9', Icon: SelfImprovement },
  paladin: { label: 'Paladin', color: '#c9a14a', Icon: Shield },
  ranger: { label: 'Ranger', color: '#8fae6b', Icon: TrackChanges },
  rogue: { label: 'Rogue', color: '#8a8fa0', Icon: VisibilityOff },
  sorcerer: { label: 'Sorcerer', color: '#e07b4f', Icon: Bolt },
  warlock: { label: 'Warlock', color: '#a58fd6', Icon: Visibility },
  wizard: { label: 'Wizard', color: '#7d96b3', Icon: AutoStories },
};

export const classVisual = (className?: string | null): Visual =>
  knownClassVisual(className) ?? { ...UNKNOWN, label: className || 'Character', Icon: Person };

// Only the twelve PHB classes; undefined for anything else.
export const knownClassVisual = (className?: string | null): Visual | undefined =>
  CLASSES[(className ?? '').trim().toLowerCase()];

const ROLES: Record<string, string> = {
  ally: '#6fa86b',
  neutral: '#9aa5b1',
  antagonist: '#d6a157',
  villain: '#d0505e',
  boss: '#c27ba0',
  notable: '#c9a14a',
};
export const roleColor = (role?: string | null) => ROLES[(role ?? '').toLowerCase()] ?? '#9a9ba1';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || '?';

type Shape = 'square' | 'circle';

// The frame every avatar shares: fixed size (no layout shift while art
// loads), tinted with the entity's colour.
const Frame: FC<{ color: string; size: number; shape?: Shape; title?: string; children: ReactNode }> = ({
  color,
  size,
  shape = 'square',
  title,
  children,
}) => (
  <Box
    aria-hidden
    title={title}
    sx={{
      width: size,
      height: size,
      flexShrink: 0,
      borderRadius: shape === 'circle' ? '50%' : `${Math.round(size / 5)}px`,
      overflow: 'hidden',
      display: 'grid',
      placeItems: 'center',
      color,
      bgcolor: alpha(color, 0.14),
      boxShadow: `inset 0 0 0 1px ${alpha(color, 0.45)}`,
      '& > img, & > picture > img': { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
    }}
  >
    {children}
  </Box>
);

const BadgeIcon: FC<{ visual: Visual; size: number }> = ({ visual: { Icon }, size }) => (
  <Icon sx={{ fontSize: Math.round(size * 0.58) }} />
);

export const VisualBadge: FC<{ visual: Visual; size?: number; shape?: Shape }> = ({ visual, size = 32, shape }) => (
  <Frame color={visual.color} size={size} shape={shape} title={visual.label}>
    <BadgeIcon visual={visual} size={size} />
  </Frame>
);

type MonsterLike = { name: string; meta?: string | null; img_url?: string | null };

export const MonsterAvatar: FC<{ monster: MonsterLike; size?: number }> = ({ monster, size = 32 }) => {
  const visual = creatureVisual(monster.meta);
  const badge = <BadgeIcon visual={visual} size={size} />;
  return (
    <Frame color={visual.color} size={size} title={visual.label}>
      {hasOwnArt(monster.img_url) ? (
        <ArtImage url={monster.img_url} variant="thumb" alt="" fallback={badge} />
      ) : (
        badge
      )}
    </Frame>
  );
};

export const SpellAvatar: FC<{ spell: { school?: string | null }; size?: number }> = ({ spell, size }) => (
  <VisualBadge visual={schoolVisual(spell.school)} size={size} />
);

export const GearAvatar: FC<{ item: GearLike; size?: number }> = ({ item, size }) => (
  <VisualBadge visual={gearVisual(item)} size={size} />
);

export const InitialsAvatar: FC<{ name: string; color: string; size?: number; title?: string }> = ({
  name,
  color,
  size = 32,
  title,
}) => (
  <Frame color={color} size={size} shape="circle" title={title}>
    <Typography component="span" sx={{ fontSize: Math.round(size * 0.4), fontWeight: 700, lineHeight: 1, letterSpacing: 0.5 }}>
      {initials(name)}
    </Typography>
  </Frame>
);

export const CharacterAvatar: FC<{ name: string; className?: string | null; size?: number }> = ({
  name,
  className,
  size,
}) => {
  const visual = classVisual(className);
  return <InitialsAvatar name={name} color={visual.color} size={size} title={visual.label} />;
};

// Colours and icons for the player guides: one per guide (the rail, the
// page header, search results) and badges beside the headings a reader
// scans for — abilities, conditions, classes and races.

import React, { ReactNode } from 'react';
import {
  AccessibilityNew,
  AutoStories,
  BatteryAlert,
  Bedtime,
  Block,
  BlurOn,
  Casino,
  DirectionsRun,
  Favorite,
  FitnessCenter,
  Groups,
  HealthAndSafety,
  HearingDisabled,
  Hotel,
  Landscape,
  Link,
  PanTool,
  Psychology,
  RecordVoiceOver,
  Science,
  SentimentVeryDissatisfied,
  Shield,
  SportsMartialArts,
  Stars,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { InitialsAvatar, Visual, VisualBadge, knownClassVisual } from '../shared/EntityAvatar';
import { GuideId } from './guideModel';

export const GUIDE_VISUALS: Record<GuideId, Visual> = {
  mechanics: { label: 'Mechanics', color: '#c9a14a', Icon: Casino },
  combat: { label: 'Combat', color: '#d0705e', Icon: SportsMartialArts },
  races: { label: 'Races', color: '#7fc9a0', Icon: Groups },
  classes: { label: 'Classes', color: '#7d96b3', Icon: Shield },
  conditions: { label: 'Conditions', color: '#a58fd6', Icon: HealthAndSafety },
  running: { label: 'Running the Game', color: '#d6a157', Icon: AutoStories },
};

const ABILITIES: Record<string, Visual> = {
  Strength: { label: 'Strength', color: '#d0705e', Icon: FitnessCenter },
  Dexterity: { label: 'Dexterity', color: '#6fa86b', Icon: DirectionsRun },
  Constitution: { label: 'Constitution', color: '#e0a050', Icon: Favorite },
  Intelligence: { label: 'Intelligence', color: '#7d96b3', Icon: Psychology },
  Wisdom: { label: 'Wisdom', color: '#5fb3a0', Icon: Visibility },
  Charisma: { label: 'Charisma', color: '#d48bb0', Icon: RecordVoiceOver },
};

const CONDITIONS: Record<string, Visual> = {
  Blinded: { label: 'Blinded', color: '#8a8fa0', Icon: VisibilityOff },
  Charmed: { label: 'Charmed', color: '#d48bb0', Icon: Favorite },
  Deafened: { label: 'Deafened', color: '#9aa5b1', Icon: HearingDisabled },
  Exhaustion: { label: 'Exhaustion', color: '#c08a5a', Icon: BatteryAlert },
  Frightened: { label: 'Frightened', color: '#a58fd6', Icon: SentimentVeryDissatisfied },
  Grappled: { label: 'Grappled', color: '#b39770', Icon: PanTool },
  Incapacitated: { label: 'Incapacitated', color: '#d0505e', Icon: Block },
  Invisible: { label: 'Invisible', color: '#8cc6dc', Icon: BlurOn },
  Paralyzed: { label: 'Paralyzed', color: '#e6c372', Icon: AccessibilityNew },
  Petrified: { label: 'Petrified', color: '#9aa5b1', Icon: Landscape },
  Poisoned: { label: 'Poisoned', color: '#9ccc65', Icon: Science },
  Prone: { label: 'Prone', color: '#b39770', Icon: Hotel },
  Restrained: { label: 'Restrained', color: '#c27ba0', Icon: Link },
  Stunned: { label: 'Stunned', color: '#e6c372', Icon: Stars },
  Unconscious: { label: 'Unconscious', color: '#7d96b3', Icon: Bedtime },
};

const RACES: Record<string, string> = {
  Dwarf: '#c08a5a',
  Elf: '#6fa86b',
  Halfling: '#d6a157',
  Human: '#7d96b3',
  Dragonborn: '#d0505e',
  Gnome: '#5fb3a0',
  'Half-Elf': '#8fae6b',
  'Half-Orc': '#9ccc65',
  Tiefling: '#a58fd6',
};

// The badge for a heading, if it names something with a visual of its
// own in that guide.
export function headingBadge(guide: GuideId, title: string, size: number): ReactNode {
  const visual =
    (guide === 'mechanics' && ABILITIES[title]) ||
    (guide === 'conditions' && CONDITIONS[title]) ||
    (guide === 'classes' && knownClassVisual(title));
  if (visual) return <VisualBadge visual={visual} size={size} />;
  if (guide === 'races' && RACES[title]) return <InitialsAvatar name={title} color={RACES[title]} size={size} title={title} />;
  return null;
}

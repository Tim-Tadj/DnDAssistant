// Spells are loaded from the backend API (see src/ts/api/spells.ts). The
// bundled SRD file is still used as a seed by the backend at startup, but
// the frontend reads from `/api/v1/spells` so any user-created (homebrew)
// spells show up too.

export type SpellComponent = {
  material: boolean,
  materials_needed: string[],
  raw: string,
  somatic: boolean,
  verbal: boolean
}
export const defaultComponent = {
  material: false,
  materials_needed: [],
  raw: "",
  somatic: false,
  verbal: false,
};

export type Spell = {
  id?: number,
  casting_time: string,
  classes: string[],
  components: SpellComponent,
  description: string,
  duration: string,
  higher_levels: string,
  level: string,
  name: string,
  range: string,
  ritual: boolean,
  school: string,
  tags: string[],
  type: string,
  provenance?: string,
};

export const defaultSpell: Spell = {
  casting_time: "1 action",
  classes: [
    "wizard"
  ],
  components: defaultComponent,
  description: "",
  duration: "Instantaneous",
  higher_levels: "",
  level: "cantrip",
  name: "",
  range: "Touch",
  ritual: false,
  school: "abjuration",
  tags: [
    "wizard",
    "cantrip"
  ],
  type: "abjuration cantrip"
}


export const LEVELS = ['cantrip', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
export const CLASSES = ['druid', 'sorcerer', 'wizard', 'ranger', 'bard', 'warlock', 'cleric', 'paladin'];
export const SCHOOLS = [
  'conjuration',
  'abjuration',
  'enchantment',
  'evocation',
  'necromancy',
  'illusion',
  'divination',
  'transmutation'
];

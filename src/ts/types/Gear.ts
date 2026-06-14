// Legacy types derived from the bundled JSON. The editors and column
// descriptors still rely on these shapes; they're left in place during
// the Phase 1 cut-over. The API now returns the unified `GearItem`
// shape (see below).
import bundledGear from '../../res/resources/srd_5e_gear.json';
import bundledWeapon from '../../res/resources/srd_5e_weapons.json';
import bundledArmour from '../../res/resources/srd_5e_armour.json';

export type Gear = typeof bundledGear[0] & { description?: string };
export const defaultGear: Gear = {
  name: '',
  cost: '1 cp',
  weight: '1 lb.',
  type: '',
  description: '',
};

export type Weapon = typeof bundledWeapon[0] & { description?: string };
export const defaultWeapon = {
  name: '',
  cost: '1 cp',
  damage: '1d4 bludgeoning',
  weight: '1 lb.',
  properties: '',
  type: '',
  description: '',
};

export type Armour = typeof bundledArmour[0] & { description?: string };
export const defaultArmour = {
  name: '',
  cost: '1 cp',
  AC: '10 + Dex modifier',
  strength: '',
  stealth: '',
  weight: '1 lb.',
  type: 'Light',
  description: '',
};

// Unified shape returned by the backend (see GearController.java).
// The DB stores weapons/armour/gear in a single table discriminated
// by `kind`; type-specific fields are nullable.
export type GearKind = 'weapon' | 'armour' | 'gear';

export type GearItem = {
  id?: number;
  name: string;
  kind: GearKind;
  cost: string;
  weight: string;
  type: string;
  Damage?: string;
  Properties?: string;
  AC?: string;
  Strength?: string;
  Stealth?: string;
  description?: string;
  provenance?: string;
};

export const defaultGearItem: GearItem = {
  name: '',
  kind: 'gear',
  cost: '1 cp',
  weight: '1 lb.',
  type: '',
  description: '',
};

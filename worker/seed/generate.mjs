#!/usr/bin/env node
// Seed-script generator for Cloudflare D1. Reads the bundled JSON corpora
// under src/res/resources and the hard-coded SRD reference data, and writes
// worker/seed/seed.sql with idempotent INSERT statements.
//
// Idempotency: every INSERT is wrapped in `INSERT OR IGNORE` against the
// natural UNIQUE constraints on (name, provenance, owner_user_id) for
// spells/monsters, (name, kind, provenance, owner_user_id) for gear, and
// (name) for classes/races. Re-running the script is a no-op.
//
// Usage:
//   node worker/seed/generate.mjs                 # writes worker/seed/seed.sql
//   npm run seed:generate --prefix worker
//   npm run seed:local      --prefix worker       # wrangler d1 execute --local --file=seed/seed.sql
//   npm run seed:remote     --prefix worker       # wrangler d1 execute --remote --file=seed/seed.sql

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..', '..');
const RES = join(ROOT, 'src', 'res', 'resources');
const OUT_DIR = __dirname;
const FILES = {
  classes: join(OUT_DIR, 'seed-classes.sql'),
  races: join(OUT_DIR, 'seed-races.sql'),
  spells: join(OUT_DIR, 'seed-spells.sql'),
  gear: join(OUT_DIR, 'seed-gear.sql'),
  monsters: join(OUT_DIR, 'seed-monsters.sql'),
  all: join(OUT_DIR, 'seed.sql'),
};

// ---- helpers --------------------------------------------------------------

const sqlLit = (v) => {
  if (v == null) return 'NULL';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  if (typeof v === 'boolean') return v ? '1' : '0';
  return "'" + String(v).replace(/'/g, "''") + "'";
};

const jsonLit = (v) => sqlLit(JSON.stringify(v ?? null));
const csvLit = (arr) =>
  Array.isArray(arr) && arr.length
    ? sqlLit(arr.map((x) => String(x).trim()).filter(Boolean).join(','))
    : "''";

const read = (p) => JSON.parse(readFileSync(p, 'utf8'));

// ---- reference data (classes + races) -------------------------------------

const CLASSES = [
  ['Barbarian', 'd12', 'Strength', 'A fierce warrior of primitive background who can enter a battle rage.'],
  ['Bard',      'd8',  'Charisma',  'An inspiring magician whose power echoes the music of creation.'],
  ['Cleric',    'd8',  'Wisdom',    'A priestly champion who wields divine magic in service of a higher power.'],
  ['Druid',     'd8',  'Wisdom',    'A priest of the Old Faith, wielding the powers of nature and adopting animal forms.'],
  ['Fighter',   'd10', 'Strength',  'A master of martial combat, skilled with a variety of weapons and armor.'],
  ['Monk',      'd8',  'Dexterity', 'A master of martial arts, harnessing the power of the body in pursuit of physical perfection.'],
  ['Paladin',   'd10', 'Charisma',  'A holy warrior bound to a sacred oath.'],
  ['Ranger',    'd10', 'Dexterity', 'A warrior who uses martial prowess and nature magic to combat threats on the edges of civilization.'],
  ['Rogue',     'd8',  'Dexterity', 'A scoundrel who uses stealth and trickery to overcome obstacles and enemies.'],
  ['Sorcerer',  'd6',  'Charisma',  'A spellcaster who draws on inherent magic from a gift or bloodline.'],
  ['Warlock',   'd8',  'Charisma',  'A wielder of magic derived from a bargain with an extraplanar entity.'],
  ['Wizard',    'd6',  'Intelligence', 'A scholarly magic-user capable of manipulating the structures of reality.'],
];

const RACES = [
  ['Dwarf',      'Medium', 25, '+2 Constitution', 'Darkvision, dwarven resilience, stonecunning.'],
  ['Elf',        'Medium', 30, '+2 Dexterity', 'Darkvision, keen senses, fey ancestry, trance.'],
  ['Halfling',   'Small',  25, '+2 Dexterity', 'Lucky, brave, halfling nimbleness.'],
  ['Human',      'Medium', 30, '+1 to all abilities', 'Versatile: extra skill.'],
  ['Dragonborn', 'Medium', 30, '+2 Strength, +1 Charisma', 'Draconic ancestry, breath weapon, damage resistance.'],
  ['Gnome',      'Small',  25, '+2 Intelligence', 'Darkvision, gnome cunning.'],
  ['Half-Elf',   'Medium', 30, '+2 Charisma, +1 to two others', 'Darkvision, fey ancestry, skill versatility.'],
  ['Half-Orc',   'Medium', 30, '+2 Strength, +1 Constitution', 'Darkvision, relentless endurance, savage attacks.'],
  ['Tiefling',   'Medium', 30, '+2 Charisma, +1 Intelligence', 'Darkvision, hellish resistance, infernal legacy.'],
];

// SQLite UNIQUE treats NULLs as distinct, so INSERT OR IGNORE on
// (name, provenance, owner_user_id) would re-insert NULL-owner rows on a
// second run. Use WHERE NOT EXISTS against the natural key (treating
// NULL == NULL via IS NULL) so the seed is genuinely idempotent.
const whereNotExists = (table, conds) =>
  `WHERE NOT EXISTS (SELECT 1 FROM ${table} WHERE ${conds.join(' AND ')})`;
const ownerIsNull = `(${`owner_user_id`} IS NULL)`;

const stmtsClasses = [];
stmtsClasses.push('-- Seed: classes (SRD reference data)');
stmtsClasses.push(`-- Generated at ${new Date().toISOString()}`);
stmtsClasses.push('');
for (const [name, hitDie, primary, description] of CLASSES) {
  stmtsClasses.push(
    `INSERT INTO classes (name, hit_die, primary_ability, description, source) ` +
      `SELECT ${sqlLit(name)}, ${sqlLit(hitDie)}, ${sqlLit(primary)}, ${sqlLit(description)}, 'srd' ` +
      `${whereNotExists('classes', [`name = ${sqlLit(name)}`])};`,
  );
}

const stmtsRaces = [];
stmtsRaces.push('-- Seed: races (SRD reference data)');
stmtsRaces.push(`-- Generated at ${new Date().toISOString()}`);
stmtsRaces.push('');
for (const [name, size, speed, bonuses, traits] of RACES) {
  stmtsRaces.push(
    `INSERT INTO races (name, size, speed, ability_bonuses, traits, source) ` +
      `SELECT ${sqlLit(name)}, ${sqlLit(size)}, ${speed}, ${sqlLit(bonuses)}, ${sqlLit(traits)}, 'srd' ` +
      `${whereNotExists('races', [`name = ${sqlLit(name)}`])};`,
  );
}

// ---- spells (SRD + custom) ------------------------------------------------

const SPELL_COLS = [
  'name', 'level', 'school', 'type', 'casting_time', 'spell_range', 'duration',
  'ritual', 'description', 'higher_levels', 'classes', 'tags', 'components',
  'provenance',
];

function spellToRow(s, provenance) {
  return {
    name: s.name,
    level: s.level ?? '',
    school: s.school ?? '',
    type: s.type ?? '',
    casting_time: s.casting_time ?? '',
    spell_range: s.range ?? '',
    duration: s.duration ?? '',
    ritual: s.ritual ? 1 : 0,
    description: s.description ?? '',
    higher_levels: s.higher_levels ?? '',
    classes: Array.isArray(s.classes) ? s.classes.join(',') : '',
    tags: Array.isArray(s.tags) ? s.tags.join(',') : '',
    components: s.components && typeof s.components === 'object' ? JSON.stringify(s.components) : '{}',
    provenance,
  };
}

const spellFiles = [
  ['SRD 5e spells', join(RES, 'srd_5e_spells.json'), 'srd'],
  ['Custom spells', join(RES, 'custom_spells.json'), 'homebrew'],
];

const stmtsSpells = [];
stmtsSpells.push('-- Seed: spells (SRD + custom)');
stmtsSpells.push(`-- Generated at ${new Date().toISOString()}`);
stmtsSpells.push('');

for (const [label, path, provenance] of spellFiles) {
  let rows;
  try {
    rows = read(path);
  } catch (e) {
    continue;
  }
  stmtsSpells.push(`-- ${label} (${rows.length})`);
  for (const s of rows) {
    const r = spellToRow(s, provenance);
    const colList = [...SPELL_COLS, 'owner_user_id'].join(', ');
    const components = JSON.parse(r.components);
    const vals = SPELL_COLS.map((c) =>
      c === 'components' ? jsonLit(components) : sqlLit(r[c]),
    );
    vals.push('NULL'); // owner_user_id
    stmtsSpells.push(
      `INSERT INTO spells (${colList}) ` +
        `SELECT ${vals.join(', ')} ` +
        `${whereNotExists('spells', [
          `name = ${sqlLit(r.name)}`,
          `provenance = ${sqlLit(provenance)}`,
          ownerIsNull,
        ])};`,
    );
  }
}

// ---- gear (weapons + armour + gear from srd + custom) ---------------------

const GEAR_COLS = [
  'name', 'kind', 'cost', 'weight', 'type', 'damage', 'properties', 'ac',
  'strength', 'stealth', 'description', 'provenance',
];

function gearToRow(g, kind, provenance) {
  return {
    name: g.name,
    kind,
    cost: g.cost ?? '',
    weight: g.weight ?? '',
    type: g.type ?? '',
    damage: g.damage ?? null,
    properties: g.properties ?? null,
    ac: g.AC ?? null,
    strength: g.strength ?? null,
    stealth: g.stealth ?? null,
    description: g.description ?? null,
    provenance,
  };
}

const gearFiles = [
  ['SRD 5e weapons', join(RES, 'srd_5e_weapons.json'), 'weapon', 'srd'],
  ['SRD 5e armour',  join(RES, 'srd_5e_armour.json'),  'armour', 'srd'],
  ['SRD 5e gear',    join(RES, 'srd_5e_gear.json'),    'gear',   'srd'],
  ['Custom weapons', join(RES, 'custom_weapons.json'), 'weapon', 'homebrew'],
  ['Custom armour',  join(RES, 'custom_armour.json'),  'armour', 'homebrew'],
  ['Custom gear',    join(RES, 'custom_gear.json'),    'gear',   'homebrew'],
];

const stmtsGear = [];
stmtsGear.push('-- Seed: gear (weapons/armour/gear; SRD + custom)');
stmtsGear.push(`-- Generated at ${new Date().toISOString()}`);
stmtsGear.push('');

for (const [label, path, kind, provenance] of gearFiles) {
  let rows;
  try {
    rows = read(path);
  } catch (e) {
    continue;
  }
  if (!rows.length) continue;
  stmtsGear.push(`-- ${label} (${rows.length})`);
  for (const g of rows) {
    const r = gearToRow(g, kind, provenance);
    const colList = [...GEAR_COLS, 'owner_user_id'].join(', ');
    const vals = GEAR_COLS.map((c) => sqlLit(r[c]));
    vals.push('NULL'); // owner_user_id
    stmtsGear.push(
      `INSERT INTO gear (${colList}) ` +
        `SELECT ${vals.join(', ')} ` +
        `${whereNotExists('gear', [
          `name = ${sqlLit(r.name)}`,
          `kind = ${sqlLit(kind)}`,
          `provenance = ${sqlLit(provenance)}`,
          ownerIsNull,
        ])};`,
    );
  }
}

// ---- monsters (Monster Manual) --------------------------------------------
//
// The Monster Manual JSON uses PascalCase (e.g. `STR`, `HP`, `Actions`);
// the Worker route normalizes them. For the seed script we mirror that
// normalization inline (see routes/monsters.ts).

const MONSTER_FIELDS = [
  'meta', 'ac', 'hp', 'speed',
  'str', 'str_mod', 'dex', 'dex_mod', 'con', 'con_mod',
  'int', 'int_mod', 'wis', 'wis_mod', 'cha', 'cha_mod',
  'saving_throws', 'skills',
  'damage_vulnerabilities', 'damage_resistances', 'damage_immunities',
  'condition_immunities', 'senses', 'languages', 'challenge',
  'traits', 'actions', 'reactions', 'legendary_actions',
  'description', 'lair_actions', 'regional_effects', 'img_url',
];

const MONSTER_COLS = ['name', ...MONSTER_FIELDS, 'provenance'];

function monsterToRow(m) {
  const out = { name: m.name };
  out.meta = m.meta ?? '';
  out.ac = m.AC ?? '';
  out.hp = m.HP ?? '';
  out.speed = m.Speed ?? '';
  out.str = m.STR ?? '';
  out.str_mod = m.STR_mod ?? '';
  out.dex = m.DEX ?? '';
  out.dex_mod = m.DEX_mod ?? '';
  out.con = m.CON ?? '';
  out.con_mod = m.CON_mod ?? '';
  out.int = m.INT ?? '';
  out.int_mod = m.INT_mod ?? '';
  out.wis = m.WIS ?? '';
  out.wis_mod = m.WIS_mod ?? '';
  out.cha = m.CHA ?? '';
  out.cha_mod = m.CHA_mod ?? '';
  out.saving_throws = m.Saving_Throws ?? '';
  out.skills = m.Skills ?? '';
  out.damage_vulnerabilities = m.Damage_Vulnerabilities ?? '';
  out.damage_resistances = m.Damage_Resistances ?? '';
  out.damage_immunities = m.Damage_Immunities ?? '';
  out.condition_immunities = m.Condition_Immunities ?? '';
  out.senses = m.Senses ?? '';
  out.languages = m.Languages ?? '';
  out.challenge = m.Challenge ?? '';
  out.traits = m.Traits ?? '';
  out.actions = m.Actions ?? '';
  out.reactions = m.Reactions ?? '';
  out.legendary_actions = m.Legendary_Actions ?? '';
  out.description = m.description ?? '';
  out.lair_actions = m.Lair_Actions ?? '';
  out.regional_effects = m.Regional_Effects ?? '';
  out.img_url = m.img_url ?? '';
  out.provenance = m.provenance ?? 'derived';
  return out;
}

const MONSTER_COL_SQL = MONSTER_COLS.map((c) => (c === 'int' ? '"int"' : c)).join(', ');

const stmtsMonsters = [];
stmtsMonsters.push('-- Seed: monsters (Monster Manual)');
stmtsMonsters.push(`-- Generated at ${new Date().toISOString()}`);
stmtsMonsters.push('');

const mmPath = join(RES, 'monster_manual_monsters.json');
try {
  const rows = read(mmPath);
  stmtsMonsters.push(`-- Monster Manual (${rows.length})`);
  for (const m of rows) {
    const r = monsterToRow(m);
    const colList = [...MONSTER_COLS, 'owner_user_id'].join(', ');
    const colListSql = MONSTER_COL_SQL + ', owner_user_id';
    const vals = MONSTER_COLS.map((c) => sqlLit(r[c]));
    vals.push('NULL'); // owner_user_id
    stmtsMonsters.push(
      `INSERT INTO monsters (${colListSql}) ` +
        `SELECT ${vals.join(', ')} ` +
        `${whereNotExists('monsters', [
          `name = ${sqlLit(r.name)}`,
          `provenance = ${sqlLit(r.provenance)}`,
          ownerIsNull,
        ])};`,
    );
  }
} catch (e) {
  stmtsMonsters.push(`-- (monster_manual_monsters.json not found: ${e.message})`);
}

// ---- write ---------------------------------------------------------------

mkdirSync(OUT_DIR, { recursive: true });

// Per-table files (used by seed:local / seed:remote so each wrangler
// invocation stays short).
const files = [
  [FILES.classes, stmtsClasses],
  [FILES.races, stmtsRaces],
  [FILES.spells, stmtsSpells],
  [FILES.gear, stmtsGear],
  [FILES.monsters, stmtsMonsters],
];
for (const [path, lines] of files) {
  writeFileSync(path, lines.join('\n') + '\n', 'utf8');
}

// Combined file (kept for inspection; not used by the seed scripts).
const combined = [
  ...stmtsClasses,
  ...stmtsRaces,
  ...stmtsSpells,
  ...stmtsGear,
  ...stmtsMonsters,
];
writeFileSync(FILES.all, combined.join('\n') + '\n', 'utf8');

const counts = {
  classes: stmtsClasses.filter((s) => s.startsWith('INSERT')).length,
  races: stmtsRaces.filter((s) => s.startsWith('INSERT')).length,
  spells: stmtsSpells.filter((s) => s.startsWith('INSERT')).length,
  gear: stmtsGear.filter((s) => s.startsWith('INSERT')).length,
  monsters: stmtsMonsters.filter((s) => s.startsWith('INSERT')).length,
};
const total = Object.values(counts).reduce((a, b) => a + b, 0);
console.log(`Wrote 5 per-table seed files + combined ${FILES.all}`);
for (const [k, n] of Object.entries(counts)) {
  console.log(`  ${k.padEnd(9)} ${n}`);
}
console.log(`  ${'total'.padEnd(9)} ${total}`);

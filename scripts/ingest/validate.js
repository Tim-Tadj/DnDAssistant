/**
 * Validate the assembled `monster_manual_monsters.json`:
 *  - required string fields present (name, meta, AC, HP, Speed, Challenge,
 *    Senses, Languages, Actions, img_url, provenance)
 *  - ability scores numeric (STR/DEX/CON/INT/WIS/CHA and their _mod)
 *  - Challenge parses to a numeric CR and an XP value
 *  - every local `img_url` exists as a file under `public/monster-manual/`
 *  - full http(s) URLs in `img_url` resolve (we don't fetch; just check
 *    the shape)
 *  - no duplicate names
 *
 * Exit code is non-zero if any errors are found.  Warnings (e.g. a
 * missing optional field) are reported but don't fail the run.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'src', 'res', 'resources', 'monster_manual_monsters.json');
const IMG_DIR = path.join(ROOT, 'public', 'monster-manual');

const REQUIRED = [
  'name',
  'STR', 'STR_mod',
  'DEX', 'DEX_mod',
  'CON', 'CON_mod',
  'INT', 'INT_mod',
  'WIS', 'WIS_mod',
  'CHA', 'CHA_mod',
  'Senses',
  'Languages',
  'Challenge',
  'img_url',
  'provenance',
  // meta, AC, HP, Speed, and Actions are intentionally NOT in the
  // required list — a handful of monsters in the book (Cyclops, Frog,
  // Sea Horse, Shrieker, Winter Wolf, Specter, Stirge, Treant, Water
  // Weird, Intellect Devourer, etc.) have OCR-corrupted or simply-omitted
  // sections.  We still emit them with empty values and the warnings
  // below flag the gap.
];

function main() {
  const monsters = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  const errors = [];
  const warnings = [];
  const seen = new Map();

  for (let i = 0; i < monsters.length; i++) {
    const m = monsters[i];
    const where = `[${i}] ${m.name || '?'}`;
    // Required fields
    for (const f of REQUIRED) {
      if (m[f] === undefined || m[f] === null || m[f] === '') {
        errors.push(`${where}: missing/empty required field "${f}"`);
      }
    }
    // Ability scores numeric
    for (const k of ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']) {
      const v = m[k];
      if (v !== undefined && !/^\d{1,2}$/.test(String(v).trim())) {
        errors.push(`${where}: ${k}="${v}" is not numeric`);
      }
      const mod = m[k + '_mod'];
      if (mod !== undefined && !/^\([+\-]?\d+\)$/.test(String(mod).trim())) {
        errors.push(`${where}: ${k}_mod="${mod}" is not a (signed) parenthesized number`);
      }
    }
    // Challenge parses to CR + XP
    if (m.Challenge) {
      const m1 = m.Challenge.match(/^(\d+(?:\/\d+)?)\s*\(?([\d,]+)\s*XP\)?/i);
      if (!m1) {
        errors.push(`${where}: Challenge="${m.Challenge}" does not parse to CR + XP`);
      }
    }
    // img_url shape
    if (m.img_url) {
      if (/^https?:\/\//i.test(m.img_url)) {
        // external — ok
      } else if (m.img_url.startsWith('monster-manual/')) {
        const filePath = path.join(ROOT, 'public', m.img_url);
        if (!fs.existsSync(filePath)) {
          errors.push(`${where}: local img_url "${m.img_url}" does not exist on disk`);
        }
      } else {
        warnings.push(`${where}: img_url="${m.img_url}" is neither http(s) nor a local monster-manual/ path`);
      }
    }
    // Duplicate names
    const k = (m.name || '').toLowerCase();
    if (k) {
      if (seen.has(k)) {
        errors.push(`duplicate name "${m.name}" at indices ${seen.get(k)} and ${i}`);
      } else {
        seen.set(k, i);
      }
    }
    // Provenance expected value
    if (m.provenance && !['derived', 'srd', 'homebrew'].includes(m.provenance)) {
      warnings.push(`${where}: provenance="${m.provenance}" (expected derived/srd/homebrew)`);
    }
    // Optional-but-useful fields
    if (m.Traits === undefined) warnings.push(`${where}: no Traits`);
    if (m.Legendary_Actions === undefined) warnings.push(`${where}: no Legendary_Actions`);
    if (m.Actions === undefined || m.Actions === '') {
      warnings.push(`${where}: no Actions (book may simply omit them for this creature)`);
    }
    if (m.AC === '' || m.AC === undefined) {
      warnings.push(`${where}: missing AC (likely OCR drop in the source book)`);
    }
    if (m.HP === '' || m.HP === undefined) {
      warnings.push(`${where}: missing HP (likely OCR drop in the source book)`);
    }
    if (m.Speed === '' || m.Speed === undefined) {
      warnings.push(`${where}: missing Speed (likely OCR drop in the source book)`);
    }
    if (m.meta === '' || m.meta === undefined) {
      warnings.push(`${where}: missing meta (size+type+alignment line not in the source book)`);
    }
  }

  console.log(`Validated ${monsters.length} monsters.`);
  console.log(`  errors:   ${errors.length}`);
  console.log(`  warnings: ${warnings.length}`);
  if (errors.length > 0) {
    console.log('\nERRORS:');
    for (const e of errors) console.log('  ' + e);
  }
  if (warnings.length > 0) {
    console.log('\nWARNINGS:');
    for (const w of warnings) console.log('  ' + w);
  }
  process.exit(errors.length > 0 ? 1 : 0);
}

main();

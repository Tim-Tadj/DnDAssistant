/**
 * Build `src/res/resources/monster_manual_monsters.json` by walking the
 * page index in page order, parsing every stat block, attaching lore
 * pages, and writing the assembled Monster records.
 *
 * Resumable: tracks emitted names in `Monster Manual/.ingest-progress.json`
 * (git-ignored) and skips already-done monsters.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const PAGE_INDEX = path.join(ROOT, 'Monster Manual', '.page-index.json');
const PROGRESS = path.join(ROOT, 'Monster Manual', '.ingest-progress.json');
const OUT_FILE = path.join(ROOT, 'src', 'res', 'resources', 'monster_manual_monsters.json');

const { readPage, parsePage, ABILITY_KEYS } = require('./parse-helpers');
const { assembleMonster, titleCase } = require('./assemble');

function loadProgress() {
  if (!fs.existsSync(PROGRESS)) {
    return { version: 1, monsters: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(PROGRESS, 'utf8'));
  } catch (e) {
    return { version: 1, monsters: [] };
  }
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS, JSON.stringify(progress, null, 2), 'utf8');
}

function loadOutput() {
  if (!fs.existsSync(OUT_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}

function saveOutput(monsters) {
  fs.writeFileSync(OUT_FILE, JSON.stringify(monsters, null, 2) + '\n', 'utf8');
}

function normalizeName(s) {
  return (s || '').trim();
}

function build() {
  const pageIndex = JSON.parse(fs.readFileSync(PAGE_INDEX, 'utf8'));
  const progress = loadProgress();
  const done = new Set(progress.monsters.map((m) => m.toLowerCase()));
  const out = loadOutput();
  // Map name -> record for dedup
  const outByName = new Map();
  for (const m of out) outByName.set(m.name.toLowerCase(), m);

  // Pre-read all stat-block pages (in page order) and gather stat-block
  // chunks with their page metadata.
  const tasks = [];
  for (const p of pageIndex.pages) {
    if (!p.statBlock) continue;
    const page = readPage(p.page);
    if (!page) continue;
    const chunks = parsePage(page);
    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i];
      if (!c.isStatBlock) continue;
      tasks.push({
        pageNum: p.page,
        chunkIndex: i,
        page,
        chunk: c,
        images: page.images,
      });
    }
  }

  // Build a map: stat-block page number -> list of lore pages
  const loreByStat = new Map();
  for (const p of pageIndex.pages) {
    if (p.loreFor === null || p.loreFor === undefined) continue;
    const arr = loreByStat.get(p.loreFor) || [];
    const lorePage = readPage(p.page);
    if (lorePage) arr.push(lorePage);
    loreByStat.set(p.loreFor, arr);
  }

  let added = 0;
  let skipped = 0;
  let errors = 0;
  const errs = [];

  if (process.env.DEBUG_BUILD) {
    const deepGnomeTasks = tasks.filter(t => /DEEP GNOME/i.test(t.chunk.name));
    console.error(`[build] tasks for DEEP GNOME: ${deepGnomeTasks.length}`);
  }

  for (const t of tasks) {
    const rawName = normalizeName(t.chunk.name);
    const finalName = titleCase(rawName);
    if (process.env.DEBUG_BUILD && /DEEP GNOME/i.test(finalName)) {
      console.error(`[build] processing ${finalName}, page ${t.pageNum}, in done: ${done.has(finalName.toLowerCase())}`);
    }
    if (done.has(finalName.toLowerCase())) {
      skipped++;
      continue;
    }
    try {
      const lorePages = loreByStat.get(t.pageNum) || [];
      const monster = assembleMonster({
        statBlock: t.chunk,
        pageImages: t.images,
        statBlockIndex: t.chunkIndex,
        lorePages,
      });
      if (process.env.DEBUG_BUILD && /Deep Gnome|Death Dog/i.test(monster.name)) {
        console.error(`[build] ${monster.name}: actions_len=${(monster.Actions||'').length}`);
      }
      // Validate: must have name and a Challenge rating at minimum.  AC/HP/
      // Speed are missing for a handful of monsters where the book's OCR
      // dropped the line (notably Cyclops, Water Weird, etc.) — we still
      // emit them so the table is complete; the validation script flags
      // the gaps.
      if (!monster.name || !monster.Challenge || !monster.STR) {
        throw new Error(
          `incomplete record: name=${monster.name} Challenge=${monster.Challenge} STR=${monster.STR}`
        );
      }
      // If a monster with the same name already exists (e.g. from an earlier
      // batch on the same page), replace it.  Otherwise append.
      const key = monster.name.toLowerCase();
      if (outByName.has(key)) {
        outByName.set(key, monster);
      } else {
        outByName.set(key, monster);
        added++;
      }
      done.add(key);
      progress.monsters.push(monster.name);
    } catch (e) {
      errors++;
      errs.push({ name: rawName, page: t.pageNum, error: e.message });
    }
  }

  // Write output in deterministic name order (helps with review and diffs).
  const finalList = Array.from(outByName.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  saveOutput(finalList);
  saveProgress(progress);

  console.log(`added ${added} new monsters, skipped ${skipped} (already done)`);
  console.log(`total in output: ${finalList.length}`);
  console.log(`errors: ${errors}`);
  if (errors > 0) {
    console.log('\nERRORS:');
    for (const e of errs) {
      console.log(`  page ${e.page} "${e.name}": ${e.error}`);
    }
  }
}

build();

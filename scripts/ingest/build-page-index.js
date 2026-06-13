#!/usr/bin/env node
/**
 * Build a page index for the Monster Manual ingestion.
 *
 * For each page under `Monster Manual/pages/page-N/`:
 *  - whether the page contains a stat block
 *  - which monster names appear under `# NAME` headings on the page
 *  - which image (img-*.jpeg) lives on the page, if any
 *  - whether the page is "lore-only" (no stat block, just description / lair /
 *    regional effects prose for a named monster)
 *
 * The output is written to `Monster Manual/.page-index.json` (git-ignored).
 */
const fs = require('fs');
const path = require('path');

const PAGES_DIR = path.resolve(__dirname, '..', '..', 'Monster Manual', 'pages');
const OUT_FILE = path.resolve(__dirname, '..', '..', 'Monster Manual', '.page-index.json');

function readPage(num) {
  const dir = path.join(PAGES_DIR, `page-${num}`);
  const mdPath = path.join(dir, 'markdown.md');
  if (!fs.existsSync(mdPath)) return null;
  const md = fs.readFileSync(mdPath, 'utf8');
  const images = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.jpeg'))
    .sort();
  return { num, md, images };
}

const SECTION_WORDS = new Set([
  'ACTIONS',
  'LEGENDARY ACTIONS',
  'LAIR ACTIONS',
  'REGIONAL EFFECTS',
  'REACTIONS',
  'VARIANT',
  'APPENDIX A: MISCELLANEOUS CREATURES',
  'APPENDIX B: NONPLAYER CHARACTERS',
  'INDEX OF STAT BLOCKS',
]);

function isSectionName(name) {
  const upper = name.trim().toUpperCase();
  if (SECTION_WORDS.has(upper)) return true;
  if (upper.startsWith('VARIANT:')) return true;
  return false;
}

function extractHeadings(md) {
  const headings = [];
  const lines = md.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^#{1,2}\s+(.+?)\s*$/);
    if (m) headings.push(m[1].trim());
  }
  return headings;
}

const ABILITY_HEADER =
  /\|\s*STR\s*\|\s*DEX\s*\|\s*CON\s*\|\s*INT\s*\|\s*WIS\s*\|\s*CHA\s*\|/i;
const ABILITY_VALUES = /\|\s*[-+\d()\s]+\|/g;

function isStatBlockTableRow(idx, lines) {
  // An ability-score stat block looks like:
  //   |  STR | DEX | CON | INT | WIS | CHA  |
  //   | --- | --- | --- | --- | --- | --- |
  //   |  10 (+0) | 14 (+2) | ... |
  if (!ABILITY_HEADER.test(lines[idx] || '')) return false;
  // The next line is the separator (| --- | ...), then a row of values.
  if (!/^\s*\|/.test(lines[idx + 1] || '')) return false;
  if (!/[-+\d()\s|]/.test(lines[idx + 2] || '')) return false;
  return true;
}

function statBlockNames(md) {
  // For each detected ability-score table, find the most recent H1/H2
  // non-section heading above it.  That's the monster's name.
  const lines = md.split(/\r?\n/);
  const names = [];
  for (let i = 0; i < lines.length; i++) {
    if (!isStatBlockTableRow(i, lines)) continue;
    // walk back to the most recent H1/H2 heading
    for (let j = i - 1; j >= 0; j--) {
      const m = lines[j].match(/^#{1,2}\s+(.+?)\s*$/);
      if (!m) continue;
      const name = m[1].trim();
      if (!isSectionName(name)) {
        names.push(name);
        break;
      }
    }
  }
  // Dedupe while preserving order; some pages have the same name twice
  // (flavor H2 + stat-block H1/H2).
  const seen = new Set();
  return names.filter((n) => {
    const k = n.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function hasStatBlock(md) {
  return statBlockNames(md).length > 0;
}

function main() {
  if (!fs.existsSync(PAGES_DIR)) {
    console.error(`pages dir not found: ${PAGES_DIR}`);
    process.exit(1);
  }

  const pageDirs = fs
    .readdirSync(PAGES_DIR)
    .filter((d) => /^page-\d+$/.test(d))
    .map((d) => parseInt(d.replace('page-', ''), 10))
    .sort((a, b) => a - b);

  const pages = [];
  for (const num of pageDirs) {
    const page = readPage(num);
    if (!page) continue;
    const headings = extractHeadings(page.md);
    const statBlock = hasStatBlock(page.md);
    const statNames = statBlock ? statBlockNames(page.md) : [];
    pages.push({
      page: num,
      statBlock,
      statNames,
      headings,
      images: page.images,
    });
  }

  // Attach lore pages: a lore-only page (no stat block) with a single
  // monster `# NAME` heading (i.e. its first non-section heading) attaches to
  // the next stat-block page whose statNames includes the same name
  // (case-insensitive, after stripping common suffixes like " (variant)").
  const norm = (s) => s.toLowerCase().replace(/\s*\(.*?\)\s*$/, '').trim();
  const lookup = new Map(); // norm name -> first stat-block page num with that name
  for (const p of pages) {
    if (!p.statBlock) continue;
    for (const n of p.statNames) {
      const k = norm(n);
      if (!lookup.has(k)) lookup.set(k, p.page);
    }
  }
  for (const p of pages) {
    p.loreFor = null;
    if (p.statBlock) continue;
    const monsterHeading = p.headings.find((h) => !isSectionName(h));
    if (!monsterHeading) continue;
    const candidate = norm(monsterHeading);
    const target = lookup.get(candidate);
    if (target) p.loreFor = target;
  }

  const summary = {
    totalPages: pages.length,
    statBlockPages: pages.filter((p) => p.statBlock).length,
    lorePages: pages.filter((p) => p.loreFor !== null).length,
    statBlockCountEstimate: pages.reduce(
      (acc, p) => acc + (p.statBlock ? p.statNames.length : 0),
      0
    ),
  };

  fs.writeFileSync(
    OUT_FILE,
    JSON.stringify({ summary, pages }, null, 2),
    'utf8'
  );
  console.log(JSON.stringify(summary, null, 2));
  console.log(`wrote ${OUT_FILE}`);
}

main();

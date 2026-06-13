/**
 * Assemble a parsed stat-block chunk + optional lore page + image filename
 * into a `Monster` JSON record matching the SRD shape, plus the new
 * description / Lair_Actions / Regional_Effects / provenance fields.
 *
 * The assembler also normalizes some quirks:
 *  - the `meta` line may have a leading "*" in some chunks; strip it.
 *  - the AC value may have a trailing "*" from bold runs; strip it.
 *  - the action/legendary/traits HTML is built from the chunk's prose using
 *    `traitsToHtml` so the card can render it via dangerouslySetInnerHTML.
 */
const {
  ABILITY_KEYS,
  isSectionName,
  parsePage,
  traitsToHtml,
  cleanOcr,
  inlineMdToHtml,
} = require('./parse-helpers');

// Placeholder image URLs, mirrored from src/ts/types/Monster.ts (kept in
// sync — both are a const map keyed by creature type).  Used for monsters
// without a page image.
const PLACEHOLDER_IMAGES = {
  humanoid:
    'https://media-waterdeep.cursecdn.com/attachments/2/656/humanoid.jpg',
  undead: 'https://media-waterdeep.cursecdn.com/attachments/2/660/undead.jpg',
  beast: 'https://media-waterdeep.cursecdn.com/attachments/2/648/beast.jpg',
  plant: 'https://media-waterdeep.cursecdn.com/attachments/2/659/plant.jpg',
  ooze: 'https://media-waterdeep.cursecdn.com/attachments/2/658/ooze.jpg',
};

function titleCase(s) {
  if (!s) return s;
  // Standard D&D style: title-case the name, preserving small words and
  // parenthesized suffixes.
  // First, split on whitespace.
  const SMALL = new Set([
    'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'of', 'on',
    'or', 'the', 'to', 'with', 'vs', 'via',
  ]);
  const tokens = s.split(/\s+/);
  const out = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const lower = t.toLowerCase();
    if (i !== 0 && i !== tokens.length - 1 && SMALL.has(lower)) {
      out.push(lower);
    } else {
      // Handle hyphens
      const parts = t.split('-').map((p) => {
        if (!p) return p;
        // Preserve Roman numerals and acronyms
        if (/^[IVX]+$/.test(p)) return p;
        return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
      });
      out.push(parts.join('-'));
    }
  }
  let result = out.join(' ');
  // Normalize apostrophes in possessives (e.g. "Death'S" -> "Death's")
  result = result.replace(/'S\b/g, "'s");
  return result;
}

function stripWrapping(s) {
  return (s || '').replace(/^[\s*]+/, '').replace(/[\s*]+$/, '').trim();
}

/**
 * Build the HTML for a list-of-paragraphs field.  Each paragraph is a chunk
 * separated by blank lines; we convert `**Name.** text` → `<p><em><strong>
 * Name.</strong></em> text</p>`.  Plain paragraphs stay plain.
 */
function mdToHtml(md) {
  if (!md || !md.trim()) return undefined;
  return traitsToHtml(cleanOcr(md));
}

function extractLairAndRegional(md) {
  // The lore page (or sometimes the stat-block page itself) may include
  // `## LAIR ACTIONS` and `## REGIONAL EFFECTS` sections.  We pull them out
  // and return them as HTML for those fields.  The remaining prose (without
  // those sections) is the `description`.
  if (!md) return { description: undefined, lair: undefined, regional: undefined };
  const lines = md.split(/\r?\n/);
  const sections = { description: [], lair: [], regional: [] };
  let current = 'description';
  for (const line of lines) {
    const m = line.match(/^#{1,3}\s+(.+?)\s*$/);
    if (m) {
      const u = m[1].trim().toUpperCase();
      if (u === 'LAIR ACTIONS') {
        current = 'lair';
        continue;
      }
      if (u === 'REGIONAL EFFECTS') {
        current = 'regional';
        continue;
      }
      if (u === 'LAIR TRAITS') {
        // Treat as part of the lair block in the lair_actions field
        current = 'lair';
        continue;
      }
      // Any other heading ends the current prose section
      current = null;
      continue;
    }
    if (current) sections[current].push(line);
  }
  const clean = (arr) => {
    const s = arr.join('\n').trim();
    if (!s) return undefined;
    return s;
  };
  return {
    description: clean(sections.description),
    lair: clean(sections.lair),
    regional: clean(sections.regional),
  };
}

/**
 * Given a list of lore pages that should attach to a stat block, extract
 * the description, Lair_Actions, and Regional_Effects HTML.
 */
function extractLore(lorePages) {
  if (!lorePages || lorePages.length === 0) {
    return { description: undefined, lair: undefined, regional: undefined };
  }
  const all = { description: [], lair: [], regional: [] };
  for (const page of lorePages) {
    const md = cleanLorePage(page.lines.join('\n'));
    const { description, lair, regional } = extractLairAndRegional(md);
    if (description) all.description.push(description);
    if (lair) all.lair.push(lair);
    if (regional) all.regional.push(regional);
  }
  return {
    description: all.description.length
      ? mdToHtml(all.description.join('\n\n'))
      : undefined,
    lair: all.lair.length ? mdToHtml(all.lair.join('\n\n')) : undefined,
    regional: all.regional.length
      ? mdToHtml(all.regional.join('\n\n'))
      : undefined,
  };
}

/**
 * Light cleanup of lore page content: drop stray page-number lines, drop the
 * image-link line, drop the all-caps "category" line (e.g. "ANGELS" footer),
 * and drop the first `# NAME` heading itself (which is just the monster
 * name as a section divider on lore pages).
 */
function cleanLorePage(md) {
  const lines = md.split(/\r?\n/);
  const out = [];
  let droppedFirstHeading = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const stripped = line.trim();
    // Image markdown — drop
    if (/^!\[.*\]\(.*\)$/.test(stripped)) continue;
    // Stray page-number line at the top (e.g. "14", "28", "88")
    if (
      /^\d{1,3}$/.test(stripped) &&
      out.length === 0
    ) continue;
    // All-caps category footer like "ANGELS" / "DRAGONS" / "DEVILS" (3+ caps
    // letters, no lowercase, not a known field)
    if (
      /^[A-Z][A-Z\s'-]{2,}$/.test(stripped) &&
      !/^(ACTIONS|LEGENDARY ACTIONS|LAIR ACTIONS|REGIONAL EFFECTS|REACTIONS)$/.test(
        stripped
      ) &&
      (i === lines.length - 1 || !lines[i + 1].trim())
    ) continue;
    // The first `# NAME` heading is just a section divider on a lore page
    if (
      !droppedFirstHeading &&
      /^#{1,2}\s+\S/.test(stripped)
    ) {
      droppedFirstHeading = true;
      continue;
    }
    out.push(line);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Pick the best image for a stat block on this page.  Rules:
 *  - The page's first image (if any) is associated with the FIRST stat
 *    block on the page.  If the page has multiple stat blocks, the n-th
 *    stat block gets the n-th image (we assume images and stat blocks are
 *    interleaved in the same order they appear in the markdown).
 *  - A lore page's image is NOT used as the stat block's image; we use the
 *    stat-block page's image only.
 */
function pickImage(statBlockIndex, pageImages) {
  if (!pageImages || pageImages.length === 0) return null;
  // Use the image at this index if available, else fall back to the first.
  return pageImages[Math.min(statBlockIndex, pageImages.length - 1)];
}

/**
 * Choose a placeholder image based on the meta line's creature type.
 * Falls back to humanoid.
 */
function pickPlaceholder(meta) {
  if (!meta) return PLACEHOLDER_IMAGES.humanoid;
  const m = meta.toLowerCase();
  if (/\bundead\b|\bskeleton\b|\bghoul\b|\bghost\b|\bwraith\b|\bvampire\b|\blich\b|\bmummy\b|\bzombie\b/.test(m))
    return PLACEHOLDER_IMAGES.undead;
  if (/\bbeast\b|\bwolf\b|\bbear\b|\bdog\b|\bcat\b|\brid\b|\brat\b|\bboar\b|\bspider\b|\bsnake\b/.test(m))
    return PLACEHOLDER_IMAGES.beast;
  if (/\bplant\b|\btreant\b|\bmyconid\b|\bshambling\b|\bblight\b/.test(m))
    return PLACEHOLDER_IMAGES.plant;
  if (/\booze\b|\bgelatinous\b|\bblack pudding\b|\bgray ooze\b/.test(m))
    return PLACEHOLDER_IMAGES.ooze;
  return PLACEHOLDER_IMAGES.humanoid;
}

function assembleMonster({
  statBlock,
  pageImages,
  statBlockIndex,
  lorePages,
}) {
  if (!statBlock || !statBlock.isStatBlock) {
    throw new Error(`assembleMonster: not a stat block (${statBlock && statBlock.name})`);
  }

  const name = titleCase(stripWrapping(statBlock.name));
  const meta = stripWrapping(statBlock.meta) || '—';

  // Strip trailing "*" from AC/HP/Speed (rare bold-leftover)
  const clean = (s) => (s || '').replace(/\*+$/g, '').trim();
  const AC = clean(statBlock.AC);
  const HP = clean(statBlock.HP);
  const Speed = clean(statBlock.Speed);

  // Ability scores: convert each to score (string) and mod (string with parens)
  const abilities = {};
  for (const k of ABILITY_KEYS) {
    const a = statBlock.abilities[k];
    if (!a) {
      abilities[`${k}`] = '10';
      abilities[`${k}_mod`] = '(+0)';
    } else {
      abilities[`${k}`] = a.score;
      abilities[`${k}_mod`] = a.mod;
    }
  }

  // Per-line fields
  const perLine = statBlock.perLine || {};
  const stripPrefix = (s) => (s || '').replace(/^[\s*]+/, '').trim();

  // Image
  const imgFile = pickImage(statBlockIndex, pageImages);
  const img_url = imgFile
    ? `monster-manual/${imgFile}`
    : pickPlaceholder(meta);

  // Lore (description / lair / regional)
  const lore = extractLore(lorePages);

  // Build the record
  const rec = {
    name,
    meta,
    AC,
    HP,
    Speed,
    STR: abilities.STR,
    STR_mod: abilities.STR_mod,
    DEX: abilities.DEX,
    DEX_mod: abilities.DEX_mod,
    CON: abilities.CON,
    CON_mod: abilities.CON_mod,
    INT: abilities.INT,
    INT_mod: abilities.INT_mod,
    WIS: abilities.WIS,
    WIS_mod: abilities.WIS_mod,
    CHA: abilities.CHA,
    CHA_mod: abilities.CHA_mod,
    Senses: stripPrefix(perLine.Senses) || '—',
    Languages: stripPrefix(perLine.Languages) || '—',
    Challenge: stripPrefix(perLine.Challenge) || '',
    Actions: mdToHtml(statBlock.actions) || '',
    img_url,
    provenance: 'derived',
  };

  if (perLine.Saving_Throws) rec.Saving_Throws = stripPrefix(perLine.Saving_Throws);
  if (perLine.Skills) rec.Skills = stripPrefix(perLine.Skills);
  if (perLine.Damage_Vulnerabilities)
    rec.Damage_Vulnerabilities = stripPrefix(perLine.Damage_Vulnerabilities);
  if (perLine.Damage_Resistances) rec.Damage_Resistances = stripPrefix(perLine.Damage_Resistances);
  if (perLine.Damage_Immunities) rec.Damage_Immunities = stripPrefix(perLine.Damage_Immunities);
  if (perLine.Condition_Immunities)
    rec.Condition_Immunities = stripPrefix(perLine.Condition_Immunities);
  if (statBlock.beforeActions && statBlock.beforeActions.trim()) {
    rec.Traits = mdToHtml(statBlock.beforeActions);
  }
  if (statBlock.reactions && statBlock.reactions.trim()) {
    rec.Reactions = mdToHtml(statBlock.reactions);
  }
  if (statBlock.legendary && statBlock.legendary.trim()) {
    rec.Legendary_Actions = mdToHtml(statBlock.legendary);
  }
  if (lore.description) rec.description = lore.description;
  if (lore.lair) rec.Lair_Actions = lore.lair;
  if (lore.regional) rec.Regional_Effects = lore.regional;

  return rec;
}

module.exports = {
  assembleMonster,
  extractLore,
  extractLairAndRegional,
  pickImage,
  pickPlaceholder,
  titleCase,
  mdToHtml,
};

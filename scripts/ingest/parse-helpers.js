/**
 * Helpers for parsing Monster Manual stat blocks.
 *
 * The book uses a highly-consistent stat-block structure:
 *   - heading:     `# NAME` or `## NAME` (H1/H2), 1 line
 *   - meta:        *Size type, alignment* (italic), 1 line, OR plain text
 *   - AC:          starts with `Armor Class`, then a number, sometimes with notes
 *                  in parentheses; sometimes wrapped in a 2-col table
 *   - HP:          starts with `Hit Points`, then a number and a parenthetical dice expr
 *   - Speed:       starts with `Speed`, then a list of speed modes
 *   - abilities:   6-column markdown table with `STR | DEX | CON | INT | WIS | CHA`
 *                  on the header row
 *   - per-line:    Saving Throws / Skills / Damage Vulnerabilities / Damage
 *                  Resistances / Damage Immunities / Condition Immunities /
 *                  Senses / Languages / Challenge
 *   - traits:      bold-led paragraphs before `## ACTIONS`
 *   - actions:     paragraphs under `## ACTIONS`
 *   - reactions:   paragraphs under `## REACTIONS` (rare)
 *   - legendary:   paragraphs under `## LEGENDARY ACTIONS`
 *
 * Some pages have these on one line (all separated by " / "); some have each
 * on its own line.  We handle both by scanning for the leading keyword.
 *
 * The LLM-provided HTML shape for any list-of-paragraphs field is:
 *   <p><em><strong>Name.</strong></em> text</p>
 * (one per logical entry).  We convert `**Name.** text` markdown into that.
 */
const path = require('path');
const fs = require('fs');

const SECTION_WORDS = new Set([
  'ACTIONS',
  'LEGENDARY ACTIONS',
  'LAIR ACTIONS',
  'LAIR TRAITS',
  'REGIONAL EFFECTS',
  'REACTIONS',
  'VARIANT',
  'APPENDIX A: MISCELLANEOUS CREATURES',
  'APPENDIX B: NONPLAYER CHARACTERS',
  'INDEX OF STAT BLOCKS',
]);

function isSectionName(name) {
  const upper = (name || '').trim().toUpperCase();
  if (SECTION_WORDS.has(upper)) return true;
  if (upper.startsWith('VARIANT:')) return true;
  return false;
}

const ABILITY_KEYS = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

const ABILITY_HEADER =
  /\|\s*STR\s*\|\s*DEX\s*\|\s*CON\s*\|\s*INT\s*\|\s*WIS\s*\|\s*CHA\s*\|/i;

const NUMBER_WORDS = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

function getPagesDir() {
  return path.resolve(__dirname, '..', '..', 'Monster Manual', 'pages');
}

function readPage(num) {
  const dir = path.join(getPagesDir(), `page-${num}`);
  const mdPath = path.join(dir, 'markdown.md');
  if (!fs.existsSync(mdPath)) return null;
  const md = fs.readFileSync(mdPath, 'utf8');
  const images = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.jpeg'))
    .sort();
  return { num, md, images, lines: md.split(/\r?\n/) };
}

function abilityModToString(score) {
  const n = Number(score);
  if (!Number.isFinite(n)) return '';
  const mod = Math.floor((n - 10) / 2);
  const s = mod >= 0 ? `+${mod}` : `${mod}`;
  return `(${s})`;
}

/**
 * Convert a markdown "**Name.** text" line into the canonical HTML shape
 * the card already renders.  Returns an array of `<p>...</p>` fragments,
 * one per logical entry.  We split on a blank line between entries.
 */
function traitsToHtml(md) {
  const blocks = [];
  // Each trait is either:
  //   a) **Name.** text
  //   b) **Name.** text  (continuation lines, possibly `*Melee...*` italics)
  //   c) plain paragraph (no bold name)
  // We split on blank lines into paragraphs, and within a paragraph, turn
  // the leading `**Name.**` into `<em><strong>Name.</strong></em>`.
  const paragraphs = md.split(/\n\s*\n/);
  for (let p of paragraphs) {
    p = p.trim();
    if (!p) continue;
    if (p.startsWith('|')) continue; // skip stray table rows
    // Try leading bold name
    const m = p.match(/^\*\*([^*]+?)\.?\s*\*\*\s*(.*)$/s);
    if (m) {
      let body = m[2].trim();
      if (!body) {
        blocks.push(
          `<p><em><strong>${escapeHtml(m[1].trim())}.</strong></em></p>`
        );
      } else {
        body = inlineMdToHtml(body);
        blocks.push(
          `<p><em><strong>${escapeHtml(m[1].trim())}.</strong></em> ${body}</p>`
        );
      }
    } else {
      blocks.push(`<p>${inlineMdToHtml(p)}</p>`);
    }
  }
  return blocks.join('');
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Convert minimal markdown to HTML: `*italic*` → `<em>italic</em>`,
 * `**bold**` → `<strong>bold</strong>`.  Light cleanup; we don't try to be
 * a full markdown parser.
 */
function inlineMdToHtml(s) {
  let out = escapeHtml(s);
  // bold then italic, non-greedy
  out = out.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*\n]+?)\*/g, '$1<em>$2</em>');
  return out;
}

/**
 * Clean OCR noise in the source text.  Conservative: only fix a small set of
 * known typos that appear in the OCR'd markdown.  We don't try to be clever.
 */
function cleanOcr(s) {
  if (!s) return s;
  return s
    .replace(/\bMORRORS\b/g, 'MIRRORS')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

const PER_LINE_FIELDS = [
  { key: 'Saving_Throws', prefixes: ['Saving Throws'] },
  { key: 'Skills', prefixes: ['Skills'] },
  {
    key: 'Damage_Vulnerabilities',
    prefixes: ['Damage Vulnerabilities', 'Damage Vulnerability'],
  },
  {
    key: 'Damage_Resistances',
    prefixes: ['Damage Resistances', 'Damage Resistance'],
  },
  {
    key: 'Damage_Immunities',
    prefixes: ['Damage Immunities', 'Damage Immunity'],
  },
  {
    key: 'Condition_Immunities',
    prefixes: ['Condition Immunities', 'Condition Immunity'],
  },
  { key: 'Senses', prefixes: ['Senses'] },
  { key: 'Languages', prefixes: ['Languages'] },
  { key: 'Challenge', prefixes: ['Challenge'] },
];

function stripMarkdownEmphasis(s) {
  return s
    .replace(/^\*+/, '')
    .replace(/\*+$/, '')
    .replace(/^_+/, '')
    .replace(/_+$/, '')
    .trim();
}

/**
 * Strip leading/trailing markdown emphasis from a line.  Some lines in the
 * book are entirely bold: `**Skills Perception +6, Stealth +7**`.  When we
 * look at the "stripped" form, we want to compare the *content*, not the
 * emphasis wrapping.
 */
function unWrapLine(s) {
  return s
    .replace(/^\s*\*\*+/, '')
    .replace(/\*\*+\s*$/, '')
    .replace(/^\s*\*+/, '')
    .replace(/\*+\s*$/, '')
    .trim();
}

/**
 * Decide whether a bold-prefixed line (like `**Skills** Deception +10`) is
 * the start of a new per-line field.  We check:
 *  - the un-wrapped form (full bold stripped) starts with a field prefix, or
 *  - the form with just the leading `**` stripped, when joined with the
 *    next word, forms a field prefix (e.g. `Damage Vulnerabilities` from
 *    `**Damage** Vulnerabilities ...`).
 */
function isLikelyNewPerLineField(line) {
  const noBullet = line.replace(/^-\s+/, '');
  // Form 1: full un-wrap
  const f1 = unWrapLine(noBullet);
  if (PER_LINE_FIELDS.some((f) => f.prefixes.some((p) => f1.startsWith(p)))) {
    return true;
  }
  // Form 2: bold first word + plain trailing — join with a space
  if (noBullet.startsWith('**')) {
    const m = noBullet.match(/^\*\*([^*]+?)\*\*\s+(.+)$/);
    if (m) {
      const combined = m[1] + ' ' + m[2];
      if (PER_LINE_FIELDS.some((f) => f.prefixes.some((p) => combined.startsWith(p)))) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Some pages have two per-line fields on the same line, e.g.
 *   "Languages Common Challenge 1/2 (100 XP)"
 *   "| Languages Common  Challenge 1/2 (100 XP) |"
 * The current field (whose key we already matched) takes the first chunk;
 * the trailing field is detected, split off, and stashed directly in
 * out.perLine via the second arg.
 */
function splitOffTrailingField(value, currentKey, out) {
  // Search for the longest matching PER_LINE_FIELDS prefix that appears
  // somewhere AFTER the start of the value.  We try fields in a specific
  // order: the more specific ones first (longer prefixes) so that
  // "Damage Immunities" beats "Damage".
  const candidates = PER_LINE_FIELDS
    .filter((f) => f.key !== currentKey)
    .sort((a, b) => {
      const aMax = Math.max(...a.prefixes.map((p) => p.length));
      const bMax = Math.max(...b.prefixes.map((p) => p.length));
      return bMax - aMax;
    });
  for (const f of candidates) {
    for (const p of f.prefixes) {
      const idx = value.indexOf(' ' + p);
      if (idx === -1) continue;
      // Found — split.  Confirm the prefix is followed by something that
      // looks like a value (alphanumeric, not a field of its own).
      const before = value.slice(0, idx).trim();
      const after = value.slice(idx + 1 + p.length).trim();
      if (after && !PER_LINE_FIELDS.some((g) =>
        g.prefixes.some((q) => after.startsWith(q))
      )) {
        if (out && !out.perLine[f.key]) {
          out.perLine[f.key] = after;
        } else if (!out) {
          // No sink — return the main value only
        }
        return before;
      }
    }
  }
  return value;
}

/**
 * Parse a single stat-block chunk (markdown between the monster's H1/H2 and
 * the next H1/H2 or end of page).  Returns the parsed fields.
 */
function parseStatBlock(rawMd, chunkName) {
  const md = cleanOcr(rawMd);
  const lines = md.split(/\r?\n/);
  const out = {
    meta: '',
    AC: '',
    HP: '',
    Speed: '',
    abilities: {},
    perLine: {},
    beforeActions: '', // prelude (traits, leads)
    actions: '',
    reactions: '',
    legendary: '',
  };

  let i = 0;

  // Skip the heading itself (first non-blank line that matches)
  if (lines.length && /^#{1,2}\s+/.test(lines[0])) {
    i = 1;
  }

  // Meta line: usually the first non-blank line that is a *italic* phrase
  // or a plain "Size type, alignment" line.  We allow up to a few non-blank
  // lines before giving up, and we treat all-caps "footer" lines and
  // page numbers as non-meta.
  const SKIP_AS_META = (s) =>
    !s ||
    /^\d{1,3}$/.test(s) ||
    // All-caps footer like "INTERLEGATE DEVOURERS" or "RUST MONSTER" — at
    // least 3 chars of A-Z, may include spaces, hyphens, or apostrophes.
    /^[A-Z][A-Z\s'-]{2,}$/.test(s.replace(/^\*+|\*+$/g, '')) ||
    /^---+$/.test(s);
  while (i < lines.length && SKIP_AS_META(lines[i].trim())) i++;
  if (i < lines.length) {
    // Italic meta line: must be EXACTLY one leading and one trailing `*`,
    // not `**` (bold).  This prevents bold field-name lines like
    // `**Armor Class 12**` from being captured as meta.
    const m = lines[i].match(/^(\*[^*].*?[^*]\*|\*[^*]+\*)\s*$/);
    if (m) {
      out.meta = m[1].replace(/^\*+|\*+$/g, '').trim();
      i++;
    } else {
      // Plain "Size type, alignment" or "Variant: ..." — treat as meta if
      // it's not a known field line AND not a stat-block field at all.
      const first = lines[i].trim();
      // A leading bullet `- ` or bold-name stat-block field is a stat-block
      // field, not meta.
      const isFieldLike =
        /^(Armor (?:Class|Glass)|Hit Points|Speed|Saving Throws|Skills|Damage|Condition|Senses|Languages|Challenge|STR|DEX|CON|INT|WIS|CHA|\|)/i.test(
          first
        ) || /^- /i.test(first) || /^\*\*(Armor|Hit|Speed|Saving|Skills|Damage|Condition|Senses|Languages|Challenge)/i.test(first);
      if (first && !isFieldLike) {
        out.meta = first;
        i++;
      }
    }
  }

  // Helper: pull a field that might be on its own line OR inside a 2-col table
  // whose value cell we want, and consume any number of "continuation" lines
  // that aren't new fields.  Continuation lines start with whitespace and
  // aren't themselves a known field/heading/table.
  const KNOWN = new RegExp(
    '^\\s*(Armor Class|Hit Points|Speed|Saving Throws|Skills|Damage|Condition|Senses|Languages|Challenge|STR|DEX|CON|INT|WIS|CHA|\\||---|#{1,3}|\\*\\*Actions\\*\\*)',
    'i'
  );

  const grabField = (key) => {
    while (i < lines.length) {
      const line = lines[i];
      const stripped = line.trim();
      if (!stripped) {
        // blank: might end this field — return whatever we have and let the
        // caller decide.  Caller will be the one to break out.
        return;
      }
      // Stop if we hit a new field, a heading, or a table row
      if (KNOWN.test(line)) return;
      // Otherwise it's a continuation: append, but trim duplicates of the
      // same value (some pages repeat the value, e.g. duplicate "Hit Points").
      if (out.perLine[key]) {
        // Don't double-add; only add if not already present
        if (!out.perLine[key].includes(stripped)) {
          out.perLine[key] += ' ' + stripped;
        }
      } else {
        out.perLine[key] = stripped;
      }
      i++;
    }
  };

  const grabAcHpSpeed = () => {
    // Each of AC, HP, Speed may be on its own line, possibly bold, possibly
    // inside a 2-col table row, and may be split across multiple lines (e.g.
    // Hit Points 135 (18d10 + 36) sometimes gets OCR'd with a linebreak).
    while (i < lines.length) {
      const line = lines[i];
      const stripped = line.trim();
      if (!stripped) {
        i++;
        continue;
      }
      // Horizontal rule (---) — skip, these are sometimes used as
      // separators inside a stat block.
      if (/^---+$/.test(stripped)) {
        i++;
        continue;
      }
      if (
        ABILITY_HEADER.test(stripped) ||
        PER_LINE_FIELDS.some((f) => f.prefixes.some((p) => unWrapLine(stripped).startsWith(p)))
      ) {
        return;
      }
      // table rows we don't care about (separator, etc.)
      if (/^\|\s*---/.test(stripped)) {
        i++;
        continue;
      }
      // Table row containing AC/HP/Speed.  Two shapes appear in the book:
      //   1.  `|  Armor Class 19 (natural armor)  |`     (field+value in one cell)
      //   2.  `|  Armor Class | 21 (natural armor)  |`   (field and value in separate cells)
      if (stripped.startsWith('|')) {
        const cells = stripped.split('|').map((c) => c.trim()).filter((c) => c.length > 0);
        if (cells.length === 1) {
          // Shape 1: try to peel a FieldName prefix off the single cell.
          const c = cells[0];
          const fm = c.match(/^(Armor Class|Hit Points|Speed)\s+(.+)$/i);
          if (fm) {
            assignAcHpSpeedByField(fm[1], fm[2]);
          }
        } else if (cells.length >= 2) {
          // Shape 2: cells[0] = field name, cells[last] = value.
          assignAcHpSpeedByField(cells[0], cells[cells.length - 1]);
        }
        i++;
        continue;
      }
      // Standard "FieldName value" line, possibly bold.  OCR sometimes
      // mangles "Armor Class" as "Armor Glass" (C→G); we accept that
      // for robustness.
      const fm = stripped.match(/^(\*\*)?(Armor (?:Class|Glass)|Hit Points|Speed)\*?\*?\s+(.+)$/i);
      if (fm) {
        const fieldRaw = fm[2].toLowerCase();
        const field =
          fieldRaw.includes('class') || fieldRaw.includes('glass')
            ? 'armor_class'
            : fieldRaw.replace(/\s+/g, '_');
        const value = fm[3].replace(/\*+$/g, '').trim();
        if (field === 'armor_class' && !out.AC) out.AC = value;
        else if (field === 'hit_points' && !out.HP) out.HP = value;
        else if (field === 'speed' && !out.Speed) out.Speed = value;
        i++;
        continue;
      }
      // continuation of AC/HP/Speed that started on a previous line?  Be
      // conservative: stop on unknown content.
      return;
    }
  };

  const assignAcHpSpeedByField = (fieldName, value) => {
    const u = fieldName.replace(/\*+/g, '').trim();
    if (/^armor class$/i.test(u) && !out.AC) out.AC = value;
    else if (/^hit points$/i.test(u) && !out.HP) out.HP = value;
    else if (/^speed$/i.test(u) && !out.Speed) out.Speed = value;
  };

  // AC/HP/Speed pass
  grabAcHpSpeed();

  // Skip blank lines
  while (i < lines.length && !lines[i].trim()) i++;

  // Ability table
  if (i < lines.length && ABILITY_HEADER.test(lines[i])) {
    i++; // header
    if (i < lines.length && /^\s*\|/.test(lines[i])) i++; // separator
    if (i < lines.length && /^\s*\|/.test(lines[i])) {
      const row = lines[i];
      // Extract each cell value, e.g. "  10 (+0) "
      const cells = row
        .split('|')
        .map((c) => c.trim())
        .filter((c) => c.length > 0);
      for (let k = 0; k < ABILITY_KEYS.length && k < cells.length; k++) {
        const cell = cells[k].trim();
        // Cell format: "  10 (+0) " — split on whitespace
        const m = cell.match(/^(\d+)\s*\(([+\-\d]+)\)\s*$/);
        if (m) {
          out.abilities[ABILITY_KEYS[k]] = {
            score: m[1],
            mod: `(${m[2]})`,
          };
        } else {
          // Could be a signless score like "10" — derive mod
          const scoreMatch = cell.match(/^(\d+)\s*(?:\(([+\-\d]+)\))?/);
          if (scoreMatch) {
            const score = scoreMatch[1];
            const mod = scoreMatch[2] || abilityModToString(score).replace(/[()]/g, '');
            out.abilities[ABILITY_KEYS[k]] = {
              score,
              mod: mod.startsWith('(') ? mod : `(${mod})`,
            };
          }
        }
      }
      i++;
    }
  }

  // Skip blank lines
  while (i < lines.length && !lines[i].trim()) i++;

  // Per-line fields pass: each is a line like "Skills Perception +5, Stealth +7"
  // and may continue onto subsequent lines that are not themselves a known
  // field start.  We scan until we hit a heading.
  while (i < lines.length) {
    const line = lines[i];
    const stripped = line.trim();
    if (!stripped) {
      i++;
      continue;
    }
    // Horizontal rule — skip
    if (/^---+$/.test(stripped)) {
      i++;
      continue;
    }
    if (/^#{1,3}\s+/.test(stripped)) break;
    if (ABILITY_HEADER.test(stripped)) break;
    // `| --- |` is a table separator — skip, don't break.
    if (/^\|\s*---/.test(stripped)) {
      i++;
      continue;
    }
    if (stripped.startsWith('|')) {
      // 2-col table row:  `|  FieldName  value  |`
      // The field name and value are in the same cell.  Match the field by
      // prefix and consume the value.
      const cells = stripped.split('|').map((c) => c.trim()).filter((c) => c.length > 0);
      if (cells.length === 1) {
        const c = cells[0];
        // First try AC/HP/Speed (also accept OCR "Armor Glass" for Class)
        const ac = c.match(/^(Armor (?:Class|Glass)|Hit Points|Speed)\s+(.+)$/i);
        if (ac) {
          let fname = ac[1];
          if (/armor/i.test(fname)) fname = 'armor_class';
          assignAcHpSpeedByField(fname, ac[2]);
          i++;
          continue;
        }
        // Then per-line fields
        const matched = PER_LINE_FIELDS.find((f) =>
          f.prefixes.some((p) => c.startsWith(p))
        );
        if (matched) {
          let value = c;
          for (const p of matched.prefixes) {
            if (value.startsWith(p)) {
              value = value.slice(p.length).trim();
              break;
            }
          }
          // The value cell may contain another field on the same line,
          // e.g. `| Languages Common, Elvish  Challenge 4 (1,100 XP) |`.
          // We split off the trailing field if present.
          value = splitOffTrailingField(value, matched.key, out);
          out.perLine[matched.key] = value;
          i++;
          continue;
        }
      } else if (cells.length >= 2) {
        // 2-col table with separate cells:  `| FieldName | value |`
        const head = cells[0];
        const value = cells[cells.length - 1];
        const ac = head.match(/^(Armor Class|Hit Points|Speed)$/i);
        if (ac) {
          assignAcHpSpeedByField(ac[1], value);
          i++;
          continue;
        }
        const matched = PER_LINE_FIELDS.find((f) =>
          f.prefixes.some((p) => head === p)
        );
        if (matched) {
          out.perLine[matched.key] = splitOffTrailingField(value, matched.key, out);
          i++;
          continue;
        }
      } else if (/^\|\s*---/.test(stripped)) {
        i++;
        continue;
      }
      // Unrecognized table row — skip it
      i++;
      continue;
    }
    // Use the un-wrapped form for prefix detection so that bold lines
    // like "**Skills Perception +6**" are detected as the Skills field.
    // Also handle `**Skills** Deception +10` (bold first word + plain
    // trailing) by joining the two parts and matching.
    // Strip a leading "- " bullet for the check (some pages use bullet
    // lists for per-line fields, e.g. "- Skills Perception +4, Stealth +5").
    const u1 = unWrapLine(stripped).replace(/^-\s+/, '');
    let unwrappedForCheck = u1;
    let matchedField = PER_LINE_FIELDS.find((f) =>
      f.prefixes.some((p) => u1.startsWith(p))
    );
    if (!matchedField && stripped.startsWith('**')) {
      const m = stripped.replace(/^-\s+/, '').match(/^\*\*([^*]+?)\*\*\s+(.+)$/);
      if (m) {
        const combined = m[1] + ' ' + m[2];
        matchedField = PER_LINE_FIELDS.find((f) =>
          f.prefixes.some((p) => combined.startsWith(p))
        );
        if (matchedField) unwrappedForCheck = combined;
      }
    }
    if (matchedField) {
      // Strip the prefix from the un-wrapped first line
      let value = unwrappedForCheck;
      for (const p of matchedField.prefixes) {
        if (value.startsWith(p)) {
          value = value.slice(p.length).trim();
          break;
        }
      }
      // If the unwrapped form didn't have a prefix match (matched via u2),
      // use u2 as the base.  In practice matchedField is the field whose
      // prefix was found in u1 OR u2, so iterate over both to find the
      // match.
      if (!matchedField.prefixes.some((p) => unwrappedForCheck.startsWith(p))) {
        // matched via u2 — re-do the strip from u2
        value = u2;
        for (const p of matchedField.prefixes) {
          if (value.startsWith(p)) {
            value = value.slice(p.length).trim();
            break;
          }
        }
      }
      value = value.replace(/^[\s*]+/, '').replace(/[\s*]+$/, '').trim();
      // The value may include a trailing field on the same line
      // (e.g. "Languages foo Challenge 1/4 (50 XP)").  Split that off and
      // stash it in out.perLine[thatKey] if not already set.
      value = splitOffTrailingField(value, matchedField.key, out);
      out.perLine[matchedField.key] = value;
      i++;
      // Continuation lines until next known field/heading.  A blank line
      // ENDS the field (a trait/paragraph is separated from the prior
      // field by a blank line).  A line that starts with `**` is the
      // start of a new trait and ends the field.
      while (i < lines.length) {
        const cont = lines[i];
        const cs = cont.trim();
        if (!cs) break;
        if (/^#{1,3}\s+/.test(cs)) break;
        if (ABILITY_HEADER.test(cs)) break;
        if (cs.startsWith('|')) {
          // Table separator `| --- |` or a row of a per-line fields table.
          // Don't end the field on the separator — skip it.
          if (/^\|\s*---/.test(cs)) {
            i++;
            continue;
          }
          // If it's a per-line field row, hand it off: process it as a
          // new field.  (We let the outer loop handle it on the next iter
          // by breaking here so the outer loop re-evaluates.)
          // Peek: is the first cell a known per-line field name?
          const cells = cs.split('|').map((c) => c.trim()).filter((c) => c.length > 0);
          if (cells.length >= 1) {
            const head = cells[0].replace(/^-\s+/, '');
            const m1 = PER_LINE_FIELDS.find((f) => f.prefixes.some((p) => head.startsWith(p)));
            const m2 = PER_LINE_FIELDS.find((f) => f.prefixes.some((p) => head === p));
            if (m1 || m2) break;
          }
          // Unrecognized table row — skip
          i++;
          continue;
        }
    if (cs.startsWith('**') || /^\*[A-Z]/.test(cs)) {
      // Could be the start of a new per-line field where only the
      // first word is bold: `**Skills** Deception +10` or
      // `**Damage** Vulnerabilities piercing ...`.  Try to detect:
      const fieldDetected = isLikelyNewPerLineField(cs);
      if (fieldDetected) break;
      // Otherwise it's a real bold-led paragraph (trait).  End.
      break;
    }
        const contUnwrapped = unWrapLine(cs).replace(/^-\s+/, '');
        const contUnwrapped2 = cs.replace(/^-\s+/, '').replace(/^\*\*+/, '').trim();
        if (
          PER_LINE_FIELDS.some((f) => f.prefixes.some((p) => contUnwrapped.startsWith(p))) ||
          PER_LINE_FIELDS.some((f) => f.prefixes.some((p) => contUnwrapped2.startsWith(p)))
        ) break;
        // Continuation: append
        out.perLine[matchedField.key] += ' ' + cs;
        i++;
      }
    } else {
      // Unknown line — could be a trait (bold-led paragraph) or a stray
      // continuation.  Stop the per-line pass; the section collector will
      // pick this up as part of `beforeActions`/traits.
      break;
    }
  }

  // Section collection: split the remainder by H2/H3 headings.
  let current = 'beforeActions';
  while (i < lines.length) {
    const line = lines[i];
    const stripped = line.trim();
    if (!stripped) {
      // blank: keep it as a paragraph separator within current section
      if (out[current]) out[current] += '\n\n';
      i++;
      continue;
    }
    if (/^#{1,3}\s+/.test(stripped)) {
      const m = stripped.match(/^#{1,3}\s+(.+?)\s*$/);
      const heading = (m[1] || '').trim();
      const u = heading.toUpperCase();
      // Treat any heading that starts with "ACTIONS" as the actions
      // section (handles "ACTIONS FOR TYPE 1", "ACTIONS (VARIANT)", etc.)
      if (u === 'ACTIONS' || u.startsWith('ACTIONS ')) current = 'actions';
      else if (u === 'REACTIONS') current = 'reactions';
      else if (u === 'LEGENDARY ACTIONS') current = 'legendary';
      else if (u === 'VARIANT' || u.startsWith('VARIANT:')) current = 'beforeActions';
      // Other headings (sub-### within actions etc) — treat as still in current
      out[current] = (out[current] || '') + '\n';
      i++;
      continue;
    }
    out[current] = (out[current] || '') + line + '\n';
    i++;
  }

  return out;
}

/**
 * Parse a single page (markdown + image list) into one or more stat blocks
 * keyed by the heading name, and any "lore" content.
 */
function parsePage(page) {
  const lines = page.lines;
  // Find the boundaries of each H1/H2 monster heading (excluding section
  // headings) and slice the page into chunks.  We also split on `---`
  // horizontal rules, since some pages put the lore and the stat block
  // under the same H1 with a `---` divider.  When a `---` divides two
  // parts of the same monster (e.g. INTELLECT DEVOURER), we keep the
  // same name on both chunks.
  //
  // Some pages (e.g. RUST MONSTER on page 263) repeat the monster name
  // in plain and bold text instead of using `---`.  We detect that by
  // finding an italic meta line followed by a 2-col table containing
  // AC/HP/Speed — that's the start of the stat block; everything before
  // it (within the current H1) is the lore chunk.
  //
  // Some pages (e.g. DEATH TYRANT on page 30) have an H2 like
  // `## Negative Energy Cane` that's a SUB-TRAIT, not a new stat block.
  // We detect that by looking ahead: if the H2 is followed by an ability
  // table, it's a new stat block; otherwise it's a sub-trait and we
  // keep it inside the current chunk.
  const ABILITY_HEADER_RE =
    /\|\s*STR\s*\|\s*DEX\s*\|\s*CON\s*\|\s*INT\s*\|\s*WIS\s*\|\s*CHA\s*\|/i;

  const isNewStatBlock = (startLine) => {
    // Look ahead up to 30 lines for an ability table OR for AC/HP/Speed
    // lines (including a 2-col table).
    for (let j = startLine; j < Math.min(startLine + 30, lines.length); j++) {
      const s = lines[j].trim();
      if (ABILITY_HEADER_RE.test(s)) return true;
      if (/^(Armor Class|Hit Points|Speed)/i.test(s)) return true;
      if (/^\|.*Armor (Class|Glass)/i.test(s)) return true;
      if (/^\|.*Hit Points/i.test(s)) return true;
      // Stop early if we hit another H1/H2 heading (or a `---` or
      // ## ACTIONS) — then this H2 is a sub-trait, not a stat block.
      if (j > startLine) {
        if (/^#{1,2}\s+/.test(s) && !/^#{1,2}\s+(Variant|ACTIONS|REACTIONS|LEGENDARY|LAIR|REGIONAL)/i.test(s))
          return false;
        if (/^---+$/.test(s)) return false;
      }
    }
    return false;
  };

  const chunks = [];
  let cur = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const stripped = line.trim();
    // Horizontal rule — end the current chunk and start a new one with
    // the same name (since the book uses `---` to split lore from stat
    // block under one H1).
    if (cur && /^---+$/.test(stripped)) {
      cur.endLine = i;
      chunks.push(cur);
      cur = { name: cur.name, startLine: i + 1, endLine: lines.length };
      continue;
    }
    // Italic meta line (e.g. `*Medium monstrosity, unaligned*`) followed
    // within a few lines by a 2-col table containing AC/HP/Speed:
    // start a new chunk here with the same name.  This splits "lore"
    // from "stat block" on pages like RUST MONSTER.
    if (cur && /^\*.+\*\s*$/.test(stripped)) {
      let hasStatTable = false;
      for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
        const ls = lines[j].trim();
        if (!ls) continue;
        if (/^\|.*Armor (Class|Glass).*\|/i.test(ls) || /^\|.*Hit Points.*\|/i.test(ls)) {
          hasStatTable = true;
          break;
        }
        if (!ls.startsWith('|') && ls) break;
      }
      if (hasStatTable) {
        cur.endLine = i;
        chunks.push(cur);
        cur = { name: cur.name, startLine: i, endLine: lines.length };
        continue;
      }
    }
    const m = line.match(/^#{1,2}\s+(.+?)\s*$/);
    if (!m) continue;
    const heading = m[1].trim();
    if (isSectionName(heading)) {
      // Hmm — ACTIONS / LEGENDARY ACTIONS / etc. as H1 also appear.  We
      // don't want to start a new chunk on these.
      continue;
    }
    // If we already have a chunk, decide whether this new heading starts
    // a new stat block or is a sub-trait of the current one.  If the
    // heading is followed by an ability table or AC/HP/Speed lines, it's
    // a new stat block.  Otherwise it's a sub-trait and we keep it in
    // the current chunk.
    //
    // Special case: if the new heading is the SAME name as the current
    // chunk's name (case-insensitive) — e.g. the second `# CAMBION` on
    // page 37 that introduces the lore — we keep it inside the current
    // chunk too (treat it as a sub-section).  Different names always
    // start a new chunk.
    const curName = cur ? (cur.name || '').toUpperCase() : '';
    const newName = heading.toUpperCase();
    if (cur && curName === newName) {
      // Same monster name: keep inside the current chunk.  We update
      // cur.startLine so the parseStatBlock can find the meta line in
      // the new region.  But also: if the new heading is followed by an
      // ability table, we still want it as a separate stat block.
      if (isNewStatBlock(i + 1)) {
        cur.endLine = i;
        chunks.push(cur);
        cur = { name: heading, startLine: i, endLine: lines.length };
      }
      // Otherwise, ignore the heading and keep the chunk going.
      continue;
    }
    if (cur && !isNewStatBlock(i + 1)) {
      // Sub-trait: keep inside the current chunk by NOT closing it.
      continue;
    }
    if (cur) {
      cur.endLine = i;
      chunks.push(cur);
    }
    cur = { name: heading, startLine: i, endLine: lines.length };
  }
  if (cur) chunks.push(cur);

  // Parse each chunk.  Some chunks are pure lore; others have stat blocks.
  const out = [];
  for (const c of chunks) {
    const md = lines.slice(c.startLine, c.endLine).join('\n');
    const parsed = parseStatBlock(md, c.name);
    parsed.name = c.name;
    parsed.hasAbilities = Object.keys(parsed.abilities).length === 6;
    // A chunk is a stat block if it has an ability table.  (A handful of
    // monsters in the book are missing AC/HP/Speed lines in the OCR but
    // are clearly stat blocks — we still emit them.)
    parsed.isStatBlock = parsed.hasAbilities;
    out.push(parsed);
  }

  return out;
}

module.exports = {
  ABILITY_KEYS,
  abilityModToString,
  isSectionName,
  parsePage,
  parseStatBlock,
  readPage,
  traitsToHtml,
  inlineMdToHtml,
  cleanOcr,
};

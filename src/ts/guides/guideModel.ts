// The player guides (src/res/rules/*.json) as a tree of sections, plus
// a search index over it.
//
// The JSON is nested headings: every key is a heading except `content`
// (the section's own text) and `table` (columns → cells). Strings are
// paragraphs holding a little HTML (<strong>, <em>). Parsing only groups
// what's there into blocks — runs of short items become lists, an array
// of single words becomes chips — the text itself is never changed.

import mechanics from '../../res/rules/06 mechanics.json';
import combat from '../../res/rules/07 combat.json';
import races from '../../res/rules/01 races.json';
import classes from '../../res/rules/02 classes.json';
import conditions from '../../res/rules/12 conditions.json';
import running from '../../res/rules/09 running.json';

export type GuideId = 'mechanics' | 'combat' | 'races' | 'classes' | 'conditions' | 'running';

export type Block =
  | { kind: 'text'; html: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'chips'; items: string[] }
  | { kind: 'table'; columns: string[]; rows: string[][] };

export type GuideNode = Block | { kind: 'section'; section: Section };

export type Section = {
  id: string; // unique within the guide; used as the DOM id and in ?section=
  guide: GuideId;
  title: string;
  level: number; // 0 = shown as the top headings of the guide
  trail: string[]; // titles of the sections above it
  nodes: GuideNode[];
  text: string; // its own text, tags stripped (search + snippets)
};

export type Guide = {
  id: GuideId;
  title: string;
  description: string;
  nodes: GuideNode[]; // the guide's own text and its top-level sections, in order
  sections: Section[]; // top-level sections
  all: Section[]; // every section, in reading order
  words: number;
  tables: number;
};

const SOURCES: { id: GuideId; title: string; description: string; body: unknown }[] = [
  { id: 'mechanics', title: 'Mechanics', description: 'Core D&D mechanics — dice, checks, actions.', body: mechanics },
  { id: 'combat', title: 'Combat', description: 'Initiative, attacks, damage, death saving throws.', body: combat },
  { id: 'races', title: 'Races', description: 'Racial traits, ability score increases, languages.', body: races },
  { id: 'classes', title: 'Classes', description: 'Class features, hit dice, proficiencies.', body: classes },
  { id: 'conditions', title: 'Conditions', description: 'The 14 standard conditions and their effects.', body: conditions },
  { id: 'running', title: 'Running the Game', description: 'Tips for pacing, exploration, social encounters.', body: running },
];

export const plain = (html: string) => html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');

const slug = (text: string) =>
  plain(text)
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// A skill list: every item a word or two.
const isChipList = (items: unknown[]) =>
  items.length >= 2 &&
  items.every((s) => typeof s === 'string' && plain(s).trim().length <= 24 && !/[.:]$/.test(plain(s).trim()));

// "<strong>Wisdom</strong>: measuring perception and insight", "Go
// without sleep": short, and not a sentence or a lead-in to a list.
const isListItem = (s: string) => {
  const t = plain(s).trim();
  if (t.length > 110 || t.endsWith(':')) return false;
  return s.startsWith('<strong>') || !/[.!?]$/.test(t);
};

type Ctx = { guide: GuideId; level: number; trail: string[]; ids: Set<string>; all: Section[] };

function parseValue(value: unknown, ctx: Ctx): GuideNode[] {
  if (typeof value === 'string') return [{ kind: 'text', html: value }];
  if (Array.isArray(value)) return parseArray(value, ctx);
  if (value && typeof value === 'object') return parseObject(value as Record<string, unknown>, ctx);
  return [];
}

function parseObject(obj: Record<string, unknown>, ctx: Ctx): GuideNode[] {
  const out: GuideNode[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'table') out.push(parseTable(value as Record<string, string[]>));
    else if (key === 'content') out.push(...parseValue(value, ctx));
    else out.push({ kind: 'section', section: makeSection(key, value, ctx) });
  }
  return out;
}

// The source sometimes breaks a sentence across two strings ("… Animal
// Handling, Athletics," + "Intimidation, Nature, …"; "…you must spend" +
// "15 feet of movement…"). Show those halves as one paragraph. Short
// lowercase lines ("open or close a door", "bless, cure wounds") are real
// list items, so only a trailing comma, a word that can't end a sentence,
// or a long line running on into a lowercase one counts as a break.
const DANGLING = /\b(the|a|an|of|to|and|or|with|by|for|in|on|at|your|their|its|is|are|be|can|must|may|that|which|than|as|from)$/i;

function joinBrokenLines(arr: unknown[]): unknown[] {
  const out: unknown[] = [];
  for (const item of arr) {
    const prev = out[out.length - 1];
    if (typeof item === 'string' && typeof prev === 'string') {
      const end = plain(prev).trimEnd();
      const start = plain(item).trimStart();
      const runsOn = /[a-z]$/.test(end) && (DANGLING.test(end) || (end.length > 60 && /^[a-z0-9]/.test(start)));
      if (end.endsWith(',') || runsOn) {
        out[out.length - 1] = `${prev.trimEnd()} ${item.trimStart()}`;
        continue;
      }
    }
    out.push(item);
  }
  return out;
}

function parseArray(source: unknown[], ctx: Ctx): GuideNode[] {
  const arr = joinBrokenLines(source);
  if (isChipList(arr)) return [{ kind: 'chips', items: arr as string[] }];
  const out: GuideNode[] = [];
  let run: string[] = [];
  const flush = () => {
    if (run.length >= 2) out.push({ kind: 'list', items: run });
    else run.forEach((html) => out.push({ kind: 'text', html }));
    run = [];
  };
  for (const item of arr) {
    if (typeof item === 'string' && isListItem(item)) {
      run.push(item);
      continue;
    }
    flush();
    // An array inside an array is a list in the source.
    if (Array.isArray(item) && item.every((s) => typeof s === 'string')) {
      out.push(isChipList(item) ? { kind: 'chips', items: item } : { kind: 'list', items: item });
    } else {
      out.push(...parseValue(item, ctx));
    }
  }
  flush();
  return out;
}

function parseTable(table: Record<string, string[]>): Block {
  const columns = Object.keys(table);
  const length = Math.max(0, ...Object.values(table).map((c) => c.length));
  const rows = Array.from({ length }, (_, i) => columns.map((c) => table[c][i] ?? ''));
  return { kind: 'table', columns, rows };
}

function makeSection(title: string, value: unknown, ctx: Ctx): Section {
  let id = slug([...ctx.trail.slice(-1), title].join(' ')) || 'section';
  for (let n = 2; ctx.ids.has(id); n++) id = `${slug(title)}-${n}`;
  ctx.ids.add(id);
  const section: Section = { id, guide: ctx.guide, title, level: ctx.level, trail: ctx.trail, nodes: [], text: '' };
  ctx.all.push(section);
  section.nodes = parseValue(value, { ...ctx, level: ctx.level + 1, trail: [...ctx.trail, title] });
  section.text = section.nodes.map(blockText).filter(Boolean).join(' ');
  return section;
}

const blockText = (node: GuideNode): string => {
  switch (node.kind) {
    case 'text':
      return plain(node.html);
    case 'list':
    case 'chips':
      return node.items.map(plain).join(' · ');
    case 'table':
      return [node.columns.join(' · '), ...node.rows.map((r) => r.join(' · '))].join(' · ');
    default:
      return '';
  }
};

function buildGuide(src: (typeof SOURCES)[number]): Guide {
  const body = src.body as Record<string, unknown>;
  const keys = Object.keys(body);
  // "Combat" inside the Combat guide: the page title already says it,
  // so its children become the top level.
  const root = keys.length === 1 && keys[0] === src.title ? body[keys[0]] : body;
  const ctx: Ctx = { guide: src.id, level: 0, trail: [], ids: new Set(), all: [] };
  const nodes = parseValue(root, ctx);
  const sections = nodes.flatMap((n) => (n.kind === 'section' ? [n.section] : []));
  const words = ctx.all.reduce((sum, s) => sum + s.text.split(/\s+/).length, nodes.map(blockText).join(' ').split(/\s+/).length);
  let tables = 0;
  const countTables = (ns: GuideNode[]): void =>
    ns.forEach((n) => {
      if (n.kind === 'table') tables++;
      else if (n.kind === 'section') countTables(n.section.nodes);
    });
  countTables(nodes);
  return { id: src.id, title: src.title, description: src.description, nodes, sections, all: ctx.all, words, tables };
}

export const GUIDES: Guide[] = SOURCES.map(buildGuide);

export const guideById = (id: string | null | undefined) => GUIDES.find((g) => g.id === id);

// ---- Search -------------------------------------------------------------

export type GuideHit = {
  section: Section;
  score: number;
  snippet: [string, string, string] | null; // before, match, after
};

type Indexed = { section: Section; title: string; trail: string; text: string };
const INDEX: Indexed[] = GUIDES.flatMap((g) =>
  g.all.map((s) => ({ section: s, title: s.title.toLowerCase(), trail: s.trail.join(' ').toLowerCase(), text: s.text.toLowerCase() })),
);

export const queryWords = (query: string) => query.toLowerCase().trim().split(/\s+/).filter((w) => w.length > 1);

// Every word must appear in the section's title, its trail or its own
// text; title matches rank far above text ones.
export function searchGuides(query: string, limit = 60): GuideHit[] {
  const words = queryWords(query);
  if (words.length === 0) return [];
  const phrase = words.join(' ');
  const hits: GuideHit[] = [];
  for (const it of INDEX) {
    let score = 0;
    for (const w of words) {
      if (it.title === w) score += 120;
      else if (it.title.startsWith(w)) score += 80;
      else if (it.title.includes(w)) score += 50;
      else if (it.text.includes(w)) score += 6 + Math.min(10, it.text.split(w).length - 1);
      else if (it.trail.includes(w)) score += 4;
      else {
        score = 0;
        break;
      }
    }
    if (score === 0) continue;
    if (words.length > 1 && (it.title.includes(phrase) || it.text.includes(phrase))) score += 40;
    // Deep sections with a matching title beat the broad ones above them.
    hits.push({ section: it.section, score: score - it.section.level, snippet: snippet(it.section.text, it.text, words) });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

function snippet(text: string, lower: string, words: string[]): GuideHit['snippet'] {
  const phrase = words.join(' ');
  let at = lower.indexOf(phrase);
  let len = phrase.length;
  if (at === -1) {
    const w = words.find((x) => lower.includes(x));
    if (!w) return null;
    at = lower.indexOf(w);
    len = w.length;
  }
  const start = Math.max(0, text.lastIndexOf(' ', Math.max(0, at - 70)) + 1);
  const end = text.indexOf(' ', Math.min(text.length, at + len + 110));
  const stop = end === -1 ? text.length : end;
  return [(start > 0 ? '… ' : '') + text.slice(start, at), text.slice(at, at + len), text.slice(at + len, stop) + (stop < text.length ? ' …' : '')];
}

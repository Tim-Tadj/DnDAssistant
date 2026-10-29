// Encounter forecast: run a fight a few hundred times and report how it
// tends to go. Deliberately rough. Monsters use the attacks in their
// stat block (falling back to the DMG's by-CR numbers); characters'
// attacks are estimated from level and class. Spells, positioning and tactics beyond "finish off the weakest" are ignored,
// so the numbers are a sanity check, not a promise. Recharge abilities
// (breath weapons and the like) are modelled as a save-for-half blast
// that hits a few characters.

import { Monster } from '../types/Monster';

export type Fighter = {
  name: string;
  isPC: boolean;
  ac: number;
  maxHp: number;
  hp: number; // at the start of the fight
  attackBonus: number;
  attacks: number; // per round
  damage: number; // average per hit
  heals?: { uses: number; amount: number }; // healers can pick up a downed ally
  blast?: number; // average damage of a recharge ability, on a failed save
};

export type PcSummary = { name: string; dropPct: number; deathPct: number; hpLeftPct: number };

export type Forecast = {
  runs: number;
  winPct: number;
  rounds: number; // median, among wins
  anyDropPct: number;
  anyDeathPct: number;
  partyHpLeftPct: number; // average, among wins
  pcs: PcSummary[];
  verdict: string;
};

// ---- Monsters ---------------------------------------------------------

// DMG "Monster Statistics by Challenge Rating": attack bonus and damage per round.
const CR_TABLE: [number, number, number][] = [
  [0, 3, 1], [0.125, 3, 3], [0.25, 3, 5], [0.5, 3, 8], [1, 3, 11], [2, 3, 17], [3, 4, 23],
  [4, 5, 29], [5, 6, 35], [6, 6, 41], [7, 6, 47], [8, 7, 53], [9, 7, 59], [10, 7, 65],
  [11, 8, 71], [12, 8, 77], [13, 8, 83], [14, 8, 89], [15, 8, 95], [16, 9, 101], [17, 10, 107],
  [18, 10, 113], [19, 10, 119], [20, 10, 131], [21, 11, 149], [22, 11, 167], [23, 11, 185],
  [24, 12, 203], [25, 12, 221], [26, 12, 239], [27, 13, 257], [28, 13, 275], [29, 13, 293], [30, 14, 311],
];

const NUMBER_WORDS: Record<string, number> = { two: 2, three: 3, four: 4, five: 5, six: 6 };

export const parseCr = (challenge: string | undefined): number => {
  const raw = (challenge ?? '').trim().split(/\s/)[0];
  if (raw.includes('/')) {
    const [a, b] = raw.split('/').map(Number);
    return b ? a / b : 0;
  }
  return Number(raw) || 0;
};

const crRow = (cr: number) => CR_TABLE.reduce((best, row) => (row[0] <= cr ? row : best), CR_TABLE[0]);

// One entry per <p> (or line, for plain-text stat blocks), tags stripped.
const paragraphs = (html: string) =>
  html
    .split(/<\/p>|\n(?=\s*(?:<p>|[A-Z][\w ()–-]*\.))/i)
    .map((p) => p.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);

type ParsedAttack = { bonus: number; damage: number };

// "Scimitar. Melee Weapon Attack: +4 to hit, … Hit: 5 (1d6 + 2) slashing damage plus 3 (1d6) fire damage."
export function parseAttacks(actionsHtml: string | undefined): { attacks: ParsedAttack[]; multi: number; blast?: number } {
  const paras = paragraphs(actionsHtml ?? '');
  const attacks: ParsedAttack[] = [];
  for (const para of paras) {
    const toHit = para.match(/Attack:?\s*\+(\d+)\s*to hit/i);
    if (!toHit) continue;
    const hit = para.split(/Hit:/i)[1];
    if (!hit) continue;
    // Every "N (XdY…)" after Hit: up to the first sentence about saves.
    const damagePart = hit.split(/saving throw|must succeed|must make/i)[0];
    const amounts = Array.from(damagePart.matchAll(/(\d+)\s*\(\s*\d+d\d+/g)).map((m) => Number(m[1]));
    const flat = damagePart.match(/^\s*(\d+)\s+\w+\s+damage/);
    const damage = amounts.length ? amounts.reduce((a, b) => a + b, 0) : flat ? Number(flat[1]) : 0;
    if (damage > 0) attacks.push({ bonus: Number(toHit[1]), damage });
  }
  const multiMatch = paras.join('\n').match(/Multiattack\.?[^\n]*?makes (two|three|four|five|six)\b/i);
  // "Fire Breath (Recharge 5–6). … taking 56 (16d6) fire damage on a failed save"
  const blastPara = paras.find((p) => /\(Recharge/i.test(p) && /failed save/i.test(p));
  const blastMatch = blastPara?.match(/(\d+)\s*\(\s*\d+d\d+[^)]*\)\s*\w+\s+damage on a failed save/i);
  return {
    attacks,
    multi: multiMatch ? NUMBER_WORDS[multiMatch[1].toLowerCase()] : 1,
    blast: blastMatch ? Number(blastMatch[1]) : undefined,
  };
}

export function monsterFighter(m: Monster, label: string): Fighter {
  const ac = parseInt(m.ac, 10) || 12;
  const hp = parseInt(m.hp, 10) || 10;
  const cr = parseCr(m.challenge);
  const [, crBonus, crDpr] = crRow(cr);
  const { attacks, multi, blast } = parseAttacks(m.actions);
  let attackBonus = crBonus;
  let perRound = crDpr;
  // Without parsed attacks, spread the CR's damage over a few swings.
  let count = cr >= 5 ? 3 : cr >= 2 ? 2 : 1;
  if (attacks.length) {
    const best = [...attacks].sort((a, b) => b.damage - a.damage);
    // A multiattack mixes the creature's attacks; average its top two.
    const top = best.slice(0, multi > 1 ? 2 : 1);
    const perHit = top.reduce((a, b) => a + b.damage, 0) / top.length;
    count = multi;
    attackBonus = Math.round(top.reduce((a, b) => a + b.bonus, 0) / top.length);
    perRound = perHit * count;
  }
  // Spellcasters and breath-weapon users hit harder than their weapon
  // attacks suggest; don't let them fall far below their CR.
  if (perRound < crDpr * 0.5) {
    perRound = crDpr * 0.75;
    count = cr >= 5 ? 3 : cr >= 2 ? 2 : 1;
  }
  return { name: label, isPC: false, ac, maxHp: hp, hp, attackBonus, attacks: count, damage: perRound / count, blast };
}

// ---- Characters -------------------------------------------------------

const mod = (score: number) => Math.floor((score - 10) / 2);
const profBonus = (level: number) => 2 + Math.floor((level - 1) / 4);
const cantripDice = (level: number) => (level >= 17 ? 4 : level >= 11 ? 3 : level >= 5 ? 2 : 1);

export type PcInput = {
  name: string;
  className?: string;
  level: number;
  maxHp: number;
  hp?: number;
  ac: number;
  scores?: number[]; // str, dex, con, int, wis, cha
};

export function pcFighter(pc: PcInput): Fighter {
  const level = Math.max(1, Math.min(20, pc.level || 1));
  const cls = (pc.className ?? '').toLowerCase();
  const scores = pc.scores ?? [];
  // Unfilled sheets have every score at 10; assume a sensible primary stat.
  const filled = scores.some((s) => s && s !== 10);
  const best = filled ? Math.max(...scores.map(mod)) : level >= 8 ? 5 : level >= 4 ? 4 : 3;
  const prof = profBonus(level);
  const extra = level >= 5 ? 2 : 1;
  let attacks = 1;
  let damage = 4.5 + best;
  let heals: Fighter['heals'];

  if (cls.includes('fighter')) {
    attacks = level >= 20 ? 4 : level >= 11 ? 3 : extra;
    damage = 5.5 + best + (level >= 2 ? 1 : 0); // action surge, roughly
  } else if (cls.includes('barbarian')) {
    attacks = extra;
    damage = 6.5 + best + (level >= 16 ? 4 : level >= 9 ? 3 : 2);
  } else if (cls.includes('paladin')) {
    attacks = extra;
    damage = 4.5 + best + (level >= 2 ? 4.5 : 0) / attacks + (level >= 11 ? 4.5 : 0);
    heals = { uses: 1, amount: 5 * level };
  } else if (cls.includes('ranger')) {
    attacks = extra;
    damage = 4.5 + best + 3.5;
  } else if (cls.includes('monk')) {
    attacks = extra + 1;
    damage = (level >= 11 ? 4.5 : level >= 5 ? 3.5 : 2.5) + best;
  } else if (cls.includes('rogue')) {
    attacks = 1;
    damage = 3.5 + best + Math.ceil(level / 2) * 3.5;
  } else if (cls.includes('warlock')) {
    attacks = cantripDice(level);
    damage = 5.5 + (level >= 2 ? best : 0);
  } else if (/wizard|sorcerer|cleric|druid|bard|artificer/.test(cls)) {
    attacks = 1;
    // A cantrip most turns, a levelled spell some of them.
    damage = cantripDice(level) * 5.5 * 1.3 + (cls.includes('cleric') && level >= 8 ? 4.5 : 0);
    if (/cleric|druid|bard/.test(cls)) {
      heals = { uses: Math.min(1 + Math.floor(level / 3), 4), amount: (1 + Math.floor((level - 1) / 4)) * 2.5 + best };
    }
  }
  return {
    name: pc.name,
    isPC: true,
    ac: pc.ac || 12,
    maxHp: pc.maxHp,
    hp: pc.hp ?? pc.maxHp,
    attackBonus: prof + best,
    attacks,
    damage,
    heals,
  };
}

// ---- The fight --------------------------------------------------------

type Live = Fighter & {
  cur: number;
  down: boolean;
  dead: boolean;
  dropped: boolean;
  saves: [number, number];
  healsLeft: number;
  blastReady: boolean;
};

const d20 = () => 1 + Math.floor(Math.random() * 20);
const shuffle = <T,>(a: T[]) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function hurt(target: Live, dmg: number) {
  target.cur -= dmg;
  if (target.cur <= 0) {
    if (target.isPC && -target.cur >= target.maxHp) target.dead = true;
    target.cur = 0;
    target.down = true;
    target.dropped = true;
    target.saves = [0, 0];
  }
}

function attack(att: Live, target: Live) {
  for (let i = 0; i < att.attacks; i++) {
    if (target.down || target.dead) return;
    const roll = d20();
    if (roll === 1 || (roll !== 20 && roll + att.attackBonus < target.ac)) continue;
    hurt(target, Math.max(1, Math.round(att.damage * (0.6 + Math.random() * 0.8) * (roll === 20 ? 1.7 : 1))));
  }
}

// A cone or line catches two or three of the party; half on a save.
function unleash(att: Live, targets: Live[]) {
  att.blastReady = false;
  for (const t of shuffle([...targets]).slice(0, 2 + Math.floor(Math.random() * 2))) {
    hurt(t, Math.round((att.blast ?? 0) * (0.7 + Math.random() * 0.6) * (Math.random() < 0.5 ? 1 : 0.5)));
  }
}

type FightResult = { win: boolean; rounds: number; pcs: Live[] };

function fight(pcs: Fighter[], monsters: Fighter[]): FightResult {
  const mk = (f: Fighter): Live => ({
    ...f,
    cur: f.hp,
    down: f.hp <= 0,
    dead: false,
    dropped: false,
    saves: [0, 0],
    healsLeft: f.heals?.uses ?? 0,
    blastReady: Boolean(f.blast),
  });
  const party = pcs.map(mk);
  const foes = monsters.map(mk);
  const order = shuffle([...party, ...foes]);
  const standing = (side: Live[]) => side.filter((f) => !f.down && !f.dead);
  let round = 0;
  while (round < 20 && standing(party).length && standing(foes).length) {
    round++;
    for (const f of order) {
      if (f.dead) continue;
      if (f.isPC && f.down) {
        if (f.saves[1] >= 3 || f.saves[0] >= 3) continue;
        const r = d20();
        if (r === 20) {
          f.down = false;
          f.cur = 1;
        } else if (r === 1) f.saves[1] += 2;
        else if (r >= 10) f.saves[0] += 1;
        else f.saves[1] += 1;
        if (f.saves[1] >= 3) f.dead = true;
        continue;
      }
      if (f.down) continue;
      if (f.isPC) {
        // Healing word is a bonus action: pick someone up, then attack.
        if (f.healsLeft > 0) {
          const ally = party.find((p) => p.down && !p.dead);
          if (ally && f.heals) {
            f.healsLeft--;
            ally.down = false;
            ally.cur = Math.min(ally.maxHp, Math.max(1, Math.round(f.heals.amount)));
          }
        }
        // Focus fire: finish off the most wounded foe.
        const targets = standing(foes);
        if (!targets.length) break;
        const target = targets.reduce((a, b) => (b.cur < a.cur ? b : a));
        attack(f, target);
      } else {
        const targets = standing(party);
        if (!targets.length) break;
        if (f.blast && !f.blastReady && Math.random() < 1 / 3) f.blastReady = true;
        if (f.blastReady && targets.length > 1) {
          unleash(f, targets);
          continue;
        }
        // Mostly whoever is in reach, sometimes the one already bleeding.
        const target =
          Math.random() < 0.35
            ? targets.reduce((a, b) => (b.cur / b.maxHp < a.cur / a.maxHp ? b : a))
            : targets[Math.floor(Math.random() * targets.length)];
        attack(f, target);
      }
    }
  }
  // Anyone left dying after a win is stabilised by the party.
  const win = standing(foes).length === 0;
  return { win, rounds: round, pcs: party };
}

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

function verdictOf(f: Omit<Forecast, 'verdict'>): string {
  const odds =
    f.winPct >= 95 ? 'Almost certain win' : f.winPct >= 80 ? 'Likely win' : f.winPct >= 55 ? 'Could go either way' : f.winPct >= 10 ? 'Likely loss' : 'Very likely a party wipe';
  const worst = [...f.pcs].sort((a, b) => b.dropPct - a.dropPct)[0];
  const tail =
    f.anyDeathPct >= 15
      ? `, and someone may die (${Math.round(f.anyDeathPct)}%)`
      : worst && worst.dropPct >= 50
        ? `, ${worst.name} probably goes down`
        : worst && worst.dropPct >= 20
          ? `, ${worst.name} might go down`
          : f.anyDropPct < 10
            ? ', nobody should drop'
            : '';
  return `${odds}${tail}.`;
}

export function forecast(pcs: Fighter[], monsters: Fighter[], runs = 400): Forecast {
  const rounds: number[] = [];
  let wins = 0;
  let anyDrop = 0;
  let anyDeath = 0;
  let hpLeft = 0;
  const per = pcs.map(() => ({ drop: 0, death: 0, hp: 0 }));
  for (let i = 0; i < runs; i++) {
    const r = fight(pcs, monsters);
    if (r.win) {
      wins++;
      rounds.push(r.rounds);
      const total = r.pcs.reduce((a, p) => a + p.maxHp, 0) || 1;
      hpLeft += r.pcs.reduce((a, p) => a + (p.dead ? 0 : p.cur), 0) / total;
    }
    if (r.pcs.some((p) => p.dropped)) anyDrop++;
    if (r.pcs.some((p) => p.dead)) anyDeath++;
    r.pcs.forEach((p, j) => {
      if (p.dropped) per[j].drop++;
      if (p.dead) per[j].death++;
      per[j].hp += p.dead ? 0 : p.cur / (p.maxHp || 1);
    });
  }
  const base = {
    runs,
    winPct: (wins / runs) * 100,
    rounds: median(rounds),
    anyDropPct: (anyDrop / runs) * 100,
    anyDeathPct: (anyDeath / runs) * 100,
    partyHpLeftPct: wins ? (hpLeft / wins) * 100 : 0,
    pcs: pcs.map((p, j) => ({
      name: p.name,
      dropPct: (per[j].drop / runs) * 100,
      deathPct: (per[j].death / runs) * 100,
      hpLeftPct: (per[j].hp / runs) * 100,
    })),
  };
  return { ...base, verdict: verdictOf(base) };
}

// ---- The adventuring day ----------------------------------------------

export type DayStep = {
  name: string;
  reachPct: number; // the party got this far
  winPct: number; // of those that got here
  enterHpPct: number; // average party HP going in
  anyDropPct: number;
  anyDeathPct: number;
};

// Fights in order, HP carried between them. A short rest between fights
// gives back about a quarter of max HP; downed characters who survived
// wake on 1 HP; the dead stay dead.
export function forecastDay(pcs: Fighter[], fights: { name: string; monsters: Fighter[] }[], shortRests: boolean, runs = 300): DayStep[] {
  const steps = fights.map((f) => ({ name: f.name, reach: 0, win: 0, hp: 0, drop: 0, death: 0 }));
  const total = pcs.reduce((a, p) => a + p.maxHp, 0) || 1;
  for (let i = 0; i < runs; i++) {
    let party = pcs.map((p) => ({ ...p }));
    for (let k = 0; k < fights.length; k++) {
      const alive = party.filter((p) => p.hp > 0);
      if (!alive.length) break;
      steps[k].reach++;
      steps[k].hp += party.reduce((a, p) => a + Math.max(0, p.hp), 0) / total;
      const r = fight(alive, fights[k].monsters);
      if (r.pcs.some((p) => p.dropped)) steps[k].drop++;
      if (r.pcs.some((p) => p.dead)) steps[k].death++;
      if (!r.win) break;
      steps[k].win++;
      const after = new Map(r.pcs.map((p) => [p.name, p]));
      party = party.map((p) => {
        const res = after.get(p.name);
        if (!res) return p;
        if (res.dead) return { ...p, hp: 0 };
        const hp = Math.max(1, res.cur) + (shortRests ? Math.round(p.maxHp / 4) : 0);
        return { ...p, hp: Math.min(p.maxHp, hp), heals: p.heals && { ...p.heals, uses: res.healsLeft } };
      });
    }
  }
  return steps.map((s) => ({
    name: s.name,
    reachPct: (s.reach / runs) * 100,
    winPct: s.reach ? (s.win / s.reach) * 100 : 0,
    enterHpPct: s.reach ? (s.hp / s.reach) * 100 : 0,
    anyDropPct: s.reach ? (s.drop / s.reach) * 100 : 0,
    anyDeathPct: s.reach ? (s.death / s.reach) * 100 : 0,
  }));
}

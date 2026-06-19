// Hydrate a saved encounter's MonsterRef list into full Monster
// objects, by looking each up by id in the user's monster list.
// Falls back to a synthetic stub for monsters we can't find
// (e.g. SRD content that hasn't been seeded yet).
//
// Used by the Encounter Library tab's "Re-run" action.

import { Monster } from '../types/Monster';
import { EncounterSave, MonsterRef } from '../types/EncounterSave';
import { monstersApi } from './monsters';

export async function hydrateEncounterSave(save: EncounterSave): Promise<Monster[]> {
  const all = await monstersApi.list();
  const byId = new Map<number, Monster>();
  for (const m of all) if (typeof m.id === 'number') byId.set(m.id, m);

  const out: Monster[] = [];
  for (const ref of save.monsters ?? []) {
    const found = byId.get(ref.id);
    if (found) {
      for (let i = 0; i < ref.count; i++) out.push(found);
      continue;
    }
    // Fallback: a minimal stub so the encounter still loads even
    // if the monster has been deleted from the bestiary.
    for (let i = 0; i < ref.count; i++) {
      out.push({
        id: ref.id,
        name: ref.name,
        meta: 'Unknown',
        ac: '10',
        hp: `${(ref.xp_each ?? 10) * 2}`,
        speed: '30 ft.',
        challenge: '? (?)',
        str: '10 (+0)',
        dex: '10 (+0)',
        con: '10 (+0)',
        int: '10 (+0)',
        wis: '10 (+0)',
        cha: '10 (+0)',
        saving_throws: '',
        skills: '',
        damage_vulnerabilities: '',
        damage_resistances: '',
        damage_immunities: '',
        condition_immunities: '',
        senses: '',
        languages: '',
        traits: '',
        actions: '',
        reactions: '',
        legendary_actions: '',
        img_url: '',
      } as Monster);
    }
  }
  return out;
}

export type RefFromMonstersResult = {
  refs: MonsterRef[];
  totalXp: number;
};

export function collapseMonstersToRefs(monsters: Monster[]): RefFromMonstersResult {
  const byName = new Map<string, MonsterRef>();
  let totalXp = 0;
  for (const m of monsters) {
    const xp = Number(m.challenge?.split('(')[1]?.replace(/[^0-9.]/g, '') ?? 0);
    totalXp += xp;
    const ref: MonsterRef = {
      id: m.id ?? 0,
      name: m.name,
      count: (byName.get(m.name)?.count ?? 0) + 1,
      xp_each: xp,
    };
    byName.set(m.name, ref);
  }
  return { refs: Array.from(byName.values()), totalXp };
}

import React from 'react';
import {
  DIFFICULTIES,
  ENCOUNTER_MULTIPLIERS,
  EXPERIENCE_THRESHOLDS,
  MAX_EXPERIENCE,
  MIN_EXPERIENCE,
} from '../constants';
import { Monster } from '../types/Monster';
import useMonsters from './use-monsters';

export const getMonsterXP = (monster: Monster) => {
  const xp = Number(monster.challenge?.split('(')[1]?.replace(/[^0-9.]/g, ''));
  return isNaN(xp) ? 0 : xp;
};

export const multiplierFor = (count: number) =>
  ENCOUNTER_MULTIPLIERS.find((e) => count <= e.numberOfMonsters || e.numberOfMonsters === 15)?.multiplier ?? 1;

// The difficulty an adjusted XP total actually lands on for this party.
export const rateDifficulty = (adjustedXP: number, playerLevel: number, partySize: number): string => {
  const thresholds = (EXPERIENCE_THRESHOLDS[playerLevel] ?? EXPERIENCE_THRESHOLDS[1]).map((t) => t * partySize);
  let rating = 'Trivial';
  thresholds.forEach((t, i) => {
    if (adjustedXP >= t) rating = DIFFICULTIES[i];
  });
  return rating;
};

type GenerateEncounterState = {
  searchQuery: string;
  setSearchQuery: (s: string) => void;
  monsterTypes: string[];
  setMonsterTypes: (t: string[]) => void;
  alignments: string[];
  setAlignments: (a: string[]) => void;
  sizes: string[];
  setSizes: (s: string[]) => void;
  playerLevel: number;
  setPlayerLevel: (n: number) => void;
  partySize: number;
  setPartySize: (n: number) => void;
  difficulty: string;
  setDifficulty: (d: string) => void;
  experience: number[];
  setExperience: (e: number[]) => void;
  xpBudget: number;
  monstersInCombat: Monster[];
  determineMonstersInEncounter: () => Monster[];
  clearEncounter: () => void;
  // Editing the generated list, by monster name (the preview groups by name).
  rerollGroups: (names: string[]) => Map<string, string>;
  removeGroups: (names: string[]) => void;
  setGroupCount: (name: string, count: number) => void;
  addMonsters: (monsters: Monster[]) => void;
};

export default function useGenerateEncounter(defaultDifficulty = 'Medium'): GenerateEncounterState {
  const { monsters } = useMonsters();
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [monsterTypes, setMonsterTypes] = React.useState<string[]>([]);
  const [alignments, setAlignments] = React.useState<string[]>([]);
  const [sizes, setSizes] = React.useState<string[]>([]);
  const [playerLevel, setPlayerLevel] = React.useState<number>(1);
  const [partySize, setPartySize] = React.useState<number>(4);
  const [difficulty, setDifficulty] = React.useState<string>(defaultDifficulty);
  const [experience, setExperience] = React.useState<number[]>([
    MIN_EXPERIENCE,
    MAX_EXPERIENCE,
  ]);
  const [monstersInCombat, setMonstersInCombat] = React.useState<Monster[]>([]);

  const filterMonsterByType = (monster: Monster) => {
    return (
      monsterTypes.length === 0 ||
      monsterTypes.some((type) => monster.meta.includes(type.toLowerCase()))
    );
  };
  const filterMonsterByAlignment = (monster: Monster) => {
    return (
      alignments.length === 0 ||
      alignments.some((alignment) =>
        monster.meta.includes(alignment.toLowerCase())
      )
    );
  };
  const filterMonsterBySize = (monster: Monster) => {
    return (
      sizes.length === 0 || sizes.some((size) => monster.meta.includes(size))
    );
  };
  const filterByKeywordSearch = (monster: Monster) => {
    return searchQuery
      .split('+')
      .some((query) =>
        monster.name.toLowerCase().includes(query.trim().toLowerCase())
      );
  };
  const filterMonsterByExperience = (monster: Monster) => {
    const monsterExperience = getMonsterXP(monster);
    return (
      experience[0] <= monsterExperience && monsterExperience <= experience[1]
    );
  };
  const matchesFilters = (monster: Monster) =>
    filterMonsterByType(monster) &&
    filterMonsterByAlignment(monster) &&
    filterMonsterBySize(monster) &&
    filterByKeywordSearch(monster);

  const xpBudget =
    (EXPERIENCE_THRESHOLDS[playerLevel]?.[DIFFICULTIES.findIndex((diff) => diff === difficulty)] ?? 0) *
    partySize;

  const determineMonstersInEncounter = () => {
    const all = monsters ?? [];
    const maxExperienceThreshold = xpBudget;

    let potentialMonsters = all.filter(
      (monster) =>
        filterMonsterByExperience(monster) &&
        matchesFilters(monster) &&
        getMonsterXP(monster) > 0 &&
        getMonsterXP(monster) <= maxExperienceThreshold
    );
    let experienceThreshold = maxExperienceThreshold;
    let multiplier = 1;

    // Determine potential combatants
    const next: Monster[] = [];
    while (experienceThreshold > 0 && potentialMonsters.length > 0) {
      const monsterIndex = Math.floor(Math.random() * potentialMonsters.length);
      const monster = potentialMonsters[monsterIndex];
      next.push(monster);

      // Adjust experience threshold accounting for monster groups
      multiplier = multiplierFor(next.length + 1);
      const usedXPBudget = next.reduce(
        (accumulator, m) => (accumulator += getMonsterXP(m)),
        0
      );
      experienceThreshold = maxExperienceThreshold - usedXPBudget * multiplier;
      potentialMonsters = potentialMonsters.filter(
        (m) => getMonsterXP(m) <= experienceThreshold / multiplier
      );
    }
    setMonstersInCombat(next);
    return next;
  };

  const clearEncounter = () => setMonstersInCombat([]);

  // Swap each named group for a different monster as close in XP as
  // possible, keeping the group's size. Prefers monsters matching the
  // current filters and not already in the encounter. Returns old→new
  // names so the caller can carry its selection over.
  const rerollGroups = (names: string[]) => {
    const all = monsters ?? [];
    const swaps = new Map<string, string>();
    const taken = new Set(monstersInCombat.map((m) => m.name));
    const pick = (target: Monster) => {
      const xp = getMonsterXP(target);
      for (const pool of [all.filter(matchesFilters), all]) {
        const candidates = pool.filter((m) => !taken.has(m.name) && getMonsterXP(m) > 0);
        if (candidates.length === 0) continue;
        const distance = (m: Monster) => Math.abs(getMonsterXP(m) - xp);
        const best = Math.min(...candidates.map(distance));
        const nearest = candidates.filter((m) => distance(m) === best);
        return nearest[Math.floor(Math.random() * nearest.length)];
      }
      return null;
    };
    const replacements = new Map<string, Monster>();
    for (const name of names) {
      const current = monstersInCombat.find((m) => m.name === name);
      if (!current) continue;
      const next = pick(current);
      if (!next) continue;
      taken.add(next.name);
      replacements.set(name, next);
      swaps.set(name, next.name);
    }
    setMonstersInCombat((prev) => prev.map((m) => replacements.get(m.name) ?? m));
    return swaps;
  };

  const removeGroups = (names: string[]) => {
    const gone = new Set(names);
    setMonstersInCombat((prev) => prev.filter((m) => !gone.has(m.name)));
  };

  const setGroupCount = (name: string, count: number) => {
    setMonstersInCombat((prev) => {
      const at = prev.findIndex((m) => m.name === name);
      if (at === -1) return prev;
      // Keep the group where it was so the preview row doesn't jump.
      const others = prev.filter((m) => m.name !== name);
      const before = prev.slice(0, at).filter((m) => m.name !== name).length;
      const copies = Array.from({ length: Math.max(0, count) }, () => prev[at]);
      return [...others.slice(0, before), ...copies, ...others.slice(before)];
    });
  };

  const addMonsters = (added: Monster[]) => setMonstersInCombat((prev) => [...prev, ...added]);

  return {
    searchQuery,
    setSearchQuery,
    monsterTypes,
    setMonsterTypes,
    alignments,
    setAlignments,
    sizes,
    setSizes,
    playerLevel,
    setPlayerLevel,
    partySize,
    setPartySize,
    difficulty,
    setDifficulty,
    experience,
    setExperience,
    xpBudget,
    determineMonstersInEncounter,
    clearEncounter,
    monstersInCombat,
    rerollGroups,
    removeGroups,
    setGroupCount,
    addMonsters,
  };
}

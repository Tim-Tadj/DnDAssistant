import React from 'react';
import monsters from '../../res/resources/monster_manual_monsters.json';
import {
  DIFFICULTIES,
  ENCOUNTER_MULTIPLIERS,
  EXPERIENCE_THRESHOLDS,
  MAX_EXPERIENCE,
  MIN_EXPERIENCE,
} from '../constants';
import { Monster } from '../types/Monster';

const getMonsterXP = (monster: Monster) => {
  return Number(monster.Challenge.split('(')[1].replace(/[^0-9.]/g, ''));
};

export default function useGenerateEncounter() {
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [monsterTypes, setMonsterTypes] = React.useState<string[]>([]);
  const [alignments, setAlignments] = React.useState<string[]>([]);
  const [sizes, setSizes] = React.useState<string[]>([]);
  const [playerLevel, setPlayerLevel] = React.useState<number>(1);
  const [partySize, setPartySize] = React.useState<number>(1);
  const [difficulty, setDifficulty] = React.useState<string>('Easy');
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
        monster.name.toLowerCase().includes(query.toLowerCase())
      );
  };
  const filterMonsterByExperience = (monster: Monster) => {
    const monsterExperience = getMonsterXP(monster);
    return (
      experience[0] <= monsterExperience && monsterExperience <= experience[1]
    );
  };

  const determineMonstersInEncounter = () => {
    const maxExperienceThreshold =
      EXPERIENCE_THRESHOLDS[playerLevel][
      DIFFICULTIES.findIndex((diff) => diff === difficulty)
      ] * partySize;

    let potentialMonsters = monsters.filter(
      (rawMonster) => {
        const monster = rawMonster as Monster;
        return filterMonsterByExperience(monster) &&
          filterMonsterByType(monster) &&
          filterMonsterByAlignment(monster) &&
          filterMonsterBySize(monster) &&
          filterByKeywordSearch(monster) &&
          getMonsterXP(monster) <= maxExperienceThreshold
      }
    );
    let experienceThreshold = maxExperienceThreshold;
    let multiplier = 1;

    // Determine potential combatants
    const monstersInCombat: Monster[] = [];
    while (experienceThreshold > 0 && potentialMonsters.length > 0) {
      const monsterIndex = Math.floor(Math.random() * potentialMonsters.length);
      const monster = potentialMonsters[monsterIndex] as Monster;
      monstersInCombat.push(monster);

      // Adjust experience threshold accounting for monster groups
      multiplier =
        ENCOUNTER_MULTIPLIERS.find(
          (encounterMultiplier) =>
            monstersInCombat.length + 1 <=
            encounterMultiplier.numberOfMonsters ||
            encounterMultiplier.numberOfMonsters === 15
        )?.multiplier ?? 1;
      const usedXPBudget = monstersInCombat.reduce(
        (accumulator, monster) => (accumulator += getMonsterXP(monster)),
        0
      );
      experienceThreshold = maxExperienceThreshold - usedXPBudget * multiplier;
      potentialMonsters = potentialMonsters.filter(
        (monster) => getMonsterXP(monster as Monster) <= experienceThreshold / multiplier
      );
    }
    setMonstersInCombat(monstersInCombat);
  };

  return {
    searchQuery,
    setSearchQuery,
    setMonsterTypes,
    setAlignments,
    setSizes,
    playerLevel,
    setPlayerLevel,
    partySize,
    setPartySize,
    difficulty,
    setDifficulty,
    experience,
    setExperience,
    determineMonstersInEncounter,
    monstersInCombat,
  };
}

// Combat state: combatants in initiative order, current turn index, round.

import { useCallback, useEffect, useState } from 'react';
import { Monster } from '../types/Monster';
import { v4 as uuidv4 } from 'uuid';

export type RemainingMonster = {
  uuid: string;
  name: string;
  maxHP: string;
  hp: number | null;
  ac: number;
  initiative: number;
  conditions: string[];
};

const createRemainingMonster = (monster: Monster): RemainingMonster => {
  const modifier = parseInt(monster.DEX_mod.replace(/([(+)])/g, ''), 10);
  const initiative = Math.floor(Math.random() * 20) + 1 + (isNaN(modifier) ? 0 : modifier);
  return {
    uuid: uuidv4(),
    name: monster.name,
    maxHP: monster.HP,
    hp: parseInt(monster.HP, 10) || 0,
    ac: parseInt(monster.AC, 10) || 10,
    initiative,
    conditions: [],
  };
};

const getMonstersFromEncounter = (monsters: Monster[]): RemainingMonster[] => {
  return monsters
    .map(createRemainingMonster)
    .sort((a, b) => b.initiative - a.initiative);
};

const useTrackEncounter = (monstersInCombat: Monster[]) => {
  const [remainingMonsters, setRemainingMonsters] = useState(
    getMonstersFromEncounter(monstersInCombat)
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [round, setRound] = useState(1);

  useEffect(() => {
    const next = getMonstersFromEncounter(monstersInCombat);
    setRemainingMonsters(next);
    setCurrentIndex(0);
    setRound(1);
  }, [monstersInCombat]);

  const onUpdateHealth = useCallback(
    (uuid: string, newHealth: number) => {
      setRemainingMonsters((prev) =>
        prev.map((m) => (m.uuid === uuid ? { ...m, hp: isNaN(newHealth) ? 0 : newHealth } : m))
      );
    },
    []
  );

  const onDeleteMonster = useCallback(
    (monster: RemainingMonster) => {
      setRemainingMonsters((prev) => {
        const filtered = prev.filter((m) => m.uuid !== monster.uuid);
        // Adjust the current index so it stays valid
        const removedBefore = prev.findIndex((m) => m.uuid === monster.uuid);
        if (removedBefore !== -1 && removedBefore < currentIndex) {
          setCurrentIndex((i) => Math.max(0, i - 1));
        }
        return filtered;
      });
    },
    [currentIndex]
  );

  const onAddMonsters = useCallback((monsters: Monster[]) => {
    setRemainingMonsters((prev) => [
      ...prev,
      ...monsters.map(createRemainingMonster),
    ].sort((a, b) => b.initiative - a.initiative));
  }, []);

  const onToggleCondition = useCallback(
    (uuid: string, condition: string) => {
      setRemainingMonsters((prev) =>
        prev.map((m) => {
          if (m.uuid !== uuid) return m;
          const has = m.conditions.includes(condition);
          return {
            ...m,
            conditions: has
              ? m.conditions.filter((c) => c !== condition)
              : [...m.conditions, condition],
          };
        })
      );
    },
    []
  );

  const nextTurn = useCallback(() => {
    setCurrentIndex((i) => {
      const next = i + 1;
      if (next >= remainingMonsters.length) {
        setRound((r) => r + 1);
        return 0;
      }
      return next;
    });
  }, [remainingMonsters.length]);

  const reset = useCallback(() => {
    setRemainingMonsters(getMonstersFromEncounter(monstersInCombat));
    setCurrentIndex(0);
    setRound(1);
  }, [monstersInCombat]);

  const identifiedMonster: Monster | null = null;

  return {
    remainingMonsters,
    identifiedMonster,
    onAddMonsters,
    onDeleteMonster,
    onUpdateHealth,
    onToggleCondition,
    currentIndex,
    nextTurn,
    reset,
    round,
  };
};

export default useTrackEncounter;

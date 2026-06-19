// Combat state: combatants in initiative order, current turn index, round.
// Phase 9: also accepts a party of PCs (one-shot per character) so
// the tracker can include the players.

import { useCallback, useEffect, useState } from 'react';
import { Monster } from '../types/Monster';
import { Character } from '../types/Character';
import { v4 as uuidv4 } from 'uuid';

export type RemainingMonster = {
  uuid: string;
  name: string;
  maxHP: string;
  hp: number | null;
  ac: number;
  initiative: number;
  conditions: string[];
  isPC: boolean;
  character_id?: string;
};

const createRemainingMonster = (monster: Monster): RemainingMonster => {
  const dex = parseInt(monster.dex_mod?.replace(/([(+)])/g, '') ?? '0', 10);
  const initiative = Math.floor(Math.random() * 20) + 1 + (isNaN(dex) ? 0 : dex);
  return {
    uuid: uuidv4(),
    name: monster.name,
    maxHP: monster.hp,
    hp: parseInt(monster.hp, 10) || 0,
    ac: parseInt(monster.ac, 10) || 10,
    initiative,
    conditions: [],
    isPC: false,
  };
};

const createRemainingPC = (c: Character): RemainingMonster => {
  // Crude DEX modifier: take the dex score, compute mod.
  const dexScore = c.dex ?? 10;
  const dexMod = Math.floor((dexScore - 10) / 2);
  const initiative = Math.floor(Math.random() * 20) + 1 + dexMod;
  return {
    uuid: uuidv4(),
    name: c.name,
    maxHP: `${c.hp_max ?? 10}`,
    hp: c.hp_max ?? 10,
    ac: c.ac ?? 10,
    initiative,
    conditions: [],
    isPC: true,
    character_id: c.id,
  };
};

const getMonstersFromEncounter = (monsters: Monster[]): RemainingMonster[] => {
  return monsters
    .map(createRemainingMonster)
    .sort((a, b) => b.initiative - a.initiative);
};

const getPCsFromParty = (party: Character[]): RemainingMonster[] => {
  return party
    .map(createRemainingPC)
    .sort((a, b) => b.initiative - a.initiative);
};

const useTrackEncounter = (
  monstersInCombat: Monster[],
  party: Character[] = []
) => {
  const [remainingMonsters, setRemainingMonsters] = useState(
    getMonstersFromEncounter(monstersInCombat)
  );
  const [partyCharacters] = useState(party);
  const [pcsAdded, setPcsAdded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [round, setRound] = useState(1);

  useEffect(() => {
    // Monsters reset whenever the input list changes. PCs are
    // re-added only if the user toggles "Add PCs".
    const next = getMonstersFromEncounter(monstersInCombat);
    setRemainingMonsters(next);
    setCurrentIndex(0);
    setRound(1);
    setPcsAdded(false);
  }, [monstersInCombat]);

  const addPCs = useCallback(() => {
    setRemainingMonsters((prev) => {
      const next = [...prev, ...getPCsFromParty(partyCharacters)];
      return next.sort((a, b) => b.initiative - a.initiative);
    });
    setPcsAdded(true);
  }, [partyCharacters]);

  const removePCs = useCallback(() => {
    setRemainingMonsters((prev) => prev.filter((m) => !m.isPC));
    setPcsAdded(false);
  }, []);

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
    const next = getMonstersFromEncounter(monstersInCombat);
    setRemainingMonsters(next);
    setCurrentIndex(0);
    setRound(1);
    setPcsAdded(false);
  }, [monstersInCombat]);

  return {
    remainingMonsters,
    onAddMonsters,
    onDeleteMonster,
    onUpdateHealth,
    onToggleCondition,
    addPCs,
    removePCs,
    pcsAdded,
    currentIndex,
    nextTurn,
    reset,
    round,
  };
};

export default useTrackEncounter;

import { useCallback, useEffect, useState } from 'react';
import { Monster } from '../types/Monster';
import { v4 as uuidv4 } from 'uuid';
import useMonsters from './use-monsters';

type RemainingMonster = {
  uuid: string;
  name: string;
  maxHP: string;
  hp: number | null;
  ac: number;
  initiative: number;
};

const createRemainingMonster = (monster: Monster): RemainingMonster => {
  const modifier = parseInt(monster.DEX_mod.replace(/([(+)])/g, ''));
  const initiative = Math.floor(Math.random() * 20) + modifier;
  return {
    uuid: uuidv4(),
    name: monster.name,
    maxHP: monster.HP,
    hp: parseInt(monster.HP),
    ac: parseInt(monster.AC),
    initiative,
  };
};

const getMonstersFromEncounter = (monsters: Monster[]): RemainingMonster[] => {
  return monsters
    .map((monster) => createRemainingMonster(monster))
    .sort((a, b) => (a.initiative < b.initiative ? 1 : -1));
};

const useTrackEncounter = (monstersInCombat: Monster[]) => {
  const { monsters } = useMonsters();
  const [remainingMonsters, setRemainingMonsters] = useState(
    getMonstersFromEncounter(monstersInCombat)
  );
  const [selectedMonster, setSelectedMonster] =
    useState<RemainingMonster | null>(remainingMonsters[0]);
  const [pageNumber, setPageNumber] = useState(0);

  useEffect(() => {
    const monstersInEncounter = getMonstersFromEncounter(monstersInCombat);
    setRemainingMonsters(monstersInEncounter);
    setSelectedMonster(monstersInEncounter[0]);
  }, [monstersInCombat]);

  const onUpdateHealth = useCallback(
    (uuid: string, newHealth: number) => {
      const newRemainingMonsters = [...remainingMonsters];
      const index = newRemainingMonsters.findIndex(
        (monster) => monster.uuid === uuid
      );
      newRemainingMonsters[index].hp = isNaN(newHealth) ? null : newHealth;
      setRemainingMonsters(newRemainingMonsters);
    },
    [remainingMonsters, setRemainingMonsters]
  );

  const onDeleteMonster = useCallback(
    (monster: RemainingMonster) => {
      if (selectedMonster?.uuid === monster.uuid) {
        setSelectedMonster(null);
      }
      const filteredRemainingMonsters = remainingMonsters.filter(
        (remainingMonster) => remainingMonster.uuid !== monster.uuid
      );
      setRemainingMonsters(filteredRemainingMonsters);
    },
    [
      selectedMonster,
      remainingMonsters,
      setRemainingMonsters,
    ]
  );

  const onAddMonsters = useCallback(
    (monsters: Monster[]) => {
      const newRemainingMonsters = [
        ...remainingMonsters,
        ...monsters.map(createRemainingMonster),
      ];
      setRemainingMonsters(newRemainingMonsters);
      setSelectedMonster(newRemainingMonsters[0]);
    },
    [remainingMonsters, setRemainingMonsters, setSelectedMonster]
  );

  const identifiedMonster = (monsters ?? []).find(
    (monster) => selectedMonster?.name === monster.name
  );

  return {
    remainingMonsters,
    identifiedMonster,
    onAddMonsters,
    onDeleteMonster,
    setSelectedMonster,
    onUpdateHealth,
    pageNumber,
    setPageNumber,
  };
};

export default useTrackEncounter;

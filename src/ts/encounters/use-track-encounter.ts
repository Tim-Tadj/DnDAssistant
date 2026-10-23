// Combat state: combatants in initiative order, current turn, round.
// Also accepts a party of PCs so the tracker can include the players,
// either on demand ("Add party") or automatically when an encounter
// starts. Bulk operations (damage/heal, conditions, remove) take a
// list of uuids so the tracker's multi-select can drive them.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

export const maxHpOf = (m: RemainingMonster) => parseInt(m.maxHP.split(' ')[0], 10) || 0;

const rollD20 = () => Math.floor(Math.random() * 20) + 1;

const dexModOf = (monster: Monster) => {
  const dex = parseInt(monster.dex_mod?.replace(/([(+)])/g, '') ?? '0', 10);
  return isNaN(dex) ? 0 : dex;
};

const createRemainingMonster = (monster: Monster, initiative?: number): RemainingMonster => ({
  uuid: uuidv4(),
  name: monster.name,
  maxHP: monster.hp,
  hp: parseInt(monster.hp, 10) || 0,
  ac: parseInt(monster.ac, 10) || 10,
  initiative: initiative ?? rollD20() + dexModOf(monster),
  conditions: [],
  isPC: false,
});

const createRemainingPC = (c: Character): RemainingMonster => {
  const dexMod = Math.floor(((c.dex ?? 10) - 10) / 2);
  return {
    uuid: uuidv4(),
    name: c.name,
    maxHP: `${c.hp_max ?? 10}`,
    hp: c.hp_max ?? 10,
    ac: c.ac ?? 10,
    initiative: rollD20() + dexMod,
    conditions: [],
    isPC: true,
    character_id: c.id,
  };
};

const byInitiative = (a: RemainingMonster, b: RemainingMonster) => b.initiative - a.initiative;

// With `group` on, every monster sharing a name acts on one roll.
const rollMonsters = (monsters: Monster[], group: boolean): RemainingMonster[] => {
  const shared = new Map<string, number>();
  return monsters.map((m) => {
    if (!group) return createRemainingMonster(m);
    if (!shared.has(m.name)) shared.set(m.name, rollD20() + dexModOf(m));
    return createRemainingMonster(m, shared.get(m.name));
  });
};

type Options = {
  autoAddParty?: boolean;
  groupInitiative?: boolean;
};

const useTrackEncounter = (
  monstersInCombat: Monster[],
  party: Character[] = [],
  { autoAddParty = false, groupInitiative = false }: Options = {},
) => {
  // The party is fetched asynchronously by the caller; read it through
  // a ref so callbacks always see the latest list.
  const partyRef = useRef(party);
  partyRef.current = party;

  const [combatants, setCombatants] = useState<RemainingMonster[]>([]);
  const [currentUuid, setCurrentUuid] = useState<string | null>(null);
  const [round, setRound] = useState(1);
  const [pcsAdded, setPcsAdded] = useState(false);
  const autoAddedRef = useRef(false);

  const build = useCallback(
    (withPCs: boolean) => {
      const monsters = rollMonsters(monstersInCombat, groupInitiative);
      const pcs = withPCs ? partyRef.current.map(createRemainingPC) : [];
      const next = [...monsters, ...pcs].sort(byInitiative);
      setCombatants(next);
      setCurrentUuid(next[0]?.uuid ?? null);
      setRound(1);
      setPcsAdded(withPCs && pcs.length > 0);
      autoAddedRef.current = withPCs && pcs.length > 0;
    },
    [monstersInCombat, groupInitiative],
  );

  // A new encounter (from Build, Library or "End encounter") restarts
  // combat. Monsters appended to the running fight ("Add to current
  // fight") just roll initiative and join, keeping HP, round and turn.
  const prevMonstersRef = useRef<Monster[]>([]);
  useEffect(() => {
    const prev = prevMonstersRef.current;
    prevMonstersRef.current = monstersInCombat;
    const appended =
      prev.length > 0 &&
      monstersInCombat.length > prev.length &&
      prev.every((m, i) => monstersInCombat[i] === m);
    if (appended) {
      const joining = rollMonsters(monstersInCombat.slice(prev.length), groupInitiative);
      setCombatants((cur) => [...cur, ...joining].sort(byInitiative));
      return;
    }
    build(autoAddParty && monstersInCombat.length > 0);
  }, [monstersInCombat]);

  // The party usually arrives after the encounter does; add it once.
  useEffect(() => {
    if (!autoAddParty || autoAddedRef.current) return;
    if (monstersInCombat.length === 0 || party.length === 0) return;
    autoAddedRef.current = true;
    setCombatants((prev) => [...prev, ...party.map(createRemainingPC)].sort(byInitiative));
    setPcsAdded(true);
  }, [party, autoAddParty, monstersInCombat.length]);

  const currentIndex = useMemo(() => {
    const i = combatants.findIndex((c) => c.uuid === currentUuid);
    return i === -1 ? 0 : i;
  }, [combatants, currentUuid]);

  // Removing combatants keeps the turn on whoever acts next.
  const removeMany = useCallback(
    (uuids: string[]) => {
      const gone = new Set(uuids);
      const next = combatants.filter((c) => !gone.has(c.uuid));
      if (currentUuid && gone.has(currentUuid)) {
        const after = combatants.slice(currentIndex + 1).find((c) => !gone.has(c.uuid));
        setCurrentUuid(after?.uuid ?? next[0]?.uuid ?? null);
      }
      setCombatants(next);
      if (!next.some((c) => c.isPC)) setPcsAdded(false);
    },
    [combatants, currentUuid, currentIndex],
  );

  const addPCs = useCallback(() => {
    const pcs = partyRef.current.map(createRemainingPC);
    if (pcs.length === 0) return;
    setCombatants((prev) => {
      const next = [...prev, ...pcs].sort(byInitiative);
      if (prev.length === 0) setCurrentUuid(next[0].uuid);
      return next;
    });
    setPcsAdded(true);
  }, []);

  const removePCs = useCallback(() => {
    removeMany(combatants.filter((c) => c.isPC).map((c) => c.uuid));
  }, [combatants, removeMany]);

  const onAddMonsters = useCallback(
    (monsters: Monster[]) => {
      const added = rollMonsters(monsters, groupInitiative);
      setCombatants((prev) => {
        const next = [...prev, ...added].sort(byInitiative);
        if (prev.length === 0) setCurrentUuid(next[0]?.uuid ?? null);
        return next;
      });
    },
    [groupInitiative],
  );

  const setHp = useCallback((uuid: string, hp: number) => {
    setCombatants((prev) =>
      prev.map((m) => (m.uuid === uuid ? { ...m, hp: Math.max(0, Math.min(maxHpOf(m), isNaN(hp) ? 0 : hp)) } : m)),
    );
  }, []);

  // Positive delta heals, negative damages; clamped to 0..max.
  const applyHpDelta = useCallback((uuids: string[], delta: number) => {
    const ids = new Set(uuids);
    setCombatants((prev) =>
      prev.map((m) =>
        ids.has(m.uuid) ? { ...m, hp: Math.max(0, Math.min(maxHpOf(m), (m.hp ?? 0) + delta)) } : m,
      ),
    );
  }, []);

  const addCondition = useCallback((uuids: string[], condition: string) => {
    const ids = new Set(uuids);
    setCombatants((prev) =>
      prev.map((m) =>
        ids.has(m.uuid) && !m.conditions.includes(condition)
          ? { ...m, conditions: [...m.conditions, condition] }
          : m,
      ),
    );
  }, []);

  const removeCondition = useCallback((uuid: string, condition: string) => {
    setCombatants((prev) =>
      prev.map((m) => (m.uuid === uuid ? { ...m, conditions: m.conditions.filter((c) => c !== condition) } : m)),
    );
  }, []);

  const nextTurn = useCallback(() => {
    if (combatants.length === 0) return;
    const next = currentIndex + 1;
    if (next >= combatants.length) {
      setRound((r) => r + 1);
      setCurrentUuid(combatants[0].uuid);
    } else {
      setCurrentUuid(combatants[next].uuid);
    }
  }, [combatants, currentIndex]);

  // Re-roll initiative and restore HP, keeping the party if it was in.
  const reset = useCallback(() => build(pcsAdded), [build, pcsAdded]);

  return {
    remainingMonsters: combatants,
    onAddMonsters,
    removeMany,
    setHp,
    applyHpDelta,
    addCondition,
    removeCondition,
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

// Combat state: combatants in initiative order, current turn, round.
// Also accepts a party of PCs so the tracker can include the players,
// either on demand ("Add party") or automatically when an encounter
// starts. Bulk operations (damage/heal, conditions, remove) take a
// list of uuids so the tracker's multi-select can drive them.
//
// Every change is also written to a combat log, and `results()` gives
// each combatant's final state (including ones removed mid-fight), so
// a finished fight can be recorded as what actually happened.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Monster } from '../types/Monster';
import { Character } from '../types/Character';
import { CombatantResult, EncounterLogEntry } from '../types/EncounterSave';
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

const clampHp = (m: RemainingMonster, hp: number) => Math.max(0, Math.min(maxHpOf(m), isNaN(hp) ? 0 : hp));

const toResult = (m: RemainingMonster): CombatantResult => ({
  name: m.name,
  isPC: m.isPC,
  hp: m.hp ?? 0,
  max_hp: maxHpOf(m),
  conditions: m.conditions,
  defeated: (m.hp ?? 0) <= 0,
});

const names = (ms: RemainingMonster[]) => ms.map((m) => m.name).join(', ');
const initiatives = (ms: RemainingMonster[]) => ms.map((m) => `${m.name} ${m.initiative}`).join(', ');

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

  const [combatants, setCombatantsState] = useState<RemainingMonster[]>([]);
  const [currentUuid, setCurrentUuid] = useState<string | null>(null);
  const [round, setRound] = useState(1);
  const [pcsAdded, setPcsAdded] = useState(false);
  const autoAddedRef = useRef(false);
  const [log, setLog] = useState<EncounterLogEntry[]>([]);
  // Combatants removed mid-fight, as they were when removed.
  const removedRef = useRef<RemainingMonster[]>([]);

  // Handlers read the latest combatants and round through refs, so two
  // quick actions before a re-render both see the newest state and the
  // log matches what happened.
  const combatantsRef = useRef(combatants);
  const roundRef = useRef(round);
  const setCombatants = useCallback((next: RemainingMonster[]) => {
    combatantsRef.current = next;
    setCombatantsState(next);
  }, []);
  const note = useCallback((kind: EncounterLogEntry['kind'], text: string) => {
    setLog((prev) => [...prev, { round: roundRef.current, kind, text }]);
  }, []);

  const build = useCallback(
    (withPCs: boolean) => {
      const monsters = rollMonsters(monstersInCombat, groupInitiative);
      const pcs = withPCs ? partyRef.current.map(createRemainingPC) : [];
      const next = [...monsters, ...pcs].sort(byInitiative);
      setCombatants(next);
      setCurrentUuid(next[0]?.uuid ?? null);
      setRound(1);
      roundRef.current = 1;
      setPcsAdded(withPCs && pcs.length > 0);
      autoAddedRef.current = withPCs && pcs.length > 0;
      removedRef.current = [];
      setLog(next.length > 0 ? [{ round: 1, kind: 'start', text: `Initiative: ${initiatives(next)}` }] : []);
    },
    [monstersInCombat, groupInitiative, setCombatants],
  );

  // A new encounter (from Build, Library or "End encounter") restarts
  // combat. Monsters appended to the running fight ("Add to current
  // fight", or the tracker's own picker) just roll initiative and join,
  // keeping HP, round and turn.
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
      setCombatants([...combatantsRef.current, ...joining].sort(byInitiative));
      note('join', `Joins the fight: ${initiatives(joining)}`);
      return;
    }
    build(autoAddParty && monstersInCombat.length > 0);
  }, [monstersInCombat]);

  // The party usually arrives after the encounter does; add it once.
  useEffect(() => {
    if (!autoAddParty || autoAddedRef.current) return;
    if (monstersInCombat.length === 0 || party.length === 0) return;
    autoAddedRef.current = true;
    const pcs = party.map(createRemainingPC);
    setCombatants([...combatantsRef.current, ...pcs].sort(byInitiative));
    setPcsAdded(true);
    note('join', `Party joins: ${initiatives(pcs)}`);
  }, [party, autoAddParty, monstersInCombat.length]);

  const currentIndex = useMemo(() => {
    const i = combatants.findIndex((c) => c.uuid === currentUuid);
    return i === -1 ? 0 : i;
  }, [combatants, currentUuid]);

  // Removing combatants keeps the turn on whoever acts next.
  const removeMany = useCallback(
    (uuids: string[]) => {
      const gone = new Set(uuids);
      const all = combatantsRef.current;
      const leaving = all.filter((c) => gone.has(c.uuid));
      if (leaving.length === 0) return;
      const next = all.filter((c) => !gone.has(c.uuid));
      if (currentUuid && gone.has(currentUuid)) {
        const i = all.findIndex((c) => c.uuid === currentUuid);
        const after = all.slice(i + 1).find((c) => !gone.has(c.uuid));
        setCurrentUuid(after?.uuid ?? next[0]?.uuid ?? null);
      }
      setCombatants(next);
      removedRef.current = [...removedRef.current, ...leaving];
      note('remove', `Removed: ${names(leaving)}`);
      if (!next.some((c) => c.isPC)) setPcsAdded(false);
    },
    [currentUuid, setCombatants, note],
  );

  const addPCs = useCallback(() => {
    const pcs = partyRef.current.map(createRemainingPC);
    if (pcs.length === 0) return;
    const prev = combatantsRef.current;
    const next = [...prev, ...pcs].sort(byInitiative);
    setCombatants(next);
    if (prev.length === 0) setCurrentUuid(next[0].uuid);
    setPcsAdded(true);
    note('join', `Party joins: ${initiatives(pcs)}`);
  }, [setCombatants, note]);

  const removePCs = useCallback(() => {
    removeMany(combatantsRef.current.filter((c) => c.isPC).map((c) => c.uuid));
  }, [removeMany]);

  // Sets each target's HP and logs the change (and anyone dropping to 0).
  const changeHp = useCallback(
    (uuids: string[], hpFor: (m: RemainingMonster) => number) => {
      const ids = new Set(uuids);
      const entries: Array<[EncounterLogEntry['kind'], string]> = [];
      const next = combatantsRef.current.map((m) => {
        if (!ids.has(m.uuid)) return m;
        const before = m.hp ?? 0;
        const after = clampHp(m, hpFor(m));
        if (after === before) return m;
        const diff = Math.abs(after - before);
        entries.push(
          after < before
            ? ['damage', `${m.name} takes ${diff} damage (${before} → ${after})`]
            : ['heal', `${m.name} heals ${diff} (${before} → ${after})`],
        );
        if (after === 0) entries.push(['down', `${m.name} is down`]);
        return { ...m, hp: after };
      });
      if (entries.length === 0) return;
      setCombatants(next);
      entries.forEach(([kind, text]) => note(kind, text));
    },
    [setCombatants, note],
  );

  const setHp = useCallback((uuid: string, hp: number) => changeHp([uuid], () => hp), [changeHp]);

  // Positive delta heals, negative damages; clamped to 0..max.
  const applyHpDelta = useCallback(
    (uuids: string[], delta: number) => changeHp(uuids, (m) => (m.hp ?? 0) + delta),
    [changeHp],
  );

  const addCondition = useCallback(
    (uuids: string[], condition: string) => {
      const ids = new Set(uuids);
      const gaining = combatantsRef.current.filter((m) => ids.has(m.uuid) && !m.conditions.includes(condition));
      if (gaining.length === 0) return;
      const gainingIds = new Set(gaining.map((m) => m.uuid));
      setCombatants(
        combatantsRef.current.map((m) =>
          gainingIds.has(m.uuid) ? { ...m, conditions: [...m.conditions, condition] } : m,
        ),
      );
      note('condition', `${names(gaining)}: ${condition}`);
    },
    [setCombatants, note],
  );

  const removeCondition = useCallback(
    (uuid: string, condition: string) => {
      const m = combatantsRef.current.find((c) => c.uuid === uuid);
      if (!m || !m.conditions.includes(condition)) return;
      setCombatants(
        combatantsRef.current.map((c) =>
          c.uuid === uuid ? { ...c, conditions: c.conditions.filter((x) => x !== condition) } : c,
        ),
      );
      note('condition', `${m.name}: no longer ${condition}`);
    },
    [setCombatants, note],
  );

  const nextTurn = useCallback(() => {
    if (combatants.length === 0) return;
    const next = currentIndex + 1;
    if (next >= combatants.length) {
      const r = round + 1;
      setRound(r);
      roundRef.current = r;
      note('round', `Round ${r}`);
      setCurrentUuid(combatants[0].uuid);
    } else {
      setCurrentUuid(combatants[next].uuid);
    }
  }, [combatants, currentIndex, round, note]);

  // Re-roll initiative and restore HP, keeping the party if it was in.
  const reset = useCallback(() => build(pcsAdded), [build, pcsAdded]);

  // Final state of everyone who took part, removed combatants included.
  const results = useCallback(
    (): CombatantResult[] => [...combatantsRef.current, ...removedRef.current].map(toResult),
    [],
  );

  return {
    remainingMonsters: combatants,
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
    log,
    results,
  };
};

export type Tracker = ReturnType<typeof useTrackEncounter>;

export default useTrackEncounter;

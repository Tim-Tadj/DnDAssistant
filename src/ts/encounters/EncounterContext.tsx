// Phase 9: the encounter state. The encounter generator (Builder
// tab) and the live combat tracker (Live tab) need to share state:
// the Builder fills in `monstersInCombat` (the generated list of
// Monster objects), and the Live tracker reads it to roll
// initiative, track HP, manage turns.
//
// We also keep `currentEncounterName` and `currentEncounterId` so
// the Live tab can show "running: <name>" and the Builder can
// "Save this encounter" with the right context.

import React, { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { Monster } from '../types/Monster';

export type EncounterState = {
  // The list of monsters the user has assembled (from Generate,
  // add-monster, or load-from-library). Each entry in the list
  // is a Monster with full stat block; the Live tracker re-rolls
  // initiative and starts HP from this.
  monstersInCombat: Monster[];

  // The save id, if this encounter was loaded from / saved to the
  // library. null = scratch.
  currentEncounterId: string | null;
  currentEncounterName: string;

  setMonsters: (m: Monster[]) => void;
  addMonsters: (m: Monster[]) => void;
  clear: () => void;
  loadFromSave: (id: string, name: string, monsters: Monster[]) => void;
};

const Ctx = createContext<EncounterState | null>(null);

export function EncounterProvider({ children }: { children: ReactNode }) {
  const [monstersInCombat, setMonstersInCombat] = useState<Monster[]>([]);
  const [currentEncounterId, setCurrentEncounterId] = useState<string | null>(null);
  const [currentEncounterName, setCurrentEncounterName] = useState<string>('');

  const setMonsters = useCallback((m: Monster[]) => {
    setMonstersInCombat(m);
    setCurrentEncounterId(null);
    setCurrentEncounterName('');
  }, []);

  const addMonsters = useCallback((m: Monster[]) => {
    setMonstersInCombat((prev) => [...prev, ...m]);
  }, []);

  const clear = useCallback(() => {
    setMonstersInCombat([]);
    setCurrentEncounterId(null);
    setCurrentEncounterName('');
  }, []);

  const loadFromSave = useCallback((id: string, name: string, monsters: Monster[]) => {
    setMonstersInCombat(monsters);
    setCurrentEncounterId(id);
    setCurrentEncounterName(name);
  }, []);

  const value = useMemo<EncounterState>(
    () => ({
      monstersInCombat,
      currentEncounterId,
      currentEncounterName,
      setMonsters,
      addMonsters,
      clear,
      loadFromSave,
    }),
    [monstersInCombat, currentEncounterId, currentEncounterName, setMonsters, addMonsters, clear, loadFromSave],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEncounter(): EncounterState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useEncounter must be used within <EncounterProvider>');
  return ctx;
}

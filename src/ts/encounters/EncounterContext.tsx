// The running encounter, held at the app root so a fight survives
// navigating away (checking a spell or monster mid-combat) and can be
// started from anywhere (the Builder, the Library, a campaign's
// Encounters tab).
//
// - `monstersInCombat`: the monsters the fight was started with, plus
//   any that joined. The tracker rolls initiative and HP from this.
// - `meta`: which saved encounter this came from (if any), its name
//   and difficulty, so a finished fight can be recorded against it.
// - `mode`: `live` fights are recorded when they end; `practice` runs
//   are for the DM to test an encounter ahead of time and record
//   nothing.
// - `tracker`: the live combat state (turn order, HP, conditions,
//   round, combat log), from useTrackEncounter.

import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Monster } from '../types/Monster';
import { Character } from '../types/Character';
import { charactersApi } from '../api/characters';
import { useAuth } from '../auth/AuthContext';
import { useCampaignContext } from '../shared/CampaignContext';
import { useSettings } from '../shared/SettingsContext';
import useTrackEncounter, { Tracker } from './use-track-encounter';

export type EncounterMode = 'live' | 'practice';

export type EncounterMeta = {
  // The saved (planned) encounter this fight was loaded from; null = scratch.
  id: string | null;
  name: string;
  difficulty: string;
};

const SCRATCH: EncounterMeta = { id: null, name: '', difficulty: '' };

export type EncounterState = {
  monstersInCombat: Monster[];
  meta: EncounterMeta;
  mode: EncounterMode;
  setMode: (m: EncounterMode) => void;
  /** The active party's characters, for the tracker's "Add party". */
  party: Character[] | null;
  tracker: Tracker;

  /** Start a new fight (replacing any running one). */
  start: (monsters: Monster[], opts?: { meta?: Partial<EncounterMeta>; mode?: EncounterMode }) => void;
  /** Add monsters to the running fight. */
  addMonsters: (m: Monster[]) => void;
  clear: () => void;
};

const Ctx = createContext<EncounterState | null>(null);

export function EncounterProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { activeParty } = useCampaignContext();
  const { settings } = useSettings();
  const [monstersInCombat, setMonstersInCombat] = useState<Monster[]>([]);
  const [meta, setMeta] = useState<EncounterMeta>(SCRATCH);
  const [mode, setMode] = useState<EncounterMode>('live');
  const [party, setParty] = useState<Character[] | null>(null);

  // When there's an active party, fetch its members so the PCs can
  // join initiative alongside the monsters.
  useEffect(() => {
    if (!user || !activeParty) {
      setParty(null);
      return;
    }
    let alive = true;
    charactersApi
      .list()
      .then((all) => alive && setParty(all.filter((c) => c.id && activeParty.member_ids.includes(c.id))))
      .catch(() => alive && setParty(null));
    return () => {
      alive = false;
    };
  }, [user, activeParty]);

  const tracker = useTrackEncounter(monstersInCombat, party ?? undefined, {
    autoAddParty: settings.autoAddParty,
    groupInitiative: settings.groupInitiative,
  });

  const start = useCallback<EncounterState['start']>((monsters, opts = {}) => {
    setMonstersInCombat(monsters);
    setMeta({ ...SCRATCH, ...opts.meta });
    setMode(opts.mode ?? 'live');
  }, []);

  const addMonsters = useCallback((m: Monster[]) => {
    setMonstersInCombat((prev) => [...prev, ...m]);
  }, []);

  const clear = useCallback(() => {
    setMonstersInCombat([]);
    setMeta(SCRATCH);
    setMode('live');
  }, []);

  const value = useMemo<EncounterState>(
    () => ({ monstersInCombat, meta, mode, setMode, party, tracker, start, addMonsters, clear }),
    [monstersInCombat, meta, mode, party, tracker, start, addMonsters, clear],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEncounter(): EncounterState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useEncounter must be used within <EncounterProvider>');
  return ctx;
}

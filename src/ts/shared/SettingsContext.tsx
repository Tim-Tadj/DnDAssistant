// User preferences that used to live as always-visible controls on
// individual pages. Persisted per browser in localStorage; every read
// and write is guarded so a blocked storage just falls back to the
// defaults for this session.

import React, { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';

export type Settings = {
  // Encounters
  defaultDifficulty: string;
  autoAddParty: boolean;
  groupInitiative: boolean;
  confirmDestructive: boolean;
  showAdvancedFilters: boolean;
  // Layout
  contextOnReferencePages: boolean;
  showExampleWorld: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  defaultDifficulty: 'Medium',
  autoAddParty: true,
  groupInitiative: false,
  confirmDestructive: true,
  showAdvancedFilters: false,
  contextOnReferencePages: false,
  showExampleWorld: false,
};

const STORAGE_KEY = 'dndassistant.settings';

const load = (): Settings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

type SettingsState = {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
  dialogOpen: boolean;
  openDialog: () => void;
  closeDialog: () => void;
};

const Ctx = createContext<SettingsState | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(load);
  const [dialogOpen, setDialogOpen] = useState(false);

  const persist = (next: Settings) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage unavailable (private window, blocked site data): keep in memory only.
    }
  };

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      persist(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    persist(DEFAULT_SETTINGS);
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const openDialog = useCallback(() => setDialogOpen(true), []);
  const closeDialog = useCallback(() => setDialogOpen(false), []);

  const value = useMemo<SettingsState>(
    () => ({ settings, update, reset, dialogOpen, openDialog, closeDialog }),
    [settings, update, reset, dialogOpen, openDialog, closeDialog],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings(): SettingsState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSettings must be used within <SettingsProvider>');
  return ctx;
}

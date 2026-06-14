// Lightweight shared hook for fetching the full monster list from the API.
// Both the encounter generator and tracker consume this.
import { useCallback, useEffect, useState } from 'react';
import { monstersApi } from '../api/monsters';
import { Monster } from '../types/Monster';

export default function useMonsters() {
  const [monsters, setMonsters] = useState<Monster[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoadError(null);
    try {
      const data = await monstersApi.list();
      setMonsters(data);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
      setMonsters([]);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { monsters, loadError, reload };
}

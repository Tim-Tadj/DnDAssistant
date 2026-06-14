import { useCallback, useEffect, useState } from 'react';
import { monstersApi } from '../api/monsters';
import { Monster } from '../types/Monster';

/**
 * Shared hook for fetching the full monster list from the API. The
 * encounter generator and tracker both filter against this list at
 * click time, so we cache the result at the module/hook level and
 * reload on demand.
 */
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

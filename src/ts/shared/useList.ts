// Tiny useList hook factory used by the EntityBrowser. It calls the
// supplied list function once on mount and exposes reload() for refresh
// after mutations.

import { useCallback, useEffect, useState } from 'react';

export function useList<T>(list: () => Promise<T[]>) {
  const [items, setItems] = useState<T[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoadError(null);
    try {
      const data = await list();
      setItems(data);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
      setItems([]);
    }
  }, [list]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { items, loadError, reload };
}

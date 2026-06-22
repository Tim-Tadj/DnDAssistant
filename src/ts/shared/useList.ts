// Tiny useList hook factory used by the EntityBrowser. It calls the
// supplied list function once on mount and exposes reload() for refresh
// after mutations.
//
// IMPORTANT: callers commonly pass `useList(() => api.list())` — an
// inline arrow function that is a *new reference on every render*.
// If we put `list` in the reload callback's dependency array, that
// creates an infinite re-fetch loop (new ref → new reload → useEffect
// fires → setItems → re-render → repeat), throttled only by network
// latency. We avoid that by stashing `list` in a ref so `reload` stays
// stable for the lifetime of the component.

import { useCallback, useEffect, useRef, useState } from 'react';

export function useList<T>(list: () => Promise<T[]>) {
  const [items, setItems] = useState<T[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Always call the latest `list` without making it a useCallback dep.
  const listRef = useRef(list);
  listRef.current = list;

  const reload = useCallback(async () => {
    setLoadError(null);
    try {
      const data = await listRef.current();
      setItems(data);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
      setItems([]);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { items, loadError, reload };
}

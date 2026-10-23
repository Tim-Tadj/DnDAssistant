// Classes and races are static reference data: fetch them once per
// page load and share the result between every component that needs
// to turn a class_id / race_id into a name. A failed fetch isn't
// cached, so the next caller retries.

import { useEffect, useState } from 'react';
import { DndClass, Race } from '../types/Character';
import { referenceApi } from '../api/characters';

function once<T>(fetch: () => Promise<T[]>): () => Promise<T[]> {
  let pending: Promise<T[]> | null = null;
  return () => {
    if (!pending) {
      pending = fetch().catch((e) => {
        pending = null;
        throw e;
      });
    }
    return pending;
  };
}

export const loadClasses = once<DndClass>(referenceApi.listClasses);
export const loadRaces = once<Race>(referenceApi.listRaces);

function useLoaded<T>(load: () => Promise<T[]>, enabled: boolean): T[] {
  const [items, setItems] = useState<T[]>([]);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    load()
      .then((v) => alive && setItems(v))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [load, enabled]);
  return items;
}

export const useClasses = (enabled = true) => useLoaded(loadClasses, enabled);
export const useRaces = (enabled = true) => useLoaded(loadRaces, enabled);

export const classNameOf = (classes: DndClass[], id: number | null | undefined) =>
  classes.find((c) => c.id === id)?.name;

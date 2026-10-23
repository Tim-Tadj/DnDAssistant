// The Encounters page's active tab lives in the URL (`#/encounter?tab=run`)
// so any component on the page — or a link from elsewhere — can move the
// user to the next step instead of telling them to click a tab.

import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export type EncounterTab = 'build' | 'run' | 'library';

const TABS: EncounterTab[] = ['build', 'run', 'library'];

export function useEncounterTab(fallback: EncounterTab = 'build'): [EncounterTab, (t: EncounterTab) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab = TABS.includes(raw as EncounterTab) ? (raw as EncounterTab) : fallback;
  const setTab = useCallback(
    (t: EncounterTab) => {
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', t);
        return next;
      });
      window.scrollTo({ top: 0 });
    },
    [setParams],
  );
  return [tab, setTab];
}

// Loads a saved encounter into the tracker and opens the Run tab, from
// anywhere in the app (the Library, a campaign's Encounters tab, search).
// Asks before replacing a fight that's already running.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EncounterSave, isPlayed } from '../types/EncounterSave';
import { hydrateEncounterSave } from '../api/hydrate-encounter';
import { useSettings } from '../shared/SettingsContext';
import { useToast } from '../shared/ToastProvider';
import { useConfirm } from '../shared/useConfirm';
import { EncounterMode, useEncounter } from './EncounterContext';

export function useRunEncounter() {
  const enc = useEncounter();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { toast } = useToast();
  const { confirm, dialog } = useConfirm();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const run = async (save: EncounterSave, mode: EncounterMode) => {
    if (!save.id) return;
    if (enc.monstersInCombat.length > 0 && settings.confirmDestructive) {
      const ok = await confirm({
        title: 'Replace the running encounter?',
        body: `"${save.name}" will replace the fight that's currently in the tracker.`,
        confirmLabel: 'Replace',
      });
      if (!ok) return;
    }
    setLoadingId(save.id);
    try {
      const monsters = await hydrateEncounterSave(save);
      enc.start(monsters, {
        mode,
        meta: {
          // Re-running a played record counts against the prep it came from.
          id: isPlayed(save) ? save.source_id ?? null : save.id,
          name: save.name,
          difficulty: save.difficulty,
        },
      });
      navigate('/encounter?tab=run');
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setLoadingId(null);
    }
  };

  return { run, loadingId, dialog };
}

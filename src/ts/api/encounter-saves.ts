// Phase 8: Encounter-saves API client.

import { api } from './api-client';
import { EncounterSave } from '../types/EncounterSave';

export const encounterSavesApi = {
  list: () => api.get<EncounterSave[]>('/encounter-saves'),
  listForCampaign: (campaignId: string) =>
    api.get<EncounterSave[]>(`/campaigns/${campaignId}/encounters`),
  create: (s: EncounterSave) => api.post<EncounterSave>('/encounter-saves', s),
  remove: (id: string) => api.delete<void>(`/encounter-saves/${id}`),
};

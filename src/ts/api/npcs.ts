// Phase 8: Campaign-NPC API client. Nested under /campaigns/{id}/npcs.

import { api } from './api-client';
import { CampaignNpc } from '../types/CampaignNpc';

export const npcsApi = {
  list: (campaignId: string) => api.get<CampaignNpc[]>(`/campaigns/${campaignId}/npcs`),
  create: (campaignId: string, n: CampaignNpc) =>
    api.post<CampaignNpc>(`/campaigns/${campaignId}/npcs`, n),
  update: (campaignId: string, id: string, n: CampaignNpc) =>
    api.put<CampaignNpc>(`/campaigns/${campaignId}/npcs/${id}`, n),
  remove: (campaignId: string, id: string) =>
    api.delete<void>(`/campaigns/${campaignId}/npcs/${id}`),
};

// Phase 8: Campaign-sessions API client. Nested under /campaigns/{id}/sessions.

import { api } from './api-client';
import { CampaignSession } from '../types/CampaignSession';

export const sessionsApi = {
  list: (campaignId: string) => api.get<CampaignSession[]>(`/campaigns/${campaignId}/sessions`),
  create: (campaignId: string, s: CampaignSession) =>
    api.post<CampaignSession>(`/campaigns/${campaignId}/sessions`, s),
  update: (campaignId: string, id: string, s: CampaignSession) =>
    api.put<CampaignSession>(`/campaigns/${campaignId}/sessions/${id}`, s),
  remove: (campaignId: string, id: string) =>
    api.delete<void>(`/campaigns/${campaignId}/sessions/${id}`),
};

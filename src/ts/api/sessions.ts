// Phase 8: Campaign-sessions API client. Nested under /campaigns/{id}/sessions.

import { api } from './api-client';
import { CampaignSession } from '../types/CampaignSession';

export type EndSessionResult = { session: CampaignSession; next: CampaignSession; rolled_over: number };

export const sessionsApi = {
  list: (campaignId: string) => api.get<CampaignSession[]>(`/campaigns/${campaignId}/sessions`),
  create: (campaignId: string, s: CampaignSession) =>
    api.post<CampaignSession>(`/campaigns/${campaignId}/sessions`, s),
  update: (campaignId: string, id: string, s: Partial<CampaignSession>) =>
    api.put<CampaignSession>(`/campaigns/${campaignId}/sessions/${id}`, s),
  remove: (campaignId: string, id: string) =>
    api.delete<void>(`/campaigns/${campaignId}/sessions/${id}`),
  start: (campaignId: string, id: string, body: { played_on?: string; attendees?: string[] }) =>
    api.post<CampaignSession>(`/campaigns/${campaignId}/sessions/${id}/start`, body),
  end: (
    campaignId: string,
    id: string,
    body: { title?: string; summary?: string; next_session_on?: string | null },
  ) => api.post<EndSessionResult>(`/campaigns/${campaignId}/sessions/${id}/end`, body),
};

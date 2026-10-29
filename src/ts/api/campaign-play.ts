// The campaign timeline and threads (worker/migrations/0003).

import { api } from './api-client';
import { CampaignEvent, NewJot } from '../types/CampaignEvent';
import { CampaignThread } from '../types/CampaignThread';

export const eventsApi = {
  list: (campaignId: string, query: { session?: string; ref_kind?: string; ref_id?: string; tag?: string } = {}) => {
    const qs = new URLSearchParams(Object.entries(query).filter(([, v]) => v) as [string, string][]).toString();
    return api.get<CampaignEvent[]>(`/campaigns/${campaignId}/events${qs ? `?${qs}` : ''}`);
  },
  create: (campaignId: string, jot: NewJot) => api.post<CampaignEvent>(`/campaigns/${campaignId}/events`, jot),
  update: (campaignId: string, id: string, patch: Partial<NewJot>) =>
    api.put<CampaignEvent>(`/campaigns/${campaignId}/events/${id}`, patch),
  remove: (campaignId: string, id: string) => api.delete<void>(`/campaigns/${campaignId}/events/${id}`),
};

export const threadsApi = {
  list: (campaignId: string) => api.get<CampaignThread[]>(`/campaigns/${campaignId}/threads`),
  create: (campaignId: string, t: CampaignThread) => api.post<CampaignThread>(`/campaigns/${campaignId}/threads`, t),
  update: (campaignId: string, id: string, patch: Partial<CampaignThread> & { advance?: boolean }) =>
    api.put<CampaignThread>(`/campaigns/${campaignId}/threads/${id}`, patch),
  remove: (campaignId: string, id: string) => api.delete<void>(`/campaigns/${campaignId}/threads/${id}`),
};

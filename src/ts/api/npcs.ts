import { api } from './api-client';
import { CampaignNpc } from '../types/CampaignNpc';

// Global, per-user NPC roster. ?campaign=X filters by tag.
export const npcsApi = {
  list: (campaignId?: string) => {
    const qs = campaignId ? `?campaign=${encodeURIComponent(campaignId)}` : '';
    return api.get<CampaignNpc[]>(`/npcs${qs}`);
  },
  get: (id: string) => api.get<CampaignNpc>(`/npcs/${id}`),
  create: (n: CampaignNpc) => api.post<CampaignNpc>('/npcs', n),
  update: (id: string, n: CampaignNpc) => api.put<CampaignNpc>(`/npcs/${id}`, n),
  delete: (id: string) => api.delete<void>(`/npcs/${id}`),
};

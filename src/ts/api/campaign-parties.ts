import { api } from './api-client';
import { Party } from '../types/Party';

// Many-to-many link between a campaign and parties. The body for
// link is { party_id: string }.
export const campaignPartiesApi = {
  list: (campaignId: string) => api.get<Party[]>(`/campaigns/${campaignId}/parties`),
  link: (campaignId: string, partyId: string) =>
    api.post<Party>(`/campaigns/${campaignId}/parties`, { party_id: partyId }),
  unlink: (campaignId: string, partyId: string) =>
    api.delete<void>(`/campaigns/${campaignId}/parties/${partyId}`),
};

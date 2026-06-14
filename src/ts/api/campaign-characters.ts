import { api } from './api-client';
import { CampaignCharacter } from '../types/CampaignCharacter';

// Per-campaign character state. /campaigns/{id}/characters/{characterId}
// is the per-pair endpoint; the bare list is the whole campaign.
export const campaignCharactersApi = {
  list: (campaignId: string) =>
    api.get<CampaignCharacter[]>(`/campaigns/${campaignId}/characters`),
  get: (campaignId: string, characterId: string) =>
    api.get<CampaignCharacter>(`/campaigns/${campaignId}/characters/${characterId}`),
  upsert: (campaignId: string, characterId: string, body: CampaignCharacter) =>
    api.put<CampaignCharacter>(`/campaigns/${campaignId}/characters/${characterId}`, body),
  remove: (campaignId: string, characterId: string) =>
    api.delete<void>(`/campaigns/${campaignId}/characters/${characterId}`),
};

import { api } from './api-client';
import { Campaign } from '../types/Campaign';

export const campaignsApi = {
  list: () => api.get<Campaign[]>('/campaigns'),
  get: (id: string) => api.get<Campaign>(`/campaigns/${id}`),
  create: (c: Campaign) => api.post<Campaign>('/campaigns', c),
  update: (id: string, c: Campaign) => api.put<Campaign>(`/campaigns/${id}`, c),
  delete: (id: string) => api.delete<void>(`/campaigns/${id}`),
};

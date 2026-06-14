// Phase 8: Parties API client.

import { api } from './api-client';
import { Party } from '../types/Party';

export const partiesApi = {
  list: () => api.get<Party[]>('/parties'),
  get: (id: string) => api.get<Party>(`/parties/${id}`),
  create: (p: Party) => api.post<Party>('/parties', p),
  update: (id: string, p: Party) => api.put<Party>(`/parties/${id}`, p),
  remove: (id: string) => api.delete<void>(`/parties/${id}`),
};

import { api } from './api-client';
import { GearItem, GearKind } from '../types/Gear';

export const gearApi = {
  list: (kind?: GearKind) =>
    api.get<GearItem[]>(kind ? `/gear?kind=${kind}` : '/gear'),
  get: (id: number) => api.get<GearItem>(`/gear/${id}`),
  create: (item: GearItem) => api.post<GearItem>('/gear', item),
  update: (id: number, item: GearItem) => api.put<GearItem>(`/gear/${id}`, item),
  delete: (id: number) => api.delete<void>(`/gear/${id}`),
};

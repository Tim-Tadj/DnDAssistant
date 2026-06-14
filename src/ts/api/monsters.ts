import { api } from './api-client';
import { Monster } from '../types/Monster';

export const monstersApi = {
  list: () => api.get<Monster[]>('/monsters'),
  get: (id: number) => api.get<Monster>(`/monsters/${id}`),
  create: (monster: Monster) => api.post<Monster>('/monsters', monster),
  update: (id: number, monster: Monster) => api.put<Monster>(`/monsters/${id}`, monster),
  delete: (id: number) => api.delete<void>(`/monsters/${id}`),
};

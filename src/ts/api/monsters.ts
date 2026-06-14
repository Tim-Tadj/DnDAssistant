import { api } from './api-client';
import { Monster } from '../types/Monster';

export const monstersApi = {
  list: () => api.get<Monster[]>('/monsters'),
  get: (id: number) => api.get<Monster>(`/monsters/${id}`),
  create: (monster: Monster) => api.post<Monster>('/monsters', monster),
};

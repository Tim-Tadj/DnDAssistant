import { api } from './api-client';
import { Spell } from '../types/Spell';

export const spellsApi = {
  list: () => api.get<Spell[]>('/spells'),
  get: (id: number) => api.get<Spell>(`/spells/${id}`),
  create: (spell: Spell) => api.post<Spell>('/spells', spell),
  update: (id: number, spell: Spell) => api.put<Spell>(`/spells/${id}`, spell),
  delete: (id: number) => api.delete<void>(`/spells/${id}`),
};

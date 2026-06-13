import { api } from './api-client';
import { Spell } from '../types/Spell';

export const spellsApi = {
  list: () => api.get<Spell[]>('/spells'),
  get: (id: number) => api.get<Spell>(`/spells/${id}`),
  create: (spell: Spell) => api.post<Spell>('/spells', spell),
};

import { api } from './api-client';
import { Character, DndClass, Race } from '../types/Character';

export const charactersApi = {
  list: () => api.get<Character[]>('/characters'),
  get: (id: string) => api.get<Character>(`/characters/${id}`),
  create: (c: Character) => api.post<Character>('/characters', c),
  update: (id: string, c: Character) => api.put<Character>(`/characters/${id}`, c),
  delete: (id: string) => api.delete<void>(`/characters/${id}`),
};

export const referenceApi = {
  listClasses: () => api.get<DndClass[]>('/classes'),
  listRaces: () => api.get<Race[]>('/races'),
};

// Phase 8: Character-state API client. Nested under /characters/{id}/state.

import { api } from './api-client';
import { CharacterState } from '../types/CharacterState';

export const characterStateApi = {
  get: (id: string) => api.get<CharacterState>(`/characters/${id}/state`),
  update: (id: string, state: CharacterState) =>
    api.put<CharacterState>(`/characters/${id}/state`, state),
};

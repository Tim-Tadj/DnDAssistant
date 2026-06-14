// Phase 8: Helper to look up a class by id from the DndClass[] list.

import { DndClass } from '../types/Character';

export function getDndClass(classes: DndClass[], classId: number): DndClass | null {
  return classes.find((c) => c.id === classId) ?? null;
}

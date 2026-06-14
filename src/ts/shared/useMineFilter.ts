// Tiny helper: a single source of truth for the "My homebrew" filter
// chip state used by every EntityBrowser page.

import { useState } from 'react';

export function useMineFilter() {
  return useState(false);
}

// Opens an item named by `?open=<id>` in the URL (global search links
// to `/monsters?open=123`). Once the list has loaded and contains the
// item, calls `onOpen` and drops the param, so closing the item doesn't
// reopen it and Back returns to the page as it was.

import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useOpenParam<T>(
  items: T[] | null | undefined,
  getId: (item: T) => string | number | undefined | null,
  onOpen: (item: T) => void,
) {
  const [params, setParams] = useSearchParams();
  const open = params.get('open');

  useEffect(() => {
    if (!open || !items) return;
    const hit = items.find((it) => {
      const id = getId(it);
      return id !== undefined && id !== null && String(id) === open;
    });
    if (!hit) return;
    onOpen(hit);
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('open');
        return next;
      },
      { replace: true },
    );
    // getId/onOpen are usually inline; the item list and param drive this.
  }, [open, items]);
}

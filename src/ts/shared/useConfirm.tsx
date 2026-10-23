// Promise-based confirmation dialog. Render `dialog` once in the
// component and `await confirm({...})` wherever a destructive action
// needs a yes/no. Extra `choices` turn it into a pick-one dialog
// (resolves to the choice's value, or false on cancel).

import React, { ReactNode, useCallback, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';

type Choice<T> = { label: string; value: T; primary?: boolean; color?: 'primary' | 'error' | 'inherit' };

type ConfirmOptions<T> = {
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  choices?: Choice<T>[];
};

type Pending<T> = ConfirmOptions<T> & { resolve: (v: T | boolean) => void };

export function useConfirm<T = boolean>() {
  const [pending, setPending] = useState<Pending<T> | null>(null);

  const confirm = useCallback(
    (opts: ConfirmOptions<T>) => new Promise<T | boolean>((resolve) => setPending({ ...opts, resolve })),
    [],
  );

  const finish = (v: T | boolean) => {
    pending?.resolve(v);
    setPending(null);
  };

  const dialog = (
    <Dialog open={Boolean(pending)} onClose={() => finish(false)} maxWidth="xs" fullWidth>
      <DialogTitle>{pending?.title}</DialogTitle>
      {pending?.body && (
        <DialogContent>
          <DialogContentText component="div">{pending.body}</DialogContentText>
        </DialogContent>
      )}
      <DialogActions>
        <Button color="inherit" onClick={() => finish(false)}>
          Cancel
        </Button>
        {pending?.choices
          ? pending.choices.map((c) => (
              <Button
                key={c.label}
                variant={c.primary ? 'contained' : 'outlined'}
                color={c.color ?? 'primary'}
                onClick={() => finish(c.value)}
              >
                {c.label}
              </Button>
            ))
          : pending && (
              <Button
                variant="contained"
                color={pending.destructive ? 'error' : 'primary'}
                onClick={() => finish(true)}
                autoFocus
              >
                {pending.confirmLabel ?? 'Confirm'}
              </Button>
            )}
      </DialogActions>
    </Dialog>
  );

  return { confirm, dialog };
}

// Phase 7: centralised toast service. Pages call toast('Saved') instead of
// wiring their own <Snackbar> and toast state. Mounted once in <AppLayout>.

import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { Alert, Snackbar } from '@mui/material';

export type ToastSeverity = 'success' | 'info' | 'warning' | 'error';

type Toast = {
  open: boolean;
  message: string;
  severity: ToastSeverity;
};

type ToastState = {
  toast: (message: string, severity?: ToastSeverity) => void;
};

const ToastContext = createContext<ToastState | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast>({
    open: false,
    message: '',
    severity: 'success',
  });

  const showToast = useCallback(
    (message: string, severity: ToastSeverity = 'success') => {
      setToast({ open: true, message, severity });
    },
    []
  );

  const value = useMemo<ToastState>(() => ({ toast: showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Snackbar
        open={toast.open}
        autoHideDuration={3500}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={toast.severity}
          variant="filled"
          onClose={() => setToast((t) => ({ ...t, open: false }))}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastState {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

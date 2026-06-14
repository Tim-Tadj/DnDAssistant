import React, { FC, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from './AuthContext';

type Mode = 'login' | 'signup';

const AuthDialog: FC<{ open: boolean; onClose: () => void; defaultMode?: Mode }> = ({
  open,
  onClose,
  defaultMode = 'login',
}) => {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setUsername('');
    setPassword('');
    setEmail('');
    setDisplayName('');
    setError(null);
    setSubmitting(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const onSubmit = async () => {
    if (!username.trim() || !password) {
      setError('Username and password are required');
      return;
    }
    if (mode === 'signup' && password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (mode === 'login') {
        await login(username, password);
      } else {
        await signup(username, password, email || undefined, displayName || undefined);
      }
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="xs">
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">{mode === 'login' ? 'Sign in' : 'Create account'}</Typography>
          <Tabs
            value={mode}
            onChange={(_e, v) => {
              setMode(v);
              setError(null);
            }}
          >
            <Tab label="Sign in" value="login" />
            <Tab label="Sign up" value="signup" />
          </Tabs>
        </Stack>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Stack spacing={2}>
          <TextField
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            fullWidth
            size="small"
          />
          {mode === 'signup' && (
            <>
              <TextField
                label="Email (optional)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                size="small"
              />
              <TextField
                label="Display name (optional)"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                fullWidth
                size="small"
              />
            </>
          )}
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            size="small"
            helperText={mode === 'signup' ? 'At least 8 characters' : ''}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="contained" onClick={onSubmit} disabled={submitting}>
          {submitting ? 'Working…' : mode === 'login' ? 'Sign in' : 'Sign up'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AuthDialog;

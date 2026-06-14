import React, { FC, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  Stack,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import { Lock, Person, PersonAdd } from '@mui/icons-material';
import { useAuth } from './AuthContext';

type Mode = 'login' | 'signup';

const AuthDialog: FC<{
  open: boolean;
  onClose: () => void;
  defaultMode?: Mode;
}> = ({ open, onClose, defaultMode = 'login' }) => {
  const { login, signup } = useAuth();
  const theme = useTheme();
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setMode(defaultMode);
      setUsername('');
      setPassword('');
      setEmail('');
      setDisplayName('');
      setError(null);
      setSubmitting(false);
    }
  }, [open, defaultMode]);

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
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogContent sx={{ p: 0, '&:first-of-type': { paddingTop: 0 } }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' } }}>
          <Stack
            sx={{
              flex: 1,
              p: 3,
              background: `linear-gradient(180deg, ${alpha(
                theme.palette.primary.main,
                0.18
              )} 0%, ${alpha(theme.palette.primary.main, 0.06)} 100%)`,
              borderRight: {
                xs: 'none',
                sm: `1px solid ${theme.palette.divider}`,
              },
              borderBottom: {
                xs: `1px solid ${theme.palette.divider}`,
                sm: 'none',
              },
            }}
            spacing={2}
            alignItems="center"
            justifyContent="center"
          >
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 0 20px ${alpha(theme.palette.primary.main, 0.4)}`,
              }}
            >
              <Typography
                sx={{
                  fontFamily: '"Cinzel", serif',
                  fontWeight: 700,
                  fontSize: 28,
                  color: theme.palette.primary.contrastText,
                }}
              >
                D
              </Typography>
            </Box>
            <Stack spacing={0.5} alignItems="center" textAlign="center">
              <Typography variant="h4">DnD Assistant</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 240 }}>
                Sign in to manage your campaigns, characters, and homebrew content.
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} sx={{ pt: 1 }}>
              <Button
                size="small"
                variant={mode === 'login' ? 'contained' : 'outlined'}
                startIcon={<Person />}
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
              >
                Sign in
              </Button>
              <Button
                size="small"
                variant={mode === 'signup' ? 'contained' : 'outlined'}
                startIcon={<PersonAdd />}
                onClick={() => {
                  setMode('signup');
                  setError(null);
                }}
              >
                Sign up
              </Button>
            </Stack>
          </Stack>
          <Box sx={{ flex: 1, p: 3 }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="h5">
                  {mode === 'login' ? 'Welcome back' : 'Create your account'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {mode === 'login'
                    ? 'Sign in to access your content.'
                    : 'A few details to get you started.'}
                </Typography>
              </Box>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                fullWidth
              />
              {mode === 'signup' && (
                <>
                  <TextField
                    label="Email (optional)"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="Display name (optional)"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    fullWidth
                    helperText="Shown in the navigation rail"
                  />
                </>
              )}
              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
                helperText={mode === 'signup' ? 'At least 8 characters' : ''}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void onSubmit();
                }}
              />
              <Button
                variant="contained"
                onClick={onSubmit}
                disabled={submitting}
                size="large"
                startIcon={<Lock />}
              >
                {submitting
                  ? 'Working…'
                  : mode === 'login'
                  ? 'Sign in'
                  : 'Create account'}
              </Button>
            </Stack>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default AuthDialog;

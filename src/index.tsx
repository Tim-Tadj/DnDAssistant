/**
 * Main application entry point.
 *
 * Provider order matters:
 *   - ThemeProvider / CssBaseline / AuthProvider / CampaignProvider /
 *     ToastProvider wrap everything (no router context needed).
 *   - MonsterStatPaneProvider uses useNavigate, so it MUST live inside
 *     the Router tree. AppRouter mounts <AppLayout> which now wraps
 *     its <Outlet> children in MonsterStatPaneProvider.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { CssBaseline, ThemeProvider } from '@mui/material';
import theme from './theme';
import AppRouter from './ts/app-router';
import { AuthProvider } from './ts/auth/AuthContext';
import { CampaignProvider } from './ts/shared/CampaignContext';
import { ToastProvider } from './ts/shared/ToastProvider';
import { SettingsProvider } from './ts/shared/SettingsContext';

const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement!);

root.render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <AuthProvider>
      <CampaignProvider>
        <SettingsProvider>
          <ToastProvider>
            <React.StrictMode>
              <AppRouter />
            </React.StrictMode>
          </ToastProvider>
        </SettingsProvider>
      </CampaignProvider>
    </AuthProvider>
  </ThemeProvider>
);

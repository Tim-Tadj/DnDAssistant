/**
 * Main application entry point.
 *
 * Provider order matters:
 *   - ThemeProvider / CssBaseline / AuthProvider / CampaignProvider /
 *     SettingsProvider / ToastProvider wrap everything (no router
 *     context needed).
 *   - EncounterProvider holds the running fight at the root so it
 *     survives navigation; it reads auth, campaign and settings.
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
import { EncounterProvider } from './ts/encounters/EncounterContext';

const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement!);

root.render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <AuthProvider>
      <CampaignProvider>
        <SettingsProvider>
          <ToastProvider>
            <EncounterProvider>
              <React.StrictMode>
                <AppRouter />
              </React.StrictMode>
            </EncounterProvider>
          </ToastProvider>
        </SettingsProvider>
      </CampaignProvider>
    </AuthProvider>
  </ThemeProvider>
);

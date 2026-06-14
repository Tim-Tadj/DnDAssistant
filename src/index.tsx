/**
 * Main application entry point
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { CssBaseline, ThemeProvider } from '@mui/material';
import theme from './theme';
import AppRouter from './ts/app-router';
import { AuthProvider } from './ts/auth/AuthContext';
import { CampaignProvider } from './ts/shared/CampaignContext';
import { MonsterStatPaneProvider } from './ts/shared/MonsterStatPane';
import { ToastProvider } from './ts/shared/ToastProvider';

const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement!);

root.render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <AuthProvider>
      <CampaignProvider>
        <ToastProvider>
          <MonsterStatPaneProvider>
            <React.StrictMode>
              <AppRouter />
            </React.StrictMode>
          </MonsterStatPaneProvider>
        </ToastProvider>
      </CampaignProvider>
    </AuthProvider>
  </ThemeProvider>
);

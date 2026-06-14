/**
 * Main application entry point
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { CssBaseline, ThemeProvider } from '@mui/material';
import theme from './theme';
import AppRouter from './ts/app-router';
import { AuthProvider } from './ts/auth/AuthContext';
import { ToastProvider } from './ts/shared/ToastProvider';

const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement!);

root.render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <AuthProvider>
      <ToastProvider>
        <React.StrictMode>
          <AppRouter />
        </React.StrictMode>
      </ToastProvider>
    </AuthProvider>
  </ThemeProvider>
);

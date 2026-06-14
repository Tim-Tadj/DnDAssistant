/**
 * Main application for executing the website
 * @author Lachlan Charteris
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { Box, CssBaseline, ThemeProvider } from '@mui/material';
import theme from './theme';
import AppRouter from './ts/app-router';
import { AuthProvider } from './ts/auth/AuthContext';

const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement!);

root.render(
  <ThemeProvider theme={theme}>
    <AuthProvider>
      <React.StrictMode>
        <Box>
          <CssBaseline />
          <AppRouter />
        </Box>
      </React.StrictMode>
    </AuthProvider>
  </ThemeProvider>
);

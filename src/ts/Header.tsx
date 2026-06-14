/**
 * Main application for executing the website
 * @author Lachlan Charteris
 */

import React, { FC, useState } from 'react';
import {
  Typography,
  Toolbar,
  AppBar,
  MenuItem,
  Button,
  Box,
  Stack,
} from '@mui/material';
import { Outlet, useNavigate } from 'react-router-dom';
import { Page, pages } from './pages';
import { useAuth } from './auth/AuthContext';
import AuthDialog from './auth/AuthDialog';

const PageMenu: FC<{ pages: Page[] }> = ({ pages }) => {
  const navigate = useNavigate();

  return (
    <>
      {pages.map((page) =>
        typeof page.path === 'string' ? (
          <MenuItem
            onClick={() => typeof page.path === 'string' && navigate(page.path)}
            sx={{ py: '6px', px: '12px' }}
            key={page.label}
          >
            <Typography variant="body2" color="info">
              {page.name}
            </Typography>
          </MenuItem>
        ) : (
          <PageMenu pages={page.path} />
        )
      )}
    </>
  );
};

const Header = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <div style={{ justifyContent: 'center' }}>
      <AppBar position="sticky" sx={{ mb: 3 }}>
        <Toolbar>
          <Button onClick={() => navigate('')}>
            <Typography variant="h4">DnD Assistant</Typography>
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <PageMenu pages={pages} />
          {user ? (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: 2 }}>
              <Typography variant="body2" color="inherit">
                {user.display_name ?? user.username}
              </Typography>
              <Button
                size="small"
                variant="outlined"
                color="inherit"
                onClick={() => {
                  logout();
                }}
              >
                Sign out
              </Button>
            </Stack>
          ) : (
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              onClick={() => setAuthOpen(true)}
              sx={{ ml: 2 }}
            >
              Sign in
            </Button>
          )}
        </Toolbar>
      </AppBar>
      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
      <Outlet />
    </div>
  );
};

export default Header;

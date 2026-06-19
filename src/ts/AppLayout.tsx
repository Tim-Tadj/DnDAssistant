/**
 * AppLayout - persistent shell.
 *
 * - 240px left navigation rail (collapses to icon-only under 900px)
 * - 56px top bar with: page title (left), global search trigger (center),
 *   user menu (right)
 * - Page content rendered in the right pane via <Outlet />
 *
 * Replaces the old Header.tsx + menu-button-strip approach.
 */

import React, { FC, useEffect, useMemo, useState } from 'react';
import {
  AppBar,
  Avatar,
  Box,
  Chip,
  Drawer,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
  Divider,
  List,
  ListItemButton,
  alpha,
} from '@mui/material';
import {
  AutoStories,
  Book,
  Casino,
  Logout,
  Map as MapIcon,
  Person,
  PersonAdd,
  Search as SearchIcon,
  Shield,
  ShoppingCart,
} from '@mui/icons-material';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import AuthDialog from './auth/AuthDialog';
import ContextBar from './shared/ContextBar';
import GlobalSearch from './shared/GlobalSearch';
import { MonsterStatPaneProvider } from './shared/MonsterStatPane';

type NavItem = {
  label: string;
  icon: React.ReactNode;
  path: string;
  group?: 'top' | 'create' | 'mine';
};

const NAV: NavItem[] = [
  { label: 'Guides', icon: <AutoStories />, path: '' },
  { label: 'Monsters', icon: <Shield />, path: 'monsters' },
  { label: 'Spells', icon: <Book />, path: 'spells' },
  { label: 'Gear', icon: <ShoppingCart />, path: 'gear' },
  { label: 'Encounters', icon: <Casino />, path: 'encounter' },
  { label: 'Characters', icon: <Person />, path: 'characters' },
  { label: 'Campaigns', icon: <MapIcon />, path: 'campaign' },
];

const RAIL_WIDTH = 240;
const RAIL_COLLAPSED = 68;

const AppLayout: FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const isCompact = useMediaQuery(theme.breakpoints.down('md'));
  const [railOpen, setRailOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  // Close rail on navigation when in compact mode
  useEffect(() => {
    if (isCompact) setRailOpen(false);
  }, [location.pathname, isCompact]);

  // Cmd/Ctrl-K opens the global search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape' && searchOpen) setSearchOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [searchOpen]);

  const activePath = location.pathname.replace(/^#?\/?/, '').split('/')[0] ?? '';
  const railWidth = isCompact ? RAIL_COLLAPSED : RAIL_WIDTH;

  const railContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ px: 2, gap: 1, minHeight: 64 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 12px ${alpha(theme.palette.primary.main, 0.4)}`,
            flexShrink: 0,
          }}
        >
          <Typography
            sx={{
              fontFamily: '"Cinzel", serif',
              fontWeight: 700,
              fontSize: 18,
              color: theme.palette.primary.contrastText,
              lineHeight: 1,
            }}
          >
            D
          </Typography>
        </Box>
        {!isCompact && (
          <Stack spacing={-0.5}>
            <Typography
              variant="h5"
              sx={{ fontFamily: '"Cinzel", serif', lineHeight: 1.1 }}
            >
              DnD Assistant
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {`Dungeon Master's tool`}
            </Typography>
          </Stack>
        )}
      </Toolbar>
      <Divider />
      <List sx={{ flexGrow: 1, py: 1 }}>
        {NAV.map((item) => {
          const isActive =
            item.path === ''
              ? activePath === ''
              : activePath === item.path.split('/')[0];
          return (
            <ListItemButton
              key={item.path}
              onClick={() => navigate(item.path)}
              selected={isActive}
              sx={{
                mx: 1,
                my: 0.25,
                borderRadius: 1.5,
                minHeight: 44,
                px: 1.5,
                '&.Mui-selected': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.16),
                  borderLeft: `3px solid ${theme.palette.primary.main}`,
                  pl: 1.25,
                },
                '&.Mui-selected:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.24),
                },
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 36,
                  color: isActive ? 'primary.main' : 'text.secondary',
                }}
              >
                {item.icon}
              </ListItemIcon>
              {!isCompact && (
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '0.9rem',
                    color: isActive ? 'primary.main' : 'text.primary',
                  }}
                />
              )}
            </ListItemButton>
          );
        })}
      </List>
      <Divider />
      <Box sx={{ p: 1.5 }}>
        {!isCompact &&
          (user ? (
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{
                p: 1,
                borderRadius: 1.5,
                backgroundColor: alpha(theme.palette.primary.main, 0.06),
              }}
            >
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                }}
              >
                {(user.display_name ?? user.username).slice(0, 1).toUpperCase()}
              </Avatar>
              <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Typography variant="body2" noWrap fontWeight={600}>
                  {user.display_name ?? user.username}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  @{user.username}
                </Typography>
              </Box>
            </Stack>
          ) : (
            <Stack spacing={1}>
              <MenuItem
                onClick={() => {
                  setAuthMode('login');
                  setAuthOpen(true);
                }}
                sx={{ borderRadius: 1.5 }}
              >
                <ListItemIcon>
                  <Person fontSize="small" />
                </ListItemIcon>
                Sign in
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setAuthMode('signup');
                  setAuthOpen(true);
                }}
                sx={{ borderRadius: 1.5 }}
              >
                <ListItemIcon>
                  <PersonAdd fontSize="small" />
                </ListItemIcon>
                Create account
              </MenuItem>
            </Stack>
          ))}
      </Box>
    </Box>
  );

  const title = useMemo(() => {
    const item = NAV.find((n) =>
      n.path === '' ? activePath === '' : activePath === n.path.split('/')[0]
    );
    return item?.label ?? 'DnD Assistant';
  }, [activePath]);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Drawer
        variant={isCompact ? 'temporary' : 'permanent'}
        open={isCompact ? railOpen : true}
        onClose={() => setRailOpen(false)}
        sx={{
          width: railWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: railWidth,
            boxSizing: 'border-box',
            transition: 'width 200ms ease',
            overflowX: 'hidden',
          },
        }}
      >
        {railContent}
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <AppBar
          position="sticky"
          color="default"
          elevation={0}
          sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}
        >
          <Toolbar sx={{ gap: 1, minHeight: 56 }}>
            {isCompact && (
              <IconButton
                onClick={() => setRailOpen(true)}
                edge="start"
                size="small"
                aria-label="open navigation"
              >
                <Shield />
              </IconButton>
            )}
            <Stack spacing={-0.5} sx={{ minWidth: 0 }}>
              <Typography
                variant="h5"
                noWrap
                sx={{
                  fontFamily: '"Cinzel", serif',
                  lineHeight: 1.1,
                }}
              >
                {title}
              </Typography>
            </Stack>
            <Box sx={{ flexGrow: 1 }} />
            <Tooltip title="Search (Ctrl+K)" arrow>
              <Box
                onClick={() => setSearchOpen(true)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setSearchOpen(true);
                }}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 1.5,
                  border: `1px solid ${theme.palette.divider}`,
                  backgroundColor: alpha(theme.palette.primary.main, 0.04),
                  cursor: 'pointer',
                  minWidth: 200,
                  '&:hover': {
                    borderColor: alpha(theme.palette.primary.main, 0.5),
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  },
                }}
              >
                <SearchIcon fontSize="small" sx={{ opacity: 0.6 }} />
                <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                  Search…
                </Typography>
                <Stack direction="row" spacing={0.5}>
                  <Chip label="Ctrl" size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
                  <Chip label="K" size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
                </Stack>
              </Box>
            </Tooltip>
            {user ? (
              <>
                <Tooltip title={user.display_name ?? user.username} arrow>
                  <IconButton
                    onClick={(e) => setUserMenuAnchor(e.currentTarget)}
                    size="small"
                  >
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        backgroundColor: 'primary.main',
                        color: 'primary.contrastText',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                      }}
                    >
                      {(user.display_name ?? user.username)
                        .slice(0, 1)
                        .toUpperCase()}
                    </Avatar>
                  </IconButton>
                </Tooltip>
                <Menu
                  open={Boolean(userMenuAnchor)}
                  anchorEl={userMenuAnchor}
                  onClose={() => setUserMenuAnchor(null)}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                  <MenuItem disabled sx={{ opacity: '1 !important' }}>
                    <Stack>
                      <Typography variant="body2" fontWeight={600}>
                        {user.display_name ?? user.username}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        @{user.username}
                      </Typography>
                    </Stack>
                  </MenuItem>
                  <Divider />
                  <MenuItem
                    onClick={() => {
                      setUserMenuAnchor(null);
                      navigate('characters');
                    }}
                  >
                    <ListItemIcon>
                      <Person fontSize="small" />
                    </ListItemIcon>
                    My Characters
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      setUserMenuAnchor(null);
                      navigate('campaign');
                    }}
                  >
                    <ListItemIcon>
                      <MapIcon fontSize="small" />
                    </ListItemIcon>
                    My Campaigns
                  </MenuItem>
                  <Divider />
                  <MenuItem
                    onClick={() => {
                      setUserMenuAnchor(null);
                      logout();
                    }}
                  >
                    <ListItemIcon>
                      <Logout fontSize="small" />
                    </ListItemIcon>
                    Sign out
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <Stack direction="row" spacing={1}>
                <Tooltip title="Create an account" arrow>
                  <IconButton
                    onClick={() => {
                      setAuthMode('signup');
                      setAuthOpen(true);
                    }}
                    size="small"
                  >
                    <PersonAdd />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Sign in" arrow>
                  <IconButton
                    onClick={() => {
                      setAuthMode('login');
                      setAuthOpen(true);
                    }}
                    size="small"
                    color="primary"
                  >
                    <Person />
                  </IconButton>
                </Tooltip>
              </Stack>
            )}
          </Toolbar>
        </AppBar>
        <ContextBar />
        <MonsterStatPaneProvider>
          <Box
            sx={{
              flexGrow: 1,
              p: { xs: 2, md: 3 },
              backgroundColor: 'background.default',
              minHeight: 0,
            }}
          >
            <Outlet />
          </Box>
        </MonsterStatPaneProvider>
      </Box>
      <AuthDialog
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        defaultMode={authMode}
      />
      <GlobalSearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={(path) => {
          setSearchOpen(false);
          navigate(path);
        }}
      />
    </Box>
  );
};

export default AppLayout;

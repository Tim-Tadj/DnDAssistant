/**
 * Dark-fantasy theme for DnDAssistant.
 *
 * Palette
 * - Background: dark slate (#1c1f24) with deeper paper for surfaces
 * - Primary: parchment gold (#c9a14a)
 * - Secondary: muted steel blue (#7d96b3)
 * - Accents: provenance colours (srd gold, derived steel, homebrew emerald)
 *
 * Typography
 * - Cinzel for display/headings (medieval-ish but readable)
 * - Inter for body text
 * - JetBrains Mono for stat-block numbers
 */

import { createTheme, alpha } from '@mui/material/styles';

const COLORS = {
  bg: '#1c1f24',
  bgPaper: '#25292f',
  bgElevated: '#2c3038',
  bgDeep: '#15171b',
  divider: '#3a3f48',
  textPrimary: '#e8e4d8',
  textSecondary: '#9a9ba1',
  textMuted: '#6f7079',
  primary: '#c9a14a',
  primaryDark: '#a07d2e',
  primaryLight: '#e6c372',
  secondary: '#7d96b3',
  error: '#d36c6c',
  warning: '#d6a157',
  success: '#6fa86b',
  info: '#7d96b3',
  // Provenance palette
  provSrd: '#c9a14a',
  provDerived: '#7d96b3',
  provHomebrew: '#6fa86b',
};

const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: COLORS.bg,
      paper: COLORS.bgPaper,
    },
    primary: {
      main: COLORS.primary,
      dark: COLORS.primaryDark,
      light: COLORS.primaryLight,
      contrastText: COLORS.bgDeep,
    },
    secondary: {
      main: COLORS.secondary,
      contrastText: COLORS.textPrimary,
    },
    error: { main: COLORS.error },
    warning: { main: COLORS.warning },
    success: { main: COLORS.success },
    info: { main: COLORS.info },
    text: {
      primary: COLORS.textPrimary,
      secondary: COLORS.textSecondary,
      disabled: COLORS.textMuted,
    },
    divider: COLORS.divider,
  },
  shape: { borderRadius: 6 },
  spacing: 8,
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: 14,
    htmlFontSize: 16,
    h1: {
      fontFamily: '"Cinzel", "Georgia", serif',
      fontWeight: 600,
      fontSize: '2.25rem',
      letterSpacing: '0.02em',
    },
    h2: {
      fontFamily: '"Cinzel", "Georgia", serif',
      fontWeight: 600,
      fontSize: '1.75rem',
      letterSpacing: '0.02em',
    },
    h3: {
      fontFamily: '"Cinzel", "Georgia", serif',
      fontWeight: 600,
      fontSize: '1.4rem',
      letterSpacing: '0.01em',
    },
    h4: {
      fontFamily: '"Cinzel", "Georgia", serif',
      fontWeight: 600,
      fontSize: '1.2rem',
      letterSpacing: '0.01em',
    },
    h5: {
      fontFamily: '"Cinzel", "Georgia", serif',
      fontWeight: 600,
      fontSize: '1.05rem',
      letterSpacing: '0.01em',
    },
    h6: {
      fontFamily: '"Cinzel", "Georgia", serif',
      fontWeight: 600,
      fontSize: '0.95rem',
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
    },
    body1: { fontSize: '0.95rem', lineHeight: 1.55 },
    body2: { fontSize: '0.85rem', lineHeight: 1.5 },
    button: { fontWeight: 600, letterSpacing: '0.02em', textTransform: 'none' },
    caption: { fontSize: '0.75rem', color: COLORS.textSecondary },
    overline: {
      fontSize: '0.7rem',
      fontWeight: 700,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: COLORS.textSecondary,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: COLORS.bg,
          color: COLORS.textPrimary,
          scrollbarColor: `${COLORS.divider} ${COLORS.bgDeep}`,
          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        },
        '*::-webkit-scrollbar': { width: 10, height: 10 },
        '*::-webkit-scrollbar-track': { background: COLORS.bgDeep },
        '*::-webkit-scrollbar-thumb': {
          background: COLORS.divider,
          borderRadius: 6,
        },
        '*::-webkit-scrollbar-thumb:hover': { background: '#52575f' },
        a: { color: COLORS.primary },
        'code, pre, .mono': {
          fontFamily: '"JetBrains Mono", "SF Mono", monospace',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: COLORS.bgPaper,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: COLORS.bgDeep,
          backgroundImage: 'none',
          borderBottom: `1px solid ${COLORS.divider}`,
          boxShadow: 'none',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: COLORS.bgDeep,
          backgroundImage: 'none',
          borderRight: `1px solid ${COLORS.divider}`,
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 6 },
        containedPrimary: {
          color: COLORS.bgDeep,
          fontWeight: 600,
          '&:hover': { backgroundColor: COLORS.primaryLight },
        },
        outlined: { borderColor: COLORS.divider },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: COLORS.textPrimary,
          '&:hover': { backgroundColor: alpha(COLORS.primary, 0.08) },
        },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small', variant: 'outlined' },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: alpha(COLORS.bgDeep, 0.5),
          '& fieldset': { borderColor: COLORS.divider },
          '&:hover fieldset': { borderColor: alpha(COLORS.primary, 0.5) },
        },
      },
    },
    MuiFilledInput: {
      styleOverrides: {
        root: {
          backgroundColor: alpha(COLORS.bgDeep, 0.5),
          '&:hover': { backgroundColor: alpha(COLORS.bgDeep, 0.7) },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: COLORS.bgPaper,
          backgroundImage: 'none',
          border: `1px solid ${COLORS.divider}`,
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${COLORS.divider}`,
          padding: '16px 24px',
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: { root: { padding: '20px 24px' } },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          borderTop: `1px solid ${COLORS.divider}`,
          padding: '12px 24px',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          letterSpacing: '0.01em',
          minHeight: 44,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: COLORS.bgDeep,
          border: `1px solid ${COLORS.divider}`,
          fontSize: '0.75rem',
        },
        arrow: { color: COLORS.bgDeep },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, fontSize: '0.72rem', height: 24 },
        label: { padding: '0 8px' },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { fontSize: '0.85rem', borderRadius: 6 },
      },
    },
  },
});

export const PROVENANCE = {
  srd: { label: 'SRD', color: COLORS.provSrd },
  derived: { label: 'Derived', color: COLORS.provDerived },
  homebrew: { label: 'Homebrew', color: COLORS.provHomebrew },
};

export default theme;

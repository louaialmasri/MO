'use client';
import { createTheme, responsiveFontSizes } from '@mui/material/styles';
import { Roboto } from 'next/font/google';
import { Shadows } from '@mui/material/styles';

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
});

// === ORANGE PALETTE (wie in page.tsx) ===
const palette = {
  primary: {
    main: '#E2673A',           // kräftiges, modernes Orange
    light: 'rgba(226,103,58,0.12)',
    dark: '#B04E28',
    contrastText: '#fff',
  },
  secondary: {
    main: '#1976d2',           // klares Blau als Kontrast
  },
  background: {
    default: '#f6f8fa',        // sehr hellgrauer Grund
    paper: '#ffffff',
  },
  text: {
    primary: '#172b4d',
    secondary: '#5e6c84',
  },
};

// Temporäres Theme für Default-Shadows
const defaultTheme = createTheme();

let theme = createTheme({
  palette,
  typography: {
    fontFamily: roboto.style.fontFamily,
    h4: { fontWeight: 800, color: palette.text.primary },
    h5: { fontWeight: 700, color: palette.text.primary },
    h6: { fontWeight: 600, color: palette.text.primary },
    subtitle1: { color: palette.text.secondary },
    body1: { color: palette.text.primary },
    body2: { color: palette.text.secondary },
    button: { fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  shadows: [
    'none',
    '0px 2px 4px -1px rgba(0,0,0,0.06), 0px 4px 5px 0px rgba(0,0,0,0.04), 0px 1px 10px 0px rgba(0,0,0,0.04)',
    '0px 3px 5px -1px rgba(0,0,0,0.06), 0px 6px 10px 0px rgba(0,0,0,0.04), 0px 1px 18px 0px rgba(0,0,0,0.04)',
    ...defaultTheme.shadows.slice(3),
  ] as Shadows,
  components: {
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
        outlined: { border: '1px solid rgba(145, 158, 171, 0.2)' },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          boxShadow: 'none',
          borderRadius: 8,
          transition: 'all 0.2s ease',
          '&:hover': {
            boxShadow: '0px 2px 6px rgba(226,103,58,0.25)',
          },
        },
        containedPrimary: {
          backgroundColor: palette.primary.main,
          boxShadow: '0 8px 16px 0 rgba(226,103,58,0.24)',
          '&:hover': {
            backgroundColor: '#d55c30',
            boxShadow: '0 4px 8px rgba(226,103,58,0.25)',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(8px)',
          boxShadow: 'none',
          borderBottom: '1px solid rgba(145, 158, 171, 0.2)',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          color: palette.text.secondary,
          backgroundColor: palette.background.default,
          fontWeight: 600,
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '&:hover': { backgroundColor: 'rgba(226,103,58,0.08)' },
          '&.Mui-selected': {
            backgroundColor: 'rgba(226,103,58,0.15)',
            color: palette.primary.main,
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: palette.text.secondary,
          '&:hover': { color: palette.primary.main, backgroundColor: 'rgba(226,103,58,0.08)' },
        },
      },
    },
  },
});

theme = responsiveFontSizes(theme);

export default theme;

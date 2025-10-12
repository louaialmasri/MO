'use client';
import { createTheme, responsiveFontSizes } from '@mui/material/styles';
import { Roboto } from 'next/font/google';
import { Shadows } from '@mui/material/styles';

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
});

// === FARBPALETTE ANGEPASST ===
const palette = {
  primary: {
    main: '#E2673A',
    light: 'rgba(226,103,58,0.12)',
    dark: '#B04E28',
    contrastText: '#fff',
  },
  // HIER DIE ÄNDERUNG: secondary wird wieder auf primary gesetzt für einen einheitlichen Look
  secondary: {
    main: '#E2673A', // Orange statt Grau
    contrastText: '#fff',
  },
  background: {
    default: '#f6f8fa',
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
    h1: { fontWeight: 800, fontSize: '3.5rem', letterSpacing: '-1.5px' },
    h2: { fontWeight: 800, fontSize: '3rem', letterSpacing: '-1px' },
    h3: { fontWeight: 700, fontSize: '2.5rem' },
    h4: { fontWeight: 800, color: palette.text.primary }, // Beibehalten
    h5: { fontWeight: 700, color: palette.text.primary }, // Beibehalten
    h6: { fontWeight: 600, color: palette.text.primary }, // Beibehalten
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
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          borderRadius: 16,
        }
      }
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
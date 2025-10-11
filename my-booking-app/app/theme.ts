'use client';
import { createTheme, responsiveFontSizes } from '@mui/material/styles';
import { Roboto } from 'next/font/google';
import { Shadows } from '@mui/material/styles';

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
});

// ### NEUE, MODERNE ORANGE-PALETTE ###
const palette = {
  primary: {
    main: '#F57C00', // Ein sattes, modernes Orange
    light: '#FFA726',
    dark: '#BF360C',
  },
  secondary: {
    main: '#1976d2', // Das professionelle Blau als starker Kontrast
  },
  background: {
    default: '#f4f6f8',
    paper: '#ffffff',
  },
  text: {
    primary: '#172b4d',
    secondary: '#5e6c84',
  }
};

// Temporäres Theme, um auf die Standard-Schatten zuzugreifen
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
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    "none",
    "0px 2px 4px -1px rgba(0,0,0,0.06), 0px 4px 5px 0px rgba(0,0,0,0.04), 0px 1px 10px 0px rgba(0,0,0,0.04)",
    "0px 3px 5px -1px rgba(0,0,0,0.06), 0px 6px 10px 0px rgba(0,0,0,0.04), 0px 1px 18px 0px rgba(0,0,0,0.04)",
    ...defaultTheme.shadows.slice(3),
  ] as Shadows,
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        outlined: {
          border: '1px solid rgba(145, 158, 171, 0.2)',
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 2px 4px -1px rgba(0,0,0,0.1)',
          }
        },
        containedPrimary: {
          // ### FARBE FÜR DEN "GLOW"-EFFEKT ANGEPASST ###
          boxShadow: '0 8px 16px 0 rgba(245, 124, 0, 0.24)', 
          '&:hover': {
            boxShadow: 'none',
          }
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(8px)',
          boxShadow: 'none',
          borderBottom: '1px solid rgba(145, 158, 171, 0.2)',
        }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          color: palette.text.secondary,
          backgroundColor: palette.background.default,
          fontWeight: 600,
        }
      }
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          }
        }
      }
    }
  }
});

theme = responsiveFontSizes(theme);

export default theme;
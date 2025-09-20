// my-booking-app/app/theme.ts

import { createTheme } from '@mui/material/styles';

// Eine verfeinerte, moderne Erdton-Palette
const theme = createTheme({
  palette: {
    primary: {
      main: '#e2673aff', // Ein tieferes, satteres Braun
    },
    secondary: {
      main: '#FFA726', // Ein warmer, kräftiger Bernstein-Ton
    },
    background: {
      default: '#F9F6F2', // Ein sehr helles, neutrales Off-White
      paper: '#FFFFFF',
    },
    text: {
      primary: '#424242',
      secondary: '#757575',
    },
    divider: '#EAE3DA', // Passend zur Farbpalette
  },
  typography: {
    fontFamily: '"Poppins", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12, // Weichere, modernere Ecken
          boxShadow: '0 8px 16px rgba(0,0,0,0.05)', // Ein sehr subtiler Schatten
          border: '1px solid #EAE3DA',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          textTransform: 'none',
          fontWeight: 600,
          padding: '8px 20px',
          boxShadow: 'none',
          transition: 'background-color 0.2s ease-in-out, transform 0.1s ease-in-out',
          '&:hover': {
            boxShadow: 'none',
            transform: 'translateY(-1px)', // Subtiler Schwebe-Effekt
          },
        },
        containedPrimary: {
          color: '#FFFFFF',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiAppBar: {
        styleOverrides: {
            root: {
                // "Frosted Glass" Effekt
                backgroundColor: 'rgba(249, 246, 242, 0.85)', 
                backdropFilter: 'blur(10px)',
            }
        }
    }
  },
});

export default theme;
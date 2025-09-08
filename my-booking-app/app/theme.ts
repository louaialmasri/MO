// my-booking-app/app/theme.ts

import { createTheme } from '@mui/material/styles';

// Eine neue, moderne und warme Farbpalette basierend auf Erd-/Beigetönen
const theme = createTheme({
  palette: {
    primary: {
      main: '#8D6E63', // Ein warmes, sanftes Braun
    },
    secondary: {
      main: '#FFAB40', // Ein kräftiger Gold-Orangeton als Akzent
    },
    background: {
      default: '#FDFBF7', // Ein sehr helles, warmes Beige für den Hintergrund
      paper: '#FFFFFF',
    },
    text: {
      primary: '#424242', // Dunkleres Grau für besseren Kontrast
      secondary: '#757575',
    },
  },
  typography: {
    fontFamily: '"Poppins", "Helvetica", "Arial", sans-serif', // Eine modernere Schriftart
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
    // Styling für alle Paper-Komponenten (wie die KPI-Karten)
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16, // Etwas rundere Ecken für einen weicheren Look
          boxShadow: '0px 6px 20px rgba(0,0,0,0.07)', // Weicher, definierter Schatten
          border: '1px solid #EFEBE9', // Subtile Umrandung
        },
      },
    },
    // Styling für alle Buttons
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none', // Keine Großbuchstaben
          fontWeight: 600,
          padding: '8px 16px',
        },
        containedPrimary: {
          color: '#FFFFFF', // Sicherstellen, dass der Text weiß ist
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
  },
});

export default theme;
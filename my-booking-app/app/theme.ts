import { createTheme } from '@mui/material/styles';

// Ein Beispiel für ein modernes, ansprechendes Theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#6200ea', // Ein kräftiges Violett als Hauptfarbe
    },
    secondary: {
      main: '#03dac6', // Ein Türkis als Akzentfarbe
    },
    background: {
      default: '#f4f5f7', // Ein leichter Grauton für den Hintergrund
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
    },
    h5: {
      fontWeight: 600,
    },
  },
  components: {
    // Styling für alle Paper-Komponenten (wie die KPI-Karten)
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12, // Abgerundete Ecken
          boxShadow: '0px 4px 12px rgba(0,0,0,0.05)', // Weicher Schatten
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
        },
      },
    },
  },
});

export default theme;
'use client'
import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    primary: { main: '#3b82f6' },   // blau
    secondary: { main: '#f59e0b' }, // amber
    background: { default: '#f7f7fb' },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: [
      'Inter',
      'system-ui',
      'Segoe UI',
      'Roboto',
      'Helvetica Neue',
      'Arial',
      'Noto Sans',
      'Apple Color Emoji',
      'Segoe UI Emoji',
    ].join(','),
    h2: { fontWeight: 800, letterSpacing: '-0.02em' },
    h4: { fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 700 },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: { borderRadius: 16 },
      },
    },
  },
})

export default theme

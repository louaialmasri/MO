'use client';

import * as React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import NextAppDirEmotionCacheProvider from './EmotionCache'; // Stellt sicher, dass dies auf die neue Datei im selben Ordner verweist
import theme from '@/app/theme';

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  return (
    <NextAppDirEmotionCacheProvider options={{ key: 'mui' }}>
      <ThemeProvider theme={theme}>
        {/* CssBaseline ist der entscheidende Teil, der das "gequetschte" Aussehen behebt. */}
        {/* Es normalisiert das CSS und wendet korrekte Grund-Abstände an. */}
        <CssBaseline />
        {children}
      </ThemeProvider>
    </NextAppDirEmotionCacheProvider>
  );
}
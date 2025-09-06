'use client'

import * as React from 'react'
import { useServerInsertedHTML } from 'next/navigation'
import { CacheProvider } from '@emotion/react'
import createCache from '@emotion/cache'
import createEmotionServer from '@emotion/server/create-instance'
import { ThemeProvider, CssBaseline } from '@mui/material'
import theme from '@/app/theme' // deinen bestehenden Theme-Pfad benutzen

function createEmotionCache() {
  const cache = createCache({ key: 'mui', prepend: true })
  // wichtig für MUI + Emotion im App Router
  cache.compat = true
  return cache
}

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  const [{ cache, flush }] = React.useState(() => {
    const cache = createEmotionCache()
    const { extractCriticalToChunks } = createEmotionServer(cache)
    return {
      cache,
      flush() {
        const chunks = extractCriticalToChunks('')
        const styles = chunks.styles.map((style) => (
          <style
            key={style.key}
            data-emotion={`${style.key} ${style.ids.join(' ')}`}
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: style.css }}
          />
        ))
        return styles
      },
    }
  })

  useServerInsertedHTML(() => {
    return flush()
  })

  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </CacheProvider>
  )
}

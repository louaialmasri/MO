import type { Metadata } from 'next'
import Providers from './providers'
import ThemeRegistry from '@/components/ThemeRegistry'
// Der Import von PageTransitionWrapper wird hier entfernt, da er nicht mehr benötigt wird
import './globals.css'

export const metadata: Metadata = {
  title: 'MeinFrisör – Online buchen',
  description: 'Frisör-Termine einfach online buchen.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        <ThemeRegistry>
          {/* Der PageTransitionWrapper wurde hier bereits in der providers.tsx entfernt, 
              daher ist hier keine weitere Änderung am JSX nötig. */}
          <Providers>{children}</Providers>
        </ThemeRegistry>
      </body>
    </html>
  )
}
import type { Metadata } from 'next'
import Providers from './providers'
import ThemeRegistry from '@/components/ThemeRegistry'
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
          <Providers>{children}</Providers>
        </ThemeRegistry>
      </body>
    </html>
  )
}

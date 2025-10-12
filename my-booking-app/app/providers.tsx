'use client'

import { ReactNode, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation' // NEU: Importiert
import { AuthProvider } from '@/context/AuthContext'
import Navbar from '@/components/Navbar'
import { Box } from '@mui/material' // NEU: Importiert

export default function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const pathname = usePathname() // NEU: Ermittelt den aktuellen Pfad
  const isHomePage = pathname === '/' // NEU: Prüft, ob es die Startseite ist

  return (
    <AuthProvider>
      {mounted ? <Navbar /> : null}
      
      <Box sx={{ paddingTop: isHomePage ? 0 : '110px' }}>
        {children}
      </Box>
    </AuthProvider>
  )
}
'use client'

import { ReactNode, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { AuthProvider } from '@/context/AuthContext'
import Navbar from '@/components/Navbar'
import { Box } from '@mui/material'

export default function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const pathname = usePathname()
  const isHomePage = pathname === '/'

  return (
    <AuthProvider>
      {mounted ? <Navbar /> : null}
      
      <Box sx={{ paddingTop: isHomePage ? 0 : '110px' }}>
        {children}
      </Box>
    </AuthProvider>
  )
}
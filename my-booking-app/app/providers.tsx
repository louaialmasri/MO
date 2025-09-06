'use client'

import { ReactNode, useEffect, useState } from 'react'
import { AuthProvider } from '@/context/AuthContext'
import Navbar from '@/components/Navbar'

export default function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <AuthProvider>
      {mounted ? <Navbar /> : null}
      {children}
    </AuthProvider>
  )
}

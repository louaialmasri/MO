'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  AppBar,
  Toolbar,
  Container,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Box,
  Typography,
  useMediaQuery
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import LoginIcon from '@mui/icons-material/Login'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import DashboardIcon from '@mui/icons-material/Dashboard'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import LogoutIcon from '@mui/icons-material/Logout'
import { useAuth } from '@/context/AuthContext'
import SettingsIcon from '@mui/icons-material/Settings'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import { Avatar, Stack } from '@mui/material'
import { fetchSalons } from '@/services/api'
import CheckIcon from '@mui/icons-material/Check';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { usePathname } from 'next/navigation';

const salon = { name: 'King & Queen', logoUrl: '' } // logoUrl später aus Stammdaten


export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const role = user?.role
  const isMobile = useMediaQuery('(max-width:899px)', { noSsr: true })
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)
  const handleMenu = (e: React.MouseEvent<HTMLButtonElement>) => setAnchorEl(e.currentTarget)
  const handleClose = () => setAnchorEl(null)

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const Brand = (
    <Typography
      variant="h6"
      sx={{ fontWeight: 800, cursor: 'pointer', letterSpacing: '-0.02em' }}
      onClick={() => router.push('/')}
    >
      MeinFrisör
    </Typography>
  )

  const AuthButtons = (
    <>
      {!user ? (
        <>
          <Button
            startIcon={<LoginIcon />}
            color="inherit"
            onClick={() => router.push('/login')}
          >
            Login
          </Button>
          <Button
            startIcon={<PersonAddIcon />}
            variant="contained"
            onClick={() => router.push('/register')}
          >
            Registrieren
          </Button>
        </>
      ) : (
        <>
          <Button
            startIcon={<CalendarMonthIcon />}
            color="inherit"
            onClick={() => router.push('/booking')}
          >
            Buchen
          </Button>
          <Button
            startIcon={<DashboardIcon />}
            color="inherit"
            onClick={() => router.push('/dashboard')}
          >
            Dashboard
          </Button>
          {role === 'admin' && (
            <Button
              startIcon={<AdminPanelSettingsIcon />}
              color="inherit"
              onClick={() => router.push('/admin')}
            >
              Admin
            </Button>
          )}
          {role === 'staff' && (
            <Button
              startIcon={<CalendarMonthIcon />}
              color="inherit"
              onClick={() => router.push('/staff-dashboard')}
            >
              Staff
            </Button>
          )}
          <Button
            startIcon={<LogoutIcon />}
            variant="outlined"
            onClick={handleLogout}
          >
            Logout
          </Button>
        </>
      )}
    </>
  )

  const [salons, setSalons] = useState<{ _id:string; name:string; logoUrl?:string }[]>([])
  const [activeSalonId, setActiveSalonId] = useState<string | null>(null)
  const [salonEl, setSalonEl] = useState<null | HTMLElement>(null)
  const salonOpen = Boolean(salonEl)

  useEffect(() => {
  if (role !== 'admin') return
  (async () => {
    const list = await fetchSalons()
    setSalons(list)

    const stored = localStorage.getItem('activeSalonId')
    // Bevorzugt "Mein Salon", falls nichts gespeichert ist
    const mein = list.find(s => s.name === 'Mein Salon')
    const first = list[0]

    let id = stored && list.some(s => s._id === stored) ? stored : null
    if (!id) id = mein?._id || first?._id || null

    if (id) localStorage.setItem('activeSalonId', id)
    setActiveSalonId(id)
  })()
}, [role])


  const activeSalon = salons.find(s => s._id === activeSalonId)

  return (
    <AppBar
      position="sticky"
      color="transparent"
      elevation={1}
      sx={{
        backdropFilter: 'blur(6px)',
        backgroundColor: 'rgba(255,255,255,0.85)',
      }}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ gap: 1 }}>
          {/* Brand */}
          {Brand}

          {/* Desktop */}
          {hydrated && !isMobile && (
            <Box sx={{ ml: 'auto', display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button color="inherit" onClick={() => router.push('/booking')}>
                Termin buchen
              </Button>
              {role === 'admin' && (
              <>
                <Button color="inherit" onClick={(e) => setSalonEl(e.currentTarget)}
    sx={{ textTransform: 'none', px: 1.25 }}>
    <Stack direction="row" spacing={1} alignItems="center">
      <SettingsIcon fontSize="small" />
      <Avatar src={activeSalon?.logoUrl} sx={{ width: 28, height: 28, fontSize: 14 }}>
        {(activeSalon?.name || 'S').slice(0,2).toUpperCase()}
      </Avatar>
      <Typography sx={{ fontWeight: 600 }}>{activeSalon?.name || 'Mein Salon'}</Typography>
      <ArrowDropDownIcon />
    </Stack>
</Button>
<Menu anchorEl={salonEl} open={salonOpen} onClose={() => setSalonEl(null)}
  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
  transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
  {salons.map(s => {
    const isActive = s._id === activeSalonId
    return (
      <MenuItem
        key={s._id}
        onClick={() => {
          setSalonEl(null)
          setActiveSalonId(s._id)
          localStorage.setItem('activeSalonId', s._id)
          try { window.dispatchEvent(new CustomEvent('activeSalonChanged', { detail: s._id })) } catch {}
          router.refresh?.()
        }}
      >
        {s.name}
        {isActive && <CheckIcon fontSize="small" style={{ marginLeft: 8 }} />}
      </MenuItem>
    )
  })}
  <MenuItem onClick={() => { setSalonEl(null); router.push('/admin/availability') }}>
    Abwesenheiten & Arbeitszeiten
  </MenuItem>
  <MenuItem onClick={() => { setSalonEl(null); router.push('/admin/catalog') }}>
    Katalog
  </MenuItem>
   <MenuItem
        onClick={() => { setSalonEl(null); router.push('/admin/availability/templates') }}
        selected={pathname?.startsWith('/admin/availability/templates')}
      >
        <ScheduleIcon fontSize="small" style={{ marginRight: 8 }} />
        Arbeitszeiten-Templates
      </MenuItem>
</Menu>
              </>
            )}
              {AuthButtons}
            </Box>
          )}

          {/* Mobile */}
          {hydrated && isMobile && (
            <Box sx={{ ml: 'auto' }}>
              <IconButton
                size="large"
                color="inherit"
                onClick={handleMenu}
                aria-controls={open ? 'nav-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={open ? 'true' : undefined}
              >
                <MenuIcon />
              </IconButton>
              <Menu
                id="nav-menu"
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              >
                {[
                  <MenuItem key="booking" onClick={() => { handleClose(); router.push('/booking') }}>
                    Termin buchen
                  </MenuItem>,
                  ...(role === 'admin' ? [
                    <MenuItem key="admin-availability" onClick={() => { handleClose(); router.push('/admin/availability') }}>
                      Abwesenheiten & Arbeitszeiten
                    </MenuItem>
                  ] : []),
                  ...(
                    !user
                      ? [
                          <MenuItem key="login" onClick={() => { handleClose(); router.push('/login') }}>
                            Login
                          </MenuItem>,
                          <MenuItem key="register" onClick={() => { handleClose(); router.push('/register') }}>
                            Registrieren
                          </MenuItem>
                        ]
                      : [
                          <MenuItem key="dashboard" onClick={() => { handleClose(); router.push('/dashboard') }}>
                            Dashboard
                          </MenuItem>,
                          ...(role === 'admin'
                            ? [
                                <MenuItem key="admin" onClick={() => { handleClose(); router.push('/admin') }}>
                                  Admin
                                </MenuItem>
                              ]
                            : []),
                          ...(role === 'staff'
                            ? [
                                <MenuItem key="staff-dashboard" onClick={() => { handleClose(); router.push('/staff-dashboard') }}>
                                  Staff
                                </MenuItem>
                              ]
                            : []),
                          <MenuItem key="logout" onClick={() => { handleClose(); handleLogout() }}>
                            Logout
                          </MenuItem>
                        ]
                  )
                ]}
              </Menu>
            </Box>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  )
}

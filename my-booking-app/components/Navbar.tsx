
'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
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
  useMediaQuery,
  Avatar,
  Stack,
  Divider,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import LoginIcon from '@mui/icons-material/Login'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import DashboardIcon from '@mui/icons-material/Dashboard'
import LogoutIcon from '@mui/icons-material/Logout'
import { useAuth } from '@/context/AuthContext'
import SettingsIcon from '@mui/icons-material/Settings'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import CheckIcon from '@mui/icons-material/Check';
import StorefrontIcon from '@mui/icons-material/Storefront';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CategoryIcon from '@mui/icons-material/Category';

import { fetchSalons, type Salon } from '@/services/api'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import BarChartIcon from '@mui/icons-material/BarChart';


export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const isMobile = useMediaQuery('(max-width:999px)', { noSsr: true })
  const [hydrated, setHydrated] = useState(false)

  const [cashMenuAnchor, setCashMenuAnchor] = useState<null | HTMLElement>(null);

  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null)
  const [salonMenuAnchor, setSalonMenuAnchor] = useState<null | HTMLElement>(null)
  const [adminMenuAnchor, setAdminMenuAnchor] = useState<null | HTMLElement>(null)

  const [salons, setSalons] = useState<Salon[]>([])
  const [activeSalonId, setActiveSalonId] = useState<string | null>(null)

  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (user?.role !== 'admin') return;

    const loadSalons = async () => {
      try {
        const salonList = await fetchSalons();
        setSalons(salonList);

        const storedId = localStorage.getItem('activeSalonId');
        const activeSalonExists = salonList.some(s => s._id === storedId);
        
        let newActiveId = activeSalonExists ? storedId : salonList[0]?._id || null;

        if (newActiveId) {
          setActiveSalonId(newActiveId);
          localStorage.setItem('activeSalonId', newActiveId);
        }
      } catch (error) {
        console.error("Fehler beim Laden der Salons:", error);
      }
    };
    loadSalons();
  }, [user]);

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const handleSalonChange = (salonId: string) => {
    setActiveSalonId(salonId);
    localStorage.setItem('activeSalonId', salonId);
    window.dispatchEvent(new CustomEvent('activeSalonChanged', { detail: salonId }));
    setSalonMenuAnchor(null);
  };
  
  const activeSalon = salons.find(s => s._id === activeSalonId);

  const Brand = (
    <Typography
      variant="h6"
      sx={{ fontWeight: 800, cursor: 'pointer', letterSpacing: '-0.02em' }}
      onClick={() => router.push('/')}
    >
      MeinFrisör
    </Typography>
  )

  const adminNav = user?.role === 'admin' ? (
    <>
      <Button
        color="inherit"
        startIcon={<SettingsIcon />}
        onClick={(e) => setAdminMenuAnchor(e.currentTarget)}
      >
        Mein Salon
      </Button>
      <Menu
        anchorEl={adminMenuAnchor}
        open={Boolean(adminMenuAnchor)}
        onClose={() => setAdminMenuAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={() => { setAdminMenuAnchor(null); router.push('/admin/dashboard') }}>
            <BarChartIcon sx={{ mr: 1.5 }}/> Dashboard
        </MenuItem>
        <Button color="inherit" onClick={(e) => setCashMenuAnchor(e.currentTarget)}>Kasse</Button>
                        <Menu
                            anchorEl={cashMenuAnchor}
                            open={Boolean(cashMenuAnchor)}
                            onClose={() => setCashMenuAnchor(null)}
                        >
                            <MenuItem onClick={() => { setCashMenuAnchor(null); router.push('/admin/cash-transactions') }}><AttachMoneyIcon sx={{ mr: 1.5 }}/> Kassenbewegungen</MenuItem>
                            <MenuItem onClick={() => { setCashMenuAnchor(null); router.push('/admin/cash-closing') }}><PointOfSaleIcon sx={{ mr: 1.5 }}/> Kassenabschluss</MenuItem>
                        </Menu>
        <MenuItem onClick={() => { setAdminMenuAnchor(null); router.push('/admin/catalog') }}><CategoryIcon sx={{ mr: 1.5 }}/> Katalog & Salons</MenuItem>
        <MenuItem onClick={() => { setAdminMenuAnchor(null); router.push('/admin/products') }}><ShoppingBagIcon sx={{ mr: 1.5 }}/> Produkte</MenuItem>
        <MenuItem onClick={() => { setAdminMenuAnchor(null); router.push('/admin/availability') }}><ScheduleIcon sx={{ mr: 1.5 }}/> Arbeitszeiten</MenuItem>
        <MenuItem onClick={() => { setAdminMenuAnchor(null); router.push('/admin/availability/templates') }}><ScheduleIcon sx={{ mr: 1.5 }}/> Zeit-Vorlagen</MenuItem>
        <MenuItem onClick={() => { setAdminMenuAnchor(null); router.push('/admin/invoices') }}><ReceiptLongIcon sx={{ mr: 1.5 }}/> Rechnungen</MenuItem>
        <MenuItem onClick={() => { setAdminMenuAnchor(null); router.push('/admin/cash-closing') }}><PointOfSaleIcon sx={{ mr: 1.5 }}/> Kassenabschluss</MenuItem>
        <MenuItem onClick={() => { setAdminMenuAnchor(null); router.push('/admin/settings/pin') }}>
          <VpnKeyIcon sx={{ mr: 1.5 }}/> PIN-Verwaltung
        </MenuItem>
        <ListItem disablePadding>
          <ListItemButton component="a" href="/admin/cash-register">
            <ListItemIcon><PointOfSaleIcon /></ListItemIcon>
            <ListItemText primary="Kasse" />
          </ListItemButton>
        </ListItem>
      </Menu>

      <Button
        color="inherit"
        onClick={(e) => setSalonMenuAnchor(e.currentTarget)}
        sx={{ textTransform: 'none' }}
        endIcon={<ArrowDropDownIcon />}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Avatar sx={{ width: 28, height: 28, fontSize: 14, bgcolor: 'secondary.main', color: 'white' }}>
            <StorefrontIcon fontSize="small" />
          </Avatar>
          <Typography sx={{ fontWeight: 600 }}>{activeSalon?.name || 'Salon wählen'}</Typography>
        </Stack>
      </Button>
      <Menu
        anchorEl={salonMenuAnchor}
        open={Boolean(salonMenuAnchor)}
        onClose={() => setSalonMenuAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {salons.map(s => (
          <MenuItem key={s._id} onClick={() => handleSalonChange(s._id)} selected={s._id === activeSalonId}>
            {s.name}
            {s._id === activeSalonId && <CheckIcon fontSize="small" sx={{ ml: 'auto' }} />}
          </MenuItem>
        ))}
      </Menu>
      <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
    </>
  ) : null;

  const userNav = (
    <>
      <Button color="inherit" onClick={() => router.push('/booking')}>Termin buchen</Button>
      {/* KORREKTUR: Zeige den Dashboard-Button nur für 'user' und 'staff' an */}
      {user && user.role !== 'admin' && (
          <Button color="inherit" onClick={() => router.push(user.role === 'staff' ? '/staff-dashboard' : '/dashboard')}>
              Dashboard
          </Button>
      )}
      {user?.role === 'admin' && (
          <Button color="inherit" onClick={() => router.push('/admin')}>
            Kalender
          </Button>
      )}
    </>
  );

  return (
    <AppBar
      position="sticky"
      color="transparent"
      elevation={0}
      sx={{
        borderBottom: '1px solid #EFEBE9',
        backdropFilter: 'blur(8px)',
        backgroundColor: 'rgba(253, 251, 247, 0.8)',
      }}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ gap: 1 }}>
          {Brand}
          <Box sx={{ flexGrow: 1 }} />

          {hydrated && !isMobile && (
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
              {userNav}
              {adminNav}
              {!user ? (
                <>
                  <Button startIcon={<LoginIcon />} color="inherit" onClick={() => router.push('/login')}>Login</Button>
                  <Button startIcon={<PersonAddIcon />} variant="contained" onClick={() => router.push('/register')}>Registrieren</Button>
                </>
              ) : (
                <Button variant="outlined" onClick={handleLogout}>Logout</Button>
              )}
            </Box>
          )}

          {hydrated && isMobile && (
             <Box>
              <IconButton color="inherit" onClick={(e) => setMobileMenuAnchor(e.currentTarget)}><MenuIcon /></IconButton>
              <Menu anchorEl={mobileMenuAnchor} open={Boolean(mobileMenuAnchor)} onClose={() => setMobileMenuAnchor(null)}>
                 {/* Hier können die mobilen Links eingefügt werden */}
              </Menu>
            </Box>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  )
}
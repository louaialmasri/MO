'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  ListItemIcon,
  ListItemText
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LoginIcon from '@mui/icons-material/Login';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import CheckIcon from '@mui/icons-material/Check';
import StorefrontIcon from '@mui/icons-material/Storefront';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CategoryIcon from '@mui/icons-material/Category';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import BuildIcon from '@mui/icons-material/Build';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import DashboardIcon from '@mui/icons-material/Dashboard';

import { useAuth } from '@/context/AuthContext';
import { fetchSalons, type Salon } from '@/services/api';

export default function Navbar() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const isMobile = useMediaQuery('(max-width:1099px)', { noSsr: true });

  // --- ANGEPASSTE STATES FÜR MENÜS ---
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null);
  const [salonMenuAnchor, setSalonMenuAnchor] = useState<null | HTMLElement>(null);
  const [anchorElKasse, setAnchorElKasse] = useState<null | HTMLElement>(null);
  const [anchorElVerwaltung, setAnchorElVerwaltung] = useState<null | HTMLElement>(null);
  const [anchorElSettings, setAnchorElSettings] = useState<null | HTMLElement>(null);

  const [salons, setSalons] = useState<Salon[]>([]);
  const [activeSalonId, setActiveSalonId] = useState<string | null>(null);

  // --- NEUE HANDLER FÜR HOVER-MENÜS ---
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, menu: 'kasse' | 'verwaltung' | 'settings') => {
    if (menu === 'kasse') setAnchorElKasse(event.currentTarget);
    else if (menu === 'verwaltung') setAnchorElVerwaltung(event.currentTarget);
    else if (menu === 'settings') setAnchorElSettings(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setAnchorElKasse(null);
    setAnchorElVerwaltung(null);
    setAnchorElSettings(null);
  };

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
    logout();
    setMobileMenuAnchor(null);
    router.push('/login');
  };

  const handleSalonChange = (salonId: string) => {
    setActiveSalonId(salonId);
    localStorage.setItem('activeSalonId', salonId);
    window.dispatchEvent(new CustomEvent('activeSalonChanged', { detail: salonId }));
    setSalonMenuAnchor(null);
  };
  
  const activeSalon = salons.find(s => s._id === activeSalonId);

  const handleNavigate = (path: string) => {
    handleMenuClose();
    setMobileMenuAnchor(null);
    router.push(path);
  };

  const Brand = (
    <Typography variant="h6" sx={{ fontWeight: 800, cursor: 'pointer' }} onClick={() => router.push('/')}>
      MeinFrisör
    </Typography>
  );

  const adminNav = user?.role === 'admin' ? (
    <>
      <Button color="inherit" onClick={() => router.push('/admin/dashboard')}>Dashboard</Button>
      <Button color="inherit" onClick={() => router.push('/admin')}>Kalender</Button>

      {/* --- Kassen-Menü (mit Hover) --- */}
      <Box onMouseLeave={handleMenuClose}>
        <Button
          color="inherit"
          onMouseEnter={(e) => handleMenuOpen(e, 'kasse')}
        >
          Kasse
        </Button>
        <Menu
          anchorEl={anchorElKasse}
          open={Boolean(anchorElKasse)}
          onClose={handleMenuClose}
          MenuListProps={{ onMouseLeave: handleMenuClose }}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        >
          <MenuItem onClick={() => handleNavigate('/admin/cash-register')}><PointOfSaleIcon fontSize="small" sx={{ mr: 1.5 }}/>Sofortverkauf</MenuItem>
          <MenuItem onClick={() => handleNavigate('/admin/cash-closing')}><ReceiptLongIcon fontSize="small" sx={{ mr: 1.5 }}/>Kassenabschluss</MenuItem>
        </Menu>
      </Box>

      {/* --- Verwaltungs-Menü (mit Hover) --- */}
      <Box onMouseLeave={handleMenuClose}>
        <Button
          color="inherit"
          onMouseEnter={(e) => handleMenuOpen(e, 'verwaltung')}
        >
          Verwaltung
        </Button>
        <Menu
          anchorEl={anchorElVerwaltung}
          open={Boolean(anchorElVerwaltung)}
          onClose={handleMenuClose}
          MenuListProps={{ onMouseLeave: handleMenuClose }}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        >
          <MenuItem onClick={() => handleNavigate('/admin/catalog')}><CategoryIcon fontSize="small" sx={{ mr: 1.5 }}/>Katalog</MenuItem>
          <MenuItem onClick={() => handleNavigate('/admin/products')}><ShoppingBagIcon fontSize="small" sx={{ mr: 1.5 }}/>Produkte</MenuItem>
          <MenuItem onClick={() => handleNavigate('/admin/invoices')}><ReceiptLongIcon fontSize="small" sx={{ mr: 1.5 }}/>Rechnungen</MenuItem>
        </Menu>
      </Box>

      {/* --- Einstellungs-Menü (mit Hover) --- */}
      <Box onMouseLeave={handleMenuClose}>
        <Button
          color="inherit"
          onMouseEnter={(e) => handleMenuOpen(e, 'settings')}
          sx={{ minWidth: 'auto', px: 1 }}
        >
          <SettingsIcon />
        </Button>
        <Menu
          anchorEl={anchorElSettings}
          open={Boolean(anchorElSettings)}
          onClose={handleMenuClose}
          MenuListProps={{ onMouseLeave: handleMenuClose }}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <MenuItem onClick={() => handleNavigate('/admin/availability')}><ScheduleIcon fontSize="small" sx={{ mr: 1.5 }}/>Arbeitszeiten</MenuItem>
          <MenuItem onClick={() => handleNavigate('/admin/availability/templates')}><BuildIcon fontSize="small" sx={{ mr: 1.5 }}/>Zeit-Vorlagen</MenuItem>
          <Divider />
          <MenuItem onClick={() => handleNavigate('/admin/settings/pin')}><VpnKeyIcon fontSize="small" sx={{ mr: 1.5 }}/>PIN-Verwaltung</MenuItem>
        </Menu>
      </Box>

      <Button color="inherit" onClick={(e) => setSalonMenuAnchor(e.currentTarget)} endIcon={<ArrowDropDownIcon />}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Avatar sx={{ width: 28, height: 28, bgcolor: 'secondary.main' }}><StorefrontIcon fontSize="small" /></Avatar>
          <Typography sx={{ fontWeight: 600, textTransform: 'none' }}>{activeSalon?.name || 'Salon wählen'}</Typography>
        </Stack>
      </Button>
      <Menu anchorEl={salonMenuAnchor} open={Boolean(salonMenuAnchor)} onClose={() => setSalonMenuAnchor(null)}>
        {salons.map(s => (
          <MenuItem key={s._id} onClick={() => handleSalonChange(s._id)} selected={s._id === activeSalonId}>
            <ListItemText>{s.name}</ListItemText>
            {s._id === activeSalonId && <ListItemIcon><CheckIcon fontSize="small" /></ListItemIcon>}
          </MenuItem>
        ))}
      </Menu>
      <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
    </>
  ) : null;

  const userNav = (
    <>
      <Button color="inherit" onClick={() => router.push('/booking')}>Termin buchen</Button>
      {user && user.role !== 'admin' && (
        <Button color="inherit" onClick={() => router.push(user.role === 'staff' ? '/staff-dashboard' : '/dashboard')}>
          Meine Termine
        </Button>
      )}
    </>
  );
  
  const mobileMenuItems = (
    user ? [
        user.role === 'admin' && <MenuItem key="dash" onClick={() => handleNavigate('/admin/dashboard')}><DashboardIcon fontSize="small" sx={{mr: 1.5}}/>Dashboard</MenuItem>,
        user.role === 'admin' && <MenuItem key="cal" onClick={() => handleNavigate('/admin')}><CalendarMonthIcon fontSize="small" sx={{mr: 1.5}}/>Kalender</MenuItem>,
        user.role === 'admin' && <Divider key="div1"/>,
        user.role === 'admin' && <MenuItem key="cash-reg" onClick={() => handleNavigate('/admin/cash-register')}><PointOfSaleIcon fontSize="small" sx={{mr: 1.5}}/>Sofortverkauf</MenuItem>,
        user.role === 'admin' && <MenuItem key="cash-close" onClick={() => handleNavigate('/admin/cash-closing')}><ReceiptLongIcon fontSize="small" sx={{mr: 1.5}}/>Kassenabschluss</MenuItem>,
        user.role === 'admin' && <Divider key="div2"/>,
        user.role === 'admin' && <MenuItem key="cat" onClick={() => handleNavigate('/admin/catalog')}><CategoryIcon fontSize="small" sx={{mr: 1.5}}/>Katalog</MenuItem>,
        user.role === 'admin' && <MenuItem key="prod" onClick={() => handleNavigate('/admin/products')}><ShoppingBagIcon fontSize="small" sx={{mr: 1.5}}/>Produkte</MenuItem>,
        user.role === 'admin' && <MenuItem key="inv" onClick={() => handleNavigate('/admin/invoices')}><ReceiptLongIcon fontSize="small" sx={{mr: 1.5}}/>Rechnungen</MenuItem>,
        user.role === 'admin' && <Divider key="div3"/>,
        user.role === 'admin' && <MenuItem key="avail" onClick={() => handleNavigate('/admin/availability')}><ScheduleIcon fontSize="small" sx={{mr: 1.5}}/>Arbeitszeiten</MenuItem>,
        user.role === 'admin' && <MenuItem key="pin" onClick={() => handleNavigate('/admin/settings/pin')}><VpnKeyIcon fontSize="small" sx={{mr: 1.5}}/>PIN-Verwaltung</MenuItem>,
        <Divider key="div4"/>,
        
        user.role !== 'admin' && <MenuItem key="book" onClick={() => handleNavigate('/booking')}>Termin buchen</MenuItem>,
        user.role === 'user' && <MenuItem key="user-dash" onClick={() => handleNavigate('/dashboard')}>Meine Termine</MenuItem>,
        user.role === 'staff' && <MenuItem key="staff-dash" onClick={() => handleNavigate('/staff-dashboard')}>Meine Termine</MenuItem>,
        <MenuItem key="logout" onClick={handleLogout}><LogoutIcon fontSize="small" sx={{mr: 1.5}}/>Logout</MenuItem>
      ] : [
        <MenuItem key="login" onClick={() => handleNavigate('/login')}><LoginIcon fontSize="small" sx={{mr: 1.5}}/>Login</MenuItem>,
        <MenuItem key="register" onClick={() => handleNavigate('/register')}><PersonAddIcon fontSize="small" sx={{mr: 1.5}}/>Registrieren</MenuItem>
      ]
  );


  return (
    <AppBar position="sticky" color="transparent" elevation={0} sx={{ borderBottom: '1px solid #EFEBE9', backdropFilter: 'blur(8px)', backgroundColor: 'rgba(253, 251, 247, 0.8)' }}>
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          {Brand}
          <Box sx={{ flexGrow: 1 }} />

          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
              {user && user.role !== 'admin' ? userNav : null}
              {adminNav}
              {!user ? (
                <>
                  <Button startIcon={<LoginIcon />} color="inherit" onClick={() => router.push('/login')}>Login</Button>
                  <Button startIcon={<PersonAddIcon />} variant="contained" onClick={() => router.push('/register')}>Registrieren</Button>
                </>
              ) : (
                <Button variant="outlined" onClick={handleLogout} startIcon={<LogoutIcon/>}>Logout</Button>
              )}
            </Box>
          )}

          {isMobile && (
             <Box>
              <IconButton color="inherit" onClick={(e) => setMobileMenuAnchor(e.currentTarget)}><MenuIcon /></IconButton>
              <Menu anchorEl={mobileMenuAnchor} open={Boolean(mobileMenuAnchor)} onClose={() => setMobileMenuAnchor(null)}>
                 {mobileMenuItems}
              </Menu>
            </Box>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
}
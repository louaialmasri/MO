'use client';

import { useState, useEffect, useRef, JSX } from 'react';
import { useRouter } from 'next/navigation';
import {
  AppBar,
  Toolbar,
  Container,
  Button,
  IconButton,
  Box,
  Typography,
  useMediaQuery,
  Avatar,
  Stack,
  Divider,
  ListItemIcon,
  ListItemText,
  Paper,
  MenuItem,
  Popper,
  Menu
} from '@mui/material';

import MenuIcon from '@mui/icons-material/Menu';
import LoginIcon from '@mui/icons-material/Login';
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
import ContentCutIcon from '@mui/icons-material/ContentCut';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';

import { useAuth } from '@/context/AuthContext';
import { fetchSalons, type Salon } from '@/services/api';

export default function Navbar() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const isMobile = useMediaQuery('(max-width:1099px)', { noSsr: true });

  const [scrolled, setScrolled] = useState(false);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null);
  const [salonMenuAnchor, setSalonMenuAnchor] = useState<null | HTMLElement>(null);
  const [anchorElKasse, setAnchorElKasse] = useState<null | HTMLElement>(null);
  const [anchorElVerwaltung, setAnchorElVerwaltung] = useState<null | HTMLElement>(null);
  const [anchorElSettings, setAnchorElSettings] = useState<null | HTMLElement>(null);

  const [salons, setSalons] = useState<Salon[]>([]);
  const [activeSalonId, setActiveSalonId] = useState<string | null>(null);

  const closeTimer = useRef<NodeJS.Timeout | null>(null);

  const clearCloseTimer = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  const closeAllMenus = () => {
    setAnchorElKasse(null);
    setAnchorElVerwaltung(null);
    setAnchorElSettings(null);
  };

  const handleMenuLeave = () => {
    clearCloseTimer();
    closeTimer.current = setTimeout(closeAllMenus, 150);
  };

  const handleMenuEnter = () => {
    clearCloseTimer();
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, menu: 'kasse' | 'verwaltung' | 'settings') => {
    clearCloseTimer();
    closeAllMenus();
    if (menu === 'kasse') setAnchorElKasse(event.currentTarget);
    else if (menu === 'verwaltung') setAnchorElVerwaltung(event.currentTarget);
    else if (menu === 'settings') setAnchorElSettings(event.currentTarget);
  };

  useEffect(() => {
    if (user?.role !== 'admin') return;
    const loadSalons = async () => {
      try {
        const salonList = await fetchSalons();
        setSalons(salonList);
        const storedId = localStorage.getItem('activeSalonId');
        const activeSalonExists = salonList.some(s => s._id === storedId);
        const newActiveId = activeSalonExists ? storedId : salonList[0]?._id || null;
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

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const handleNavigate = (path: string) => {
    closeAllMenus();
    setMobileMenuAnchor(null);
    router.push(path);
  };

  const activeSalon = salons.find(s => s._id === activeSalonId);

  const Brand = (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ cursor: 'pointer', transition: 'color 0.3s' }} onClick={() => router.push('/')}>
       <ContentCutIcon sx={{ color: scrolled ? 'primary.main' : 'white' }} />
       <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.5px', color: scrolled ? 'text.primary' : 'white' }}>
         MeinFrisör
       </Typography>
    </Stack>
  );

  const navButtonStyle = (buttonName: string) => ({
    color: scrolled ? 'text.primary' : 'white',
    opacity: hoveredButton && hoveredButton !== buttonName ? 0.5 : 1,
    transition: 'opacity 0.2s ease-in-out, color 0.3s ease-in-out',
    '&:hover': {
      color: scrolled ? 'primary.main' : 'white',
    },
  });

  const renderDropdown = (anchor: HTMLElement | null, items: JSX.Element[]) => (
    <Popper open={Boolean(anchor)} anchorEl={anchor} placement="bottom-start" disablePortal>
      <Paper onMouseEnter={handleMenuEnter} onMouseLeave={handleMenuLeave} sx={{ p: 1 }}>
        {items}
      </Paper>
    </Popper>
  );

  const adminNav = user?.role === 'admin' && (
    <Box onMouseLeave={() => setHoveredButton(null)}>
      <Button sx={navButtonStyle('dashboard')} onMouseEnter={() => setHoveredButton('dashboard')} onClick={() => router.push('/admin/dashboard')}>Dashboard</Button>
      <Button sx={navButtonStyle('kalender')} onMouseEnter={() => setHoveredButton('kalender')} onClick={() => router.push('/admin')}>Kalender</Button>

      <Button sx={navButtonStyle('booking')} onMouseEnter={() => setHoveredButton('booking')} onClick={() => router.push('/booking')}>Termin buchen</Button>

      <Box onMouseEnter={(e) => { handleMenuOpen(e, 'kasse'); setHoveredButton('kasse'); }} onMouseLeave={handleMenuLeave} sx={{ position: 'relative', display: 'inline-block' }}>
        <Button sx={navButtonStyle('kasse')}>Kasse</Button>
        {renderDropdown(anchorElKasse, [
          <MenuItem key="cash1" onClick={() => handleNavigate('/admin/cash-register')}><PointOfSaleIcon fontSize="small" sx={{ mr: 1.5 }} /> Sofortverkauf</MenuItem>,
          <MenuItem key="cash2" onClick={() => handleNavigate('/admin/cash-closing')}><ReceiptLongIcon fontSize="small" sx={{ mr: 1.5 }} /> Kassenabschluss</MenuItem>,
        ])}
      </Box>

      <Box onMouseEnter={(e) => { handleMenuOpen(e, 'verwaltung'); setHoveredButton('verwaltung'); }} onMouseLeave={handleMenuLeave} sx={{ position: 'relative', display: 'inline-block' }}>
        <Button sx={navButtonStyle('verwaltung')}>Verwaltung</Button>
        {renderDropdown(anchorElVerwaltung, [
          <MenuItem key="cat" onClick={() => handleNavigate('/admin/catalog')}><CategoryIcon fontSize="small" sx={{ mr: 1.5 }} /> Katalog</MenuItem>,
          <MenuItem key="prod" onClick={() => handleNavigate('/admin/products')}><ShoppingBagIcon fontSize="small" sx={{ mr: 1.5 }} /> Produkte</MenuItem>,
          <MenuItem key="inv" onClick={() => handleNavigate('/admin/invoices')}><ReceiptLongIcon fontSize="small" sx={{ mr: 1.5 }} /> Rechnungen</MenuItem>,
        ])}
      </Box>

      <Box onMouseEnter={(e) => { handleMenuOpen(e, 'settings'); setHoveredButton('settings'); }} onMouseLeave={handleMenuLeave} sx={{ position: 'relative', display: 'inline-block' }}>
        <IconButton sx={navButtonStyle('settings')}><SettingsIcon /></IconButton>
        {renderDropdown(anchorElSettings, [
          <MenuItem key="avail" onClick={() => handleNavigate('/admin/availability')}><ScheduleIcon fontSize="small" sx={{ mr: 1.5 }} /> Arbeitszeiten</MenuItem>,
          <MenuItem key="template" onClick={() => handleNavigate('/admin/availability/templates')}><BuildIcon fontSize="small" sx={{ mr: 1.5 }} /> Zeit-Vorlagen</MenuItem>,
          <Divider key="div1" />,
          <MenuItem key="pin" onClick={() => handleNavigate('/admin/settings/pin')}><VpnKeyIcon fontSize="small" sx={{ mr: 1.5 }} /> PIN-Verwaltung</MenuItem>,
        ])}
      </Box>
      
      {/* HIER DIE ÄNDERUNG: "Mein Salon" Button ist jetzt gefüllt */}
      <Button
        variant="contained"
        color="primary"
        sx={{
          ...navButtonStyle('salon'),
          bgcolor: scrolled ? 'primary.main' : 'primary.main', // Immer Orange
          color: 'white', // Immer weiße Schrift
          '&:hover': {
            bgcolor: 'primary.dark',
          }
        }}
        onMouseEnter={() => setHoveredButton('salon')}
        onClick={(e) => setSalonMenuAnchor(e.currentTarget)}
        endIcon={<ArrowDropDownIcon />}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Avatar sx={{ width: 28, height: 28, bgcolor: 'rgba(255,255,255,0.2)' }}><StorefrontIcon fontSize="small" /></Avatar>
          <Typography sx={{ fontWeight: 600, textTransform: 'none', color: 'inherit' }}>{activeSalon?.name || 'Salon wählen'}</Typography>
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
      <Divider orientation="vertical" flexItem sx={{ mx: 1, borderColor: scrolled ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)' }} />
    </Box>
  );
  
  const userNav = (
    <Box onMouseLeave={() => setHoveredButton(null)}>
      {user && user.role !== 'admin' && (
        <Button sx={navButtonStyle('termine')} onMouseEnter={() => setHoveredButton('termine')} onClick={() => router.push(user.role === 'staff' ? '/staff-dashboard' : '/dashboard')}>Meine Termine</Button>
      )}
       {/* Button "Termin buchen" speziell für Staff hinzufügen */}
      {user && user.role === 'staff' && (
        <Button sx={navButtonStyle('booking')} onMouseEnter={() => setHoveredButton('booking')} onClick={() => router.push('/booking')}>Termin buchen</Button>
      )}
    </Box>
  );

  const mobileMenuItems = user ? [
    <MenuItem key="dashboard" onClick={() => handleNavigate(user.role === 'staff' ? '/staff-dashboard' : '/dashboard')}>Meine Termine</MenuItem>,
    <MenuItem key="booking" onClick={() => handleNavigate('/booking')}>Termin buchen</MenuItem>,
    <Divider key="divider" />,
    <MenuItem key="logout" onClick={handleLogout}><LogoutIcon fontSize="small" sx={{ mr: 1.5 }} />Logout</MenuItem>,
  ] : [
    <MenuItem key="login" onClick={() => handleNavigate('/login')}><LoginIcon fontSize="small" sx={{ mr: 1.5 }} />Login</MenuItem>,
    <MenuItem key="booking" onClick={() => handleNavigate('/booking')}><EventAvailableIcon fontSize="small" sx={{ mr: 1.5 }} />Jetzt Buchen</MenuItem>,
  ];

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 40px)',
        maxWidth: '1200px',
        borderRadius: '25px',
        backgroundColor: scrolled ? 'rgba(255, 255, 255, 0.8)' : 'rgba(28, 28, 28, 0.5)',
        backdropFilter: 'blur(10px)',
        border: scrolled ? '1px solid rgba(145, 158, 171, 0.2)' : '1px solid rgba(255, 255, 255, 0.1)',
        transition: 'background-color 0.3s ease-in-out, border-color 0.3s ease-in-out',
      }}
    >
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          {Brand}
          <Box sx={{ flexGrow: 1 }} />

          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {user && user.role !== 'admin' && userNav}
              {adminNav}
              {!user ? (
                <>
                  <Button
                    onClick={() => router.push('/login')}
                    sx={navButtonStyle('login')} onMouseEnter={() => setHoveredButton('login')}
                  >
                    Login
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => router.push('/booking')}
                  >
                    Jetzt Buchen
                  </Button>
                </>
              ) : (
                // HIER DIE ÄNDERUNG: Logout-Button mit neuem Stil
                <Button 
                  variant="outlined" 
                  color="primary" 
                  onClick={handleLogout}
                  sx={{
                    color: scrolled ? 'primary.main' : 'white',
                    borderColor: scrolled ? 'primary.main' : 'white',
                    '&:hover': {
                      backgroundColor: scrolled ? 'rgba(226, 103, 58, 0.08)' : 'rgba(255, 255, 255, 0.1)',
                      borderColor: scrolled ? 'primary.dark' : 'white',
                    }
                  }}
                >
                  Logout
                </Button>
              )}
            </Box>
          )}

          {isMobile && (
            <Box>
              <IconButton sx={{ color: scrolled ? 'text.primary' : 'white' }} onClick={(e) => setMobileMenuAnchor(e.currentTarget)}><MenuIcon /></IconButton>
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
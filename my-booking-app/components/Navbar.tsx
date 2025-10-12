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
  ClickAwayListener,
  Menu
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
import ContentCutIcon from '@mui/icons-material/ContentCut';

import { useAuth } from '@/context/AuthContext';
import { fetchSalons, type Salon } from '@/services/api';

export default function Navbar() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const isMobile = useMediaQuery('(max-width:1099px)', { noSsr: true });

  // --- State für Menüs ---
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null);
  const [salonMenuAnchor, setSalonMenuAnchor] = useState<null | HTMLElement>(null);
  const [anchorElKasse, setAnchorElKasse] = useState<null | HTMLElement>(null);
  const [anchorElVerwaltung, setAnchorElVerwaltung] = useState<null | HTMLElement>(null);
  const [anchorElSettings, setAnchorElSettings] = useState<null | HTMLElement>(null);

  const [salons, setSalons] = useState<Salon[]>([]);
  const [activeSalonId, setActiveSalonId] = useState<string | null>(null);

  // --- Hover-Delay ---
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

  // --- Salons laden ---
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

  // --- Aktionen ---
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

  // --- Brand ---
  const Brand = (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ cursor: 'pointer' }} onClick={() => router.push('/')}>
      <ContentCutIcon sx={{ color: 'primary.main' }} />
      <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.5px' }}>
        MeinFrisör
      </Typography>
    </Stack>
  );

  // --- Admin Navigation ---
  const renderDropdown = (anchor: HTMLElement | null, items: JSX.Element[]) => (
    <Popper open={Boolean(anchor)} anchorEl={anchor} placement="bottom-start" disablePortal>
      <Paper onMouseEnter={handleMenuEnter} onMouseLeave={handleMenuLeave} sx={{ p: 1 }}>
        {items}
      </Paper>
    </Popper>
  );

  const adminNav = user?.role === 'admin' && (
    <>
      <Button color="inherit" onClick={() => router.push('/admin/dashboard')}>Dashboard</Button>
      <Button color="inherit" onClick={() => router.push('/admin')}>Kalender</Button>

      {/* Kasse */}
      <Box onMouseEnter={(e) => handleMenuOpen(e, 'kasse')} onMouseLeave={handleMenuLeave} sx={{ position: 'relative' }}>
        <Button color="inherit">Kasse</Button>
        {renderDropdown(anchorElKasse, [
          <MenuItem key="cash1" onClick={() => handleNavigate('/admin/cash-register')}>
            <PointOfSaleIcon fontSize="small" sx={{ mr: 1.5 }} /> Sofortverkauf
          </MenuItem>,
          <MenuItem key="cash2" onClick={() => handleNavigate('/admin/cash-closing')}>
            <ReceiptLongIcon fontSize="small" sx={{ mr: 1.5 }} /> Kassenabschluss
          </MenuItem>,
        ])}
      </Box>

      {/* Verwaltung */}
      <Box onMouseEnter={(e) => handleMenuOpen(e, 'verwaltung')} onMouseLeave={handleMenuLeave} sx={{ position: 'relative' }}>
        <Button color="inherit">Verwaltung</Button>
        {renderDropdown(anchorElVerwaltung, [
          <MenuItem key="cat" onClick={() => handleNavigate('/admin/catalog')}><CategoryIcon fontSize="small" sx={{ mr: 1.5 }} /> Katalog</MenuItem>,
          <MenuItem key="prod" onClick={() => handleNavigate('/admin/products')}><ShoppingBagIcon fontSize="small" sx={{ mr: 1.5 }} /> Produkte</MenuItem>,
          <MenuItem key="inv" onClick={() => handleNavigate('/admin/invoices')}><ReceiptLongIcon fontSize="small" sx={{ mr: 1.5 }} /> Rechnungen</MenuItem>,
        ])}
      </Box>

      {/* Einstellungen */}
      <Box onMouseEnter={(e) => handleMenuOpen(e, 'settings')} onMouseLeave={handleMenuLeave} sx={{ position: 'relative' }}>
        <Button color="inherit" sx={{ minWidth: 'auto', px: 1 }}><SettingsIcon /></Button>
        {renderDropdown(anchorElSettings, [
          <MenuItem key="avail" onClick={() => handleNavigate('/admin/availability')}><ScheduleIcon fontSize="small" sx={{ mr: 1.5 }} /> Arbeitszeiten</MenuItem>,
          <MenuItem key="template" onClick={() => handleNavigate('/admin/availability/templates')}><BuildIcon fontSize="small" sx={{ mr: 1.5 }} /> Zeit-Vorlagen</MenuItem>,
          <Divider key="div1" />,
          <MenuItem key="pin" onClick={() => handleNavigate('/admin/settings/pin')}><VpnKeyIcon fontSize="small" sx={{ mr: 1.5 }} /> PIN-Verwaltung</MenuItem>,
        ])}
      </Box>

      {/* Salon-Auswahl */}
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
  );

  // --- User Navigation ---
  const userNav = (
    <>
      <Button color="inherit" onClick={() => router.push('/booking')}>Termin buchen</Button>
      {user && user.role !== 'admin' && (
        <Button color="inherit" onClick={() => router.push(user.role === 'staff' ? '/staff-dashboard' : '/dashboard')}>Meine Termine</Button>
      )}
    </>
  );

  // --- Mobile Menü ---
  const mobileMenuItems = user ? [
    // … deine bisherige mobileMenuItems-Logik …
  ] : [
    <MenuItem key="login" onClick={() => handleNavigate('/login')}><LoginIcon fontSize="small" sx={{ mr: 1.5 }} />Login</MenuItem>,
    <MenuItem key="register" onClick={() => handleNavigate('/register')}><PersonAddIcon fontSize="small" sx={{ mr: 1.5 }} />Registrieren</MenuItem>
  ];

  // --- Render ---
  return (
    <AppBar
      position="fixed" // Oben fixieren
      elevation={0}
      color="transparent"
      sx={{
        top: '20px', // Abstand von oben
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 40px)', // Breite anpassen
        maxWidth: '1200px', // Maximale Breite
        borderRadius: '25px', // Abgerundete Ecken
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        backgroundColor: 'rgba(28, 28, 28, 0.5)',
      }}
    >
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          {Brand} {/* Dein bestehendes Logo */}
          <Box sx={{ flexGrow: 1 }} />

          {/* Desktop Navigation */}
          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {user && user.role !== 'admin' && userNav}
              {adminNav}
              {!user ? (
                <>
                  <Button
                    color="inherit"
                    onClick={() => router.push('/login')}
                    sx={{ color: 'text.primary', borderRadius: '20px' }}
                  >
                    Login
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => router.push('/register')}
                  >
                    Registrieren
                  </Button>
                </>
              ) : (
                <Button variant="outlined" color="secondary" onClick={handleLogout} startIcon={<LogoutIcon />}>
                  Logout
                </Button>
              )}
            </Box>
          )}

          {/* Mobile Navigation (unverändert) */}
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

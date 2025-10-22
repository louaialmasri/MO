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

import SettingsApplicationsIcon from '@mui/icons-material/SettingsApplications';

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
    setMobileMenuAnchor(null); // Auch mobiles Menü schließen
    setSalonMenuAnchor(null); // Auch Salon-Menü schließen
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
          // Stelle sicher, dass die ID im Local Storage korrekt ist
          if (newActiveId !== storedId) {
             localStorage.setItem('activeSalonId', newActiveId);
          }
        } else {
            // Falls keine Salons vorhanden sind, leere den Local Storage
            localStorage.removeItem('activeSalonId');
        }
      } catch (error) {
        console.error("Fehler beim Laden der Salons:", error);
      }
    };
    loadSalons();
  }, [user]);
  
  // Effekt zum Aktualisieren der aktiven Salon-ID aus dem Local Storage,
  // falls sie sich extern ändert (z.B. durch die Einstellungsseite)
  useEffect(() => {
     const handleStorageChange = () => {
        const storedId = localStorage.getItem('activeSalonId');
        setActiveSalonId(storedId);
     };
     window.addEventListener('storage', handleStorageChange);
     // Auch auf benutzerdefiniertes Event hören (aus api.ts)
     window.addEventListener('activeSalonChanged', (event: Event) => {
         setActiveSalonId((event as CustomEvent).detail);
     });

     // Initialen Wert aus Local Storage setzen
     setActiveSalonId(localStorage.getItem('activeSalonId'));

     return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('activeSalonChanged', handleStorageChange); // Event-Listener aufräumen
     };
  }, []); // Nur beim Mounten ausführen

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    closeAllMenus(); // Alle Menüs schließen beim Logout
    router.push('/login');
  };

  const handleSalonChange = (salonId: string) => {
    setActiveSalonId(salonId);
    localStorage.setItem('activeSalonId', salonId);
    window.dispatchEvent(new CustomEvent('activeSalonChanged', { detail: salonId })); // Event auslösen
    setSalonMenuAnchor(null);
    // Optional: Seite neu laden, um sicherzustellen, dass alle Daten aktualisiert werden
    window.location.reload();
  };

  const handleNavigate = (path: string) => {
    closeAllMenus(); // Alle Menüs schließen bei Navigation
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
    <Popper open={Boolean(anchor)} anchorEl={anchor} placement="bottom-start" disablePortal sx={{ zIndex: 1300 /* Höher als AppBar */ }}>
      {/* Wichtig: handleMenuEnter/Leave hier, damit das Menü offen bleibt */}
      <Paper onMouseEnter={handleMenuEnter} onMouseLeave={handleMenuLeave} sx={{ mt: 1, boxShadow: 3, borderRadius: 2 }}>
        {items}
      </Paper>
    </Popper>
  );

  const adminNav = user?.role === 'admin' && (
    <Box onMouseLeave={() => setHoveredButton(null)}>
      {/* Dashboard, Kalender, Termin buchen */}
      <Button sx={navButtonStyle('dashboard')} onMouseEnter={() => setHoveredButton('dashboard')} onClick={() => router.push('/admin/dashboard')}>Dashboard</Button>
      <Button sx={navButtonStyle('kalender')} onMouseEnter={() => setHoveredButton('kalender')} onClick={() => router.push('/admin')}>Kalender</Button>
      <Button sx={navButtonStyle('booking')} onMouseEnter={() => setHoveredButton('booking')} onClick={() => router.push('/booking')}>Termin buchen</Button>

      {/* Kasse Dropdown */}
      <Box onMouseEnter={(e) => { handleMenuOpen(e, 'kasse'); setHoveredButton('kasse'); }} onMouseLeave={handleMenuLeave} sx={{ position: 'relative', display: 'inline-block' }}>
        <Button endIcon={<ArrowDropDownIcon />} sx={navButtonStyle('kasse')}>Kasse</Button>
        {renderDropdown(anchorElKasse, [
          <MenuItem key="cash1" onClick={() => handleNavigate('/admin/cash-register')}><PointOfSaleIcon fontSize="small" sx={{ mr: 1.5 }} /> Sofortverkauf</MenuItem>,
          <MenuItem key="cash2" onClick={() => handleNavigate('/admin/cash-closing')}><ReceiptLongIcon fontSize="small" sx={{ mr: 1.5 }} /> Kassenabschluss</MenuItem>,
        ])}
      </Box>

      {/* Verwaltung Dropdown */}
      <Box onMouseEnter={(e) => { handleMenuOpen(e, 'verwaltung'); setHoveredButton('verwaltung'); }} onMouseLeave={handleMenuLeave} sx={{ position: 'relative', display: 'inline-block' }}>
        <Button endIcon={<ArrowDropDownIcon />} sx={navButtonStyle('verwaltung')}>Verwaltung</Button>
        {renderDropdown(anchorElVerwaltung, [
          <MenuItem key="cat" onClick={() => handleNavigate('/admin/catalog')}><CategoryIcon fontSize="small" sx={{ mr: 1.5 }} /> Katalog</MenuItem>,
          <MenuItem key="prod" onClick={() => handleNavigate('/admin/products')}><ShoppingBagIcon fontSize="small" sx={{ mr: 1.5 }} /> Produkte</MenuItem>,
          <MenuItem key="inv" onClick={() => handleNavigate('/admin/invoices')}><ReceiptLongIcon fontSize="small" sx={{ mr: 1.5 }} /> Rechnungen</MenuItem>,
        ])}
      </Box>

      {/* --- EINSTELLUNGEN Dropdown --- */}
      <Box onMouseEnter={(e) => { handleMenuOpen(e, 'settings'); setHoveredButton('settings'); }} onMouseLeave={handleMenuLeave} sx={{ position: 'relative', display: 'inline-block' }}>
         {/* Button statt Icon für bessere Klickbarkeit */}
        <Button endIcon={<ArrowDropDownIcon />} sx={navButtonStyle('settings')} startIcon={<SettingsIcon />}>Einstellungen</Button>
        {renderDropdown(anchorElSettings, [
          // Hauptlink zur neuen Einstellungsseite
          <MenuItem key="general" onClick={() => handleNavigate('/admin/general')}><SettingsApplicationsIcon fontSize="small" sx={{ mr: 1.5 }} /> Allgemeine Einstellungen</MenuItem>,
          <Divider key="div-settings" />,
          // Spezifische Unterpunkte bleiben zur schnellen Navigation erhalten
          <MenuItem key="avail" onClick={() => handleNavigate('/admin/availability')}><ScheduleIcon fontSize="small" sx={{ mr: 1.5 }} /> Arbeitszeiten</MenuItem>,
          <MenuItem key="template" onClick={() => handleNavigate('/admin/availability/templates')}><BuildIcon fontSize="small" sx={{ mr: 1.5 }} /> Zeit-Vorlagen</MenuItem>,
        ])}
      </Box>

      {/* Salon Auswahl */}
       <Button
        variant={scrolled ? "outlined" : "contained"} // Stil je nach Scroll-Position
        color="primary"
        sx={{
          color: scrolled ? 'primary.main' : 'white', // Textfarbe anpassen
          borderColor: scrolled ? 'primary.main' : 'rgba(255,255,255,0.5)', // Randfarbe anpassen
          bgcolor: scrolled ? 'transparent' : 'rgba(255,255,255,0.1)', // Hintergrund anpassen
          '&:hover': {
            bgcolor: scrolled ? 'rgba(226, 103, 58, 0.08)' : 'rgba(255,255,255,0.2)',
            borderColor: scrolled ? 'primary.dark' : 'white',
          },
          ml: 1 // Etwas Abstand
        }}
        onMouseEnter={() => setHoveredButton('salon')}
        onClick={(e) => setSalonMenuAnchor(e.currentTarget)}
        endIcon={<ArrowDropDownIcon />}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Avatar sx={{ width: 28, height: 28, bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}><StorefrontIcon fontSize="small" /></Avatar>
          <Typography sx={{ fontWeight: 600, textTransform: 'none', color: 'inherit' }}>{activeSalon?.name || 'Salon wählen'}</Typography>
        </Stack>
      </Button>

      <Menu anchorEl={salonMenuAnchor} open={Boolean(salonMenuAnchor)} onClose={() => setSalonMenuAnchor(null)}>
        {salons.length === 0 && <MenuItem disabled>Keine Salons gefunden.</MenuItem>}
        {salons.map(s => (
          <MenuItem key={s._id} onClick={() => handleSalonChange(s._id)} selected={s._id === activeSalonId}>
            <ListItemText>{s.name}</ListItemText>
            {s._id === activeSalonId && <ListItemIcon sx={{minWidth: 'auto', ml: 1}}><CheckIcon fontSize="small" color="primary" /></ListItemIcon>}
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
        elevation={scrolled ? 2 : 0} // Leichter Schatten beim Scrollen
        sx={{
            top: { xs: '10px', md: '20px'}, // Etwas weniger Abstand auf Mobilgeräten
            left: '50%',
            transform: 'translateX(-50%)',
            width: { xs: 'calc(100% - 20px)', md: 'calc(100% - 40px)' }, // Schmaler auf Mobilgeräten
            maxWidth: '1300px', // Etwas breiter für große Bildschirme
            borderRadius: { xs: '15px', md: '25px'}, // Weniger Rundung auf Mobilgeräten
            backgroundColor: scrolled ? 'rgba(255, 255, 255, 0.85)' : 'rgba(28, 28, 28, 0.5)',
            backdropFilter: 'blur(10px)',
            border: scrolled ? '1px solid rgba(145, 158, 171, 0.2)' : '1px solid rgba(255, 255, 255, 0.1)',
            transition: 'background-color 0.3s ease-in-out, border-color 0.3s ease-in-out, top 0.3s, border-radius 0.3s, width 0.3s',
            zIndex: 1200, // Sicherstellen, dass sie über anderen Elementen liegt
        }}
        >
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ minHeight: { xs: 56, sm: 64, md: 70 } }}> {/* Höhe angepasst */}
          {Brand}
          <Box sx={{ flexGrow: 1 }} />

          {/* Desktop Navigation */}
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
                    sx={{ boxShadow: '0 4px 12px rgba(226,103,58,0.3)', '&:hover': { boxShadow: '0 2px 8px rgba(226,103,58,0.4)' } }} // Angepasster Schatten
                  >
                    Jetzt Buchen
                  </Button>
                </>
              ) : (
                <Button
                  variant="outlined"
                  onClick={handleLogout}
                  sx={{
                    color: scrolled ? 'primary.main' : 'white',
                    borderColor: scrolled ? 'primary.main' : 'rgba(255,255,255,0.5)',
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

          {/* Mobile Navigation */}
          {isMobile && (
            <Box>
              <IconButton sx={{ color: scrolled ? 'text.primary' : 'white' }} onClick={(e) => setMobileMenuAnchor(e.currentTarget)}><MenuIcon /></IconButton>
              <Menu anchorEl={mobileMenuAnchor} open={Boolean(mobileMenuAnchor)} onClose={() => setMobileMenuAnchor(null)}>
                 {/* Admin Menüpunkte für Mobile */}
                 {user?.role === 'admin' && [
                    <MenuItem key="m-dash" onClick={() => handleNavigate('/admin/dashboard')}>Dashboard</MenuItem>,
                    <MenuItem key="m-cal" onClick={() => handleNavigate('/admin')}>Kalender</MenuItem>,
                    <MenuItem key="m-book" onClick={() => handleNavigate('/booking')}>Termin buchen</MenuItem>,
                    <Divider key="m-div1" />,
                    <MenuItem key="m-cash-reg" onClick={() => handleNavigate('/admin/cash-register')}>Sofortverkauf</MenuItem>,
                    <MenuItem key="m-cash-close" onClick={() => handleNavigate('/admin/cash-closing')}>Kassenabschluss</MenuItem>,
                     <Divider key="m-div2" />,
                    <MenuItem key="m-catalog" onClick={() => handleNavigate('/admin/catalog')}>Katalog</MenuItem>,
                    <MenuItem key="m-products" onClick={() => handleNavigate('/admin/products')}>Produkte</MenuItem>,
                    <MenuItem key="m-invoices" onClick={() => handleNavigate('/admin/invoices')}>Rechnungen</MenuItem>,
                     <Divider key="m-div3" />,
                     <MenuItem key="m-settings" onClick={() => handleNavigate('/admin/settings/general')}>Einstellungen</MenuItem>,
                     <MenuItem key="m-avail" onClick={() => handleNavigate('/admin/availability')}>Arbeitszeiten</MenuItem>,
                     <MenuItem key="m-template" onClick={() => handleNavigate('/admin/availability/templates')}>Zeit-Vorlagen</MenuItem>,
                     <Divider key="m-div4" />,
                 ]}
                 {/* User/Staff Menüpunkte für Mobile */}
                 {user && user.role !== 'admin' && [
                     <MenuItem key="m-user-dash" onClick={() => handleNavigate(user.role === 'staff' ? '/staff-dashboard' : '/dashboard')}>Meine Termine</MenuItem>,
                     <MenuItem key="m-user-book" onClick={() => handleNavigate('/booking')}>Termin buchen</MenuItem>,
                     <Divider key="m-user-div" />,
                 ]}
                 {/* Allgemeine Menüpunkte */}
                 {user ?
                    <MenuItem key="m-logout" onClick={handleLogout}><LogoutIcon fontSize="small" sx={{ mr: 1.5 }} />Logout</MenuItem>
                 : [
                    <MenuItem key="m-login" onClick={() => handleNavigate('/login')}><LoginIcon fontSize="small" sx={{ mr: 1.5 }} />Login</MenuItem>,
                    <MenuItem key="m-register" onClick={() => handleNavigate('/register')}>Registrieren</MenuItem>,
                    <MenuItem key="m-guest-book" onClick={() => handleNavigate('/booking')}><EventAvailableIcon fontSize="small" sx={{ mr: 1.5 }} />Jetzt Buchen</MenuItem>,
                 ]}
              </Menu>
            </Box>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
}
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
  Menu,
  useTheme, // Import useTheme hook
  Tooltip, // <<< NEU: Import für Tooltip
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
// VpnKeyIcon wird nicht mehr direkt im Menü benötigt
import BuildIcon from '@mui/icons-material/Build';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import SettingsApplicationsIcon from '@mui/icons-material/SettingsApplications'; // Neues Icon für allgemeine Einstellungen

import DashboardIcon from '@mui/icons-material/Dashboard'; // <<< NEU: Import für Dashboard Icon

import { useAuth } from '@/context/AuthContext';
import { fetchSalons, type Salon } from '@/services/api';

export default function Navbar() {
  const router = useRouter();
  const theme = useTheme(); // Get theme object
  const { user, logout } = useAuth();
  const isMobile = useMediaQuery('(max-width:1099px)', { noSsr: true });

  const [scrolled, setScrolled] = useState(false);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null);
  const [salonMenuAnchor, setSalonMenuAnchor] = useState<null | HTMLElement>(null);
  const [anchorElKasse, setAnchorElKasse] = useState<null | HTMLElement>(null);
  const [anchorElVerwaltung, setAnchorElVerwaltung] = useState<null | HTMLElement>(null);
  const [anchorElSettings, setAnchorElSettings] = useState<null | HTMLElement>(null);
  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null); // <<< NEU: State für User-Menü

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
    setAnchorElUser(null); // <<< NEU: User-Menü schließen
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
    closeAllMenus(); // Schließe alle *anderen* Menüs
    if (menu === 'kasse') setAnchorElKasse(event.currentTarget);
    else if (menu === 'verwaltung') setAnchorElVerwaltung(event.currentTarget);
    else if (menu === 'settings') setAnchorElSettings(event.currentTarget);
  };

  // <<< NEU: Handler für User-Menü (Öffnen/Schließen) ---
  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElUser(event.currentTarget);
  };
  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };
  // --- ENDE: Handler für User-Menü ---

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
  }, [user]); // Nur von User abhängig

  // Effekt zum Aktualisieren der aktiven Salon-ID aus dem Local Storage
  useEffect(() => {
     const handleStorageChange = () => {
        const storedId = localStorage.getItem('activeSalonId');
        setActiveSalonId(storedId);
     };
     // Event Listener für Änderungen im Local Storage (durch andere Tabs/Fenster)
     window.addEventListener('storage', handleStorageChange);
     // Auch auf benutzerdefiniertes Event hören (z.B. nach Speichern in Einstellungen)
     const handleCustomEvent = (event: Event) => {
         setActiveSalonId((event as CustomEvent).detail);
     };
     window.addEventListener('activeSalonChanged', handleCustomEvent);

     // Initialen Wert aus Local Storage setzen
     setActiveSalonId(localStorage.getItem('activeSalonId'));

     // Aufräumen beim Unmounten
     return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('activeSalonChanged', handleCustomEvent);
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

  // <<< NEU: handleProfile Funktion für Profil-Menü ---
  const handleProfile = () => {
    handleCloseUserMenu(); // Schließt nur das User-Menü
    if(user?.role === 'admin') {
      router.push('/admin'); // Admin-Hauptseite (Kalender)
    } else if (user?.role === 'staff') {
      router.push('/staff-dashboard'); // Staff-Hauptseite
    } else {
      router.push('/dashboard'); // Kunden-Dashboard
    }
  }
  // --- ENDE: handleProfile ---

  const handleSalonChange = (salonId: string) => {
    setActiveSalonId(salonId);
    localStorage.setItem('activeSalonId', salonId);
    window.dispatchEvent(new CustomEvent('activeSalonChanged', { detail: salonId })); // Event auslösen
    setSalonMenuAnchor(null);
    // Seite neu laden, um Datenkonsistenz sicherzustellen
    window.location.reload();
  };

  const handleNavigate = (path: string) => {
    closeAllMenus(); // Alle Menüs schließen bei Navigation
    router.push(path);
  };

  const activeSalon = salons.find(s => s._id === activeSalonId);

  // --- ANPASSUNG: Name dynamisch einsetzen ---
  const Brand = (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ cursor: 'pointer', transition: 'color 0.3s' }} onClick={() => router.push('/')}>
       <ContentCutIcon sx={{ color: scrolled ? 'primary.main' : 'white' }} />
       <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.5px', color: scrolled ? 'text.primary' : 'white' }}>
         {/* Hier den Namen dynamisch oder statisch einsetzen */}
         MO's Barbershop
       </Typography>
    </Stack>
  );

  const navButtonStyle = (buttonName: string) => ({
    color: scrolled ? 'text.primary' : 'white',
    opacity: hoveredButton && hoveredButton !== buttonName ? 0.5 : 1,
    transition: 'opacity 0.2s ease-in-out, color 0.3s ease-in-out',
    '&:hover': {
      color: scrolled ? 'primary.main' : 'white', // Beibehaltung des Hover-Effekts
      opacity: 1, // Volle Deckkraft beim Hovern
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

  // --- ADMIN NAVIGATION ---
  const adminNav = user?.role === 'admin' && (
    <Box onMouseLeave={() => setHoveredButton(null)}>
      <Button sx={navButtonStyle('dashboard')} onMouseEnter={() => {setHoveredButton('dashboard'); closeAllMenus();}} onClick={() => router.push('/admin/dashboard')}>Dashboard</Button>
      <Button sx={navButtonStyle('kalender')} onMouseEnter={() => {setHoveredButton('kalender'); closeAllMenus();}} onClick={() => router.push('/admin')}>Kalender</Button>
      <Button sx={navButtonStyle('booking')} onMouseEnter={() => {setHoveredButton('booking'); closeAllMenus();}} onClick={() => router.push('/booking')}>Termin buchen</Button>

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

      {/* Einstellungen Dropdown */}
      <Box onMouseEnter={(e) => { handleMenuOpen(e, 'settings'); setHoveredButton('settings'); }} onMouseLeave={handleMenuLeave} sx={{ position: 'relative', display: 'inline-block' }}>
        <Button endIcon={<ArrowDropDownIcon />} sx={navButtonStyle('settings')} startIcon={<SettingsIcon />}>Einstellungen</Button>
        {renderDropdown(anchorElSettings, [
          <MenuItem key="general" onClick={() => handleNavigate('/admin/general')}><SettingsApplicationsIcon fontSize="small" sx={{ mr: 1.5 }} /> Allgemeine Einstellungen</MenuItem>,
          <Divider key="div-settings" />,
          <MenuItem key="avail" onClick={() => handleNavigate('/admin/availability')}><ScheduleIcon fontSize="small" sx={{ mr: 1.5 }} /> Arbeitszeiten</MenuItem>,
          <MenuItem key="template" onClick={() => handleNavigate('/admin/availability/templates')}><BuildIcon fontSize="small" sx={{ mr: 1.5 }} /> Zeit-Vorlagen</MenuItem>,
        ])}
      </Box>

      {/* --- ANPASSUNG: Salon Auswahl Button --- */}
       <Button
        // Der 'variant' wird jetzt rein über den 'scrolled'-Status gesteuert
        variant={scrolled ? "outlined" : "contained"}
        color="primary" // Hauptfarbe bleibt Orange
        sx={{
          color: scrolled ? 'primary.main' : 'white', // Text: Orange (gescrollt) oder Weiß (oben)
          borderColor: scrolled ? 'primary.main' : 'transparent', // Rand: Orange (gescrollt) oder keiner (oben)
          // Hintergrund: leichter Orangeton (gescrollt) oder dunkleres Orange (oben)
          bgcolor: scrolled ? theme.palette.primary.light : 'primary.dark',
          '&:hover': {
            // Leichter Hover-Effekt
            bgcolor: scrolled ? 'rgba(226, 103, 58, 0.15)' : 'primary.main', // Etwas dunkler beim Hover
            borderColor: scrolled ? 'primary.dark' : 'transparent',
          },
          ml: 1, // Abstand
          boxShadow: scrolled ? 'none' : 1, // Leichter Schatten, wenn nicht gescrollt
        }}
        onMouseEnter={() => setHoveredButton('salon')}
        onClick={(e) => setSalonMenuAnchor(e.currentTarget)}
        endIcon={<ArrowDropDownIcon />}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          {/* Avatar bleibt gleich */}
          <Avatar sx={{ width: 28, height: 28, bgcolor: scrolled ? 'primary.main' : 'rgba(255,255,255,0.2)', color: 'white' }}><StorefrontIcon fontSize="small" /></Avatar>
          <Typography sx={{ fontWeight: 600, textTransform: 'none', color: 'inherit' }}>
            {activeSalon?.name || 'Salon wählen'}
          </Typography>
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

   // <<< START: User Navigation (STARK ERWEITERT) ---
   const userNav = (
    <Box onMouseLeave={() => setHoveredButton(null)} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {/* --- START: Dynamische Links für Staff (Desktop) --- */}
      {user?.role === 'staff' && user.permissions?.includes('dashboard-access') && (
        <Button
          onClick={() => router.push('/admin/dashboard')}
          variant="outlined"
          startIcon={<DashboardIcon />}
          sx={{
            ...navButtonStyle('staff-dashboard'), // Wende den Button-Style an
            color: scrolled ? 'primary.main' : 'white', // Überschreibe Farbe für Outlined-Button
            borderColor: scrolled ? 'primary.main' : 'rgba(255, 255, 255, 0.5)',
            '&:hover': {
              borderColor: scrolled ? 'primary.dark' : 'white',
              backgroundColor: scrolled ? 'rgba(226, 103, 58, 0.08)' : 'rgba(255, 255, 255, 0.1)',
            }
          }}
          onMouseEnter={() => {setHoveredButton('staff-dashboard'); closeAllMenus();}}
        >
          Dashboard
        </Button>
      )}
      {user?.role === 'staff' && user.permissions?.includes('cash-register-access') && (
        <Button
          onClick={() => router.push('/admin/cash-register')}
          variant="outlined"
          startIcon={<PointOfSaleIcon />}
           sx={{
            ...navButtonStyle('staff-kasse'), // Wende den Button-Style an
            color: scrolled ? 'primary.main' : 'white', // Überschreibe Farbe für Outlined-Button
            borderColor: scrolled ? 'primary.main' : 'rgba(255, 255, 255, 0.5)',
            '&:hover': {
              borderColor: scrolled ? 'primary.dark' : 'white',
              backgroundColor: scrolled ? 'rgba(226, 103, 58, 0.08)' : 'rgba(255, 255, 255, 0.1)',
            }
          }}
          onMouseEnter={() => {setHoveredButton('staff-kasse'); closeAllMenus();}}
        >
          Kasse
        </Button>
      )}
      {/* --- ENDE: Dynamische Links für Staff (Desktop) --- */}

      {/* Standard-Link für Staff/User */}
      {(user?.role === 'staff') && (
          <Button sx={navButtonStyle('termine')} onMouseEnter={() => {setHoveredButton('termine'); closeAllMenus();}} onClick={() => router.push('/staff-dashboard')}>Meine Termine</Button>
      )}
      {(user?.role === 'user') && (
          <Button sx={navButtonStyle('termine')} onMouseEnter={() => {setHoveredButton('termine'); closeAllMenus();}} onClick={() => router.push('/dashboard')}>Meine Termine</Button>
      )}
      
      {/* 'Termin buchen' für Staff bleibt erhalten */}
      {user?.role === 'staff' && (
        <Button sx={navButtonStyle('booking')} onMouseEnter={() => {setHoveredButton('booking'); closeAllMenus();}} onClick={() => router.push('/booking')}>Termin buchen</Button>
      )}
    </Box>
  );
  // --- ENDE: User Navigation ---

   // <<< START: Mobile Menü Items (ERWEITERT) ---
   const mobileMenuItems = user ? [
     // Conditionally render Admin items
     ...(user.role === 'admin' ? [
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
         <MenuItem key="m-settings" onClick={() => handleNavigate('/admin/general')}>Einstellungen</MenuItem>,
         <MenuItem key="m-avail" onClick={() => handleNavigate('/admin/availability')}>Arbeitszeiten</MenuItem>,
         <MenuItem key="m-template" onClick={() => handleNavigate('/admin/availability/templates')}>Zeit-Vorlagen</MenuItem>,
         <Divider key="m-div4" />,
     ] : []),

      // --- START: Staff/User Sektion ---
      // Standard-Link für Staff
     ...(user.role === 'staff' ? [
         <MenuItem key="m-user-dash" onClick={() => handleNavigate('/staff-dashboard')}>Meine Termine</MenuItem>,
         <MenuItem key="m-staff-book" onClick={() => handleNavigate('/booking')}>Termin buchen</MenuItem>
     ] : []),
     // Standard-Link für User
     ...(user.role === 'user' ? [
         <MenuItem key="m-user-dash" onClick={() => handleNavigate('/dashboard')}>Meine Termine</MenuItem>
     ] : []),

     // --- START: Dynamische Links für Staff (Mobil) ---
     ...(user.role === 'staff' && user.permissions?.includes('dashboard-access') ? [
        <MenuItem key="m-staff-admin-dashboard" onClick={() => handleNavigate('/admin/dashboard')}>
            <ListItemIcon><DashboardIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Dashboard</ListItemText>
        </MenuItem>
     ] : []),
     ...(user.role === 'staff' && user.permissions?.includes('cash-register-access') ? [
        <MenuItem key="m-staff-admin-cash" onClick={() => handleNavigate('/admin/cash-register')}>
            <ListItemIcon><PointOfSaleIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Kasse</ListItemText>
        </MenuItem>
     ] : []),
     // --- ENDE: Dynamische Links für Staff (Mobil) ---
     
     ...(user.role !== 'admin' ? [<Divider key="m-user-div" />] : []), // Trennlinie für Staff/User
     // --- ENDE: Staff/User Sektion ---

    // Profil & Logout Links (ersetzen alten Logout)
    <MenuItem key="m-profile" onClick={handleProfile}>
        <ListItemIcon><Avatar sx={{ width: 24, height: 24, fontSize: '0.8rem' }} alt={user.firstName || 'User'} src="/static/images/avatar/2.jpg" /></ListItemIcon>
        <ListItemText>{user.role === 'admin' ? 'Admin-Center' : 'Mein Konto'}</ListItemText>
    </MenuItem>,
    <MenuItem key="m-logout" onClick={handleLogout}><LogoutIcon fontSize="small" sx={{ mr: 1.5 }} />Logout</MenuItem>,

  ] : [
    <MenuItem key="m-login" onClick={() => handleNavigate('/login')}><LoginIcon fontSize="small" sx={{ mr: 1.5 }} />Login</MenuItem>,
    <MenuItem key="m-register" onClick={() => handleNavigate('/register')}>Registrieren</MenuItem>,
    <MenuItem key="m-guest-book" onClick={() => handleNavigate('/booking')}><EventAvailableIcon fontSize="small" sx={{ mr: 1.5 }} />Jetzt Buchen</MenuItem>,
  ];
  // --- ENDE: Mobile Menü Items ---

  // AppBar und Toolbar Struktur
  return (
    <AppBar
        position="fixed"
        elevation={scrolled ? 2 : 0} // Leichter Schatten beim Scrollen
        sx={{
            top: { xs: '10px', md: '20px'}, // Etwas weniger Abstand auf Mobilgeräten
            left: '50%',
            transform: 'translateX(-50%)',
            width: { xs: 'calc(100% - 20px)', md: 'calc(100% - 40px)' }, // Schmaler auf Mobilgeräten
            // --- ANPASSUNG: Breite erhöht ---
            maxWidth: '1450px', // Breite erhöht
            borderRadius: { xs: '15px', md: '25px'}, // Weniger Rundung auf Mobilgeräten
            backgroundColor: scrolled ? 'rgba(255, 255, 255, 0.85)' : 'rgba(28, 28, 28, 0.5)', // Zurück zu Dunkelgrau
            backdropFilter: 'blur(10px)',
            border: scrolled ? '1px solid rgba(145, 158, 171, 0.2)' : '1px solid rgba(255, 255, 255, 0.1)',
            transition: 'background-color 0.3s ease-in-out, border-color 0.3s ease-in-out, top 0.3s, border-radius 0.3s, width 0.3s, box-shadow 0.3s',
            boxShadow: scrolled ? theme.shadows[2] : 'none',
            zIndex: 1200,
        }}
        >
      <Container maxWidth="xl"> {/* Container auf 'xl' setzen, damit Inhalt die AppBar-Breite nutzen kann */}
        <Toolbar disableGutters sx={{ minHeight: { xs: 56, sm: 64, md: 70 } }}>
          {Brand}
          <Box sx={{ flexGrow: 1 }} />

          {/* Desktop Navigation */}
          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}> {/* Gap reduziert */}
              {user && user.role !== 'admin' && userNav}
              {adminNav}
              {!user ? (
                <>
                  <Button
                    onClick={() => router.push('/login')}
                    sx={navButtonStyle('login')} onMouseEnter={() => {setHoveredButton('login'); closeAllMenus();}}
                  >
                    Login
                  </Button>
                  <Button
                    variant="contained"
                    color={"primary"} // Farbe bleibt primär
                    onClick={() => router.push('/booking')}
                    sx={{
                      boxShadow: scrolled ? '0 4px 12px rgba(226,103,58,0.3)' : '0 4px 12px rgba(0,0,0,0.2)',
                      '&:hover': {
                         boxShadow: scrolled ? '0 2px 8px rgba(226,103,58,0.4)' : '0 2px 8px rgba(0,0,0,0.3)'
                      }
                    }}
                  >
                    Jetzt Buchen
                  </Button>
                </>
              ) : (
                // --- START: Ersatz für Logout Button durch Profil-Menü ---
                <Box sx={{ flexGrow: 0, ml: 1 }}> {/* ml: 1 für Abstand */}
                  <Tooltip title="Profil öffnen">
                    <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                      <Avatar alt={user.firstName || 'User'} src="/static/images/avatar/2.jpg" />
                    </IconButton>
                  </Tooltip>
                  <Menu
                    sx={{ mt: '45px' }}
                    id="menu-appbar-user"
                    anchorEl={anchorElUser}
                    anchorOrigin={{
                      vertical: 'top',
                      horizontal: 'right',
                    }}
                    keepMounted
                    transformOrigin={{
                      vertical: 'top',
                      horizontal: 'right',
                    }}
                    open={Boolean(anchorElUser)}
                    onClose={handleCloseUserMenu}
                  >
                    <MenuItem onClick={handleProfile}>
                      <Typography textAlign="center">
                        {user.role === 'admin' ? 'Admin-Center' : 'Mein Konto'}
                      </Typography>
                    </MenuItem>
                    <MenuItem onClick={handleLogout}>
                      <Typography textAlign="center">Logout</Typography>
                    </MenuItem>
                  </Menu>
                </Box>
                // --- ENDE: Ersatz für Logout Button ---
              )}
            </Box>
          )}

          {/* Mobile Navigation */}
          {isMobile && (
            <Box>
              <IconButton sx={{ color: scrolled ? 'text.primary' : 'white' }} onClick={(e) => setMobileMenuAnchor(e.currentTarget)}><MenuIcon /></IconButton>
              <Menu anchorEl={mobileMenuAnchor} open={Boolean(mobileMenuAnchor)} onClose={() => setMobileMenuAnchor(null)}
                // Styling für mobiles Menü
                 PaperProps={{
                    sx: {
                      mt: 1,
                      boxShadow: 3,
                      borderRadius: 2,
                    },
                }}
              >
                 {mobileMenuItems}
              </Menu>
            </Box>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
}

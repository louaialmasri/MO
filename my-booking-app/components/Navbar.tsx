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

import { useAuth } from '@/context/AuthContext';
import { fetchSalons, type Salon } from '@/services/api';

export default function Navbar() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const isMobile = useMediaQuery('(max-width:999px)', { noSsr: true });

  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null);
  const [salonMenuAnchor, setSalonMenuAnchor] = useState<null | HTMLElement>(null);
  const [cashMenuAnchor, setCashMenuAnchor] = useState<null | HTMLElement>(null);
  const [managementMenuAnchor, setManagementMenuAnchor] = useState<null | HTMLElement>(null);
  const [settingsMenuAnchor, setSettingsMenuAnchor] = useState<null | HTMLElement>(null);

  const [salons, setSalons] = useState<Salon[]>([]);
  const [activeSalonId, setActiveSalonId] = useState<string | null>(null);

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
    setCashMenuAnchor(null);
    setManagementMenuAnchor(null);
    setSettingsMenuAnchor(null);
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

      {/* --- Kassen-Menü (korrigiert) --- */}
      <Button color="inherit" onClick={(e) => setCashMenuAnchor(e.currentTarget)}>Kasse</Button>
      <Menu anchorEl={cashMenuAnchor} open={Boolean(cashMenuAnchor)} onClose={() => setCashMenuAnchor(null)}>
        <MenuItem onClick={() => handleNavigate('/admin/cash-register')}><PointOfSaleIcon fontSize="small" sx={{ mr: 1.5 }}/>Sofortverkauf</MenuItem>
        <MenuItem onClick={() => handleNavigate('/admin/cash-closing')}><ReceiptLongIcon fontSize="small" sx={{ mr: 1.5 }}/>Kassenabschluss</MenuItem>
      </Menu>

      {/* --- Verwaltungs-Menü (korrigiert) --- */}
      <Button color="inherit" onClick={(e) => setManagementMenuAnchor(e.currentTarget)}>Verwaltung</Button>
      <Menu anchorEl={managementMenuAnchor} open={Boolean(managementMenuAnchor)} onClose={() => setManagementMenuAnchor(null)}>
        <MenuItem onClick={() => handleNavigate('/admin/catalog')}><CategoryIcon fontSize="small" sx={{ mr: 1.5 }}/>Katalog</MenuItem>
        <MenuItem onClick={() => handleNavigate('/admin/products')}><ShoppingBagIcon fontSize="small" sx={{ mr: 1.5 }}/>Produkte</MenuItem>
        <MenuItem onClick={() => handleNavigate('/admin/invoices')}><ReceiptLongIcon fontSize="small" sx={{ mr: 1.5 }}/>Rechnungen</MenuItem>
      </Menu>

      <Button color="inherit" onClick={(e) => setSettingsMenuAnchor(e.currentTarget)}>
        <SettingsIcon />
      </Button>
      <Menu anchorEl={settingsMenuAnchor} open={Boolean(settingsMenuAnchor)} onClose={() => setSettingsMenuAnchor(null)}>
        <MenuItem onClick={() => handleNavigate('/admin/availability')}><ScheduleIcon fontSize="small" sx={{ mr: 1.5 }}/>Arbeitszeiten</MenuItem>
        <MenuItem onClick={() => handleNavigate('/admin/availability/templates')}><BuildIcon fontSize="small" sx={{ mr: 1.5 }}/>Zeit-Vorlagen</MenuItem>
        <Divider />
        <MenuItem onClick={() => handleNavigate('/admin/settings/pin')}><VpnKeyIcon fontSize="small" sx={{ mr: 1.5 }}/>PIN-Verwaltung</MenuItem>
        <MenuItem onClick={() => handleNavigate('/admin/settings/datev')}><ReceiptLongIcon fontSize="small" sx={{ mr: 1.5 }}/>DATEV-Export</MenuItem>
      </Menu>

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
                <Button variant="outlined" onClick={handleLogout}>Logout</Button>
              )}
            </Box>
          )}

          {isMobile && (
             <Box>
              <IconButton color="inherit" onClick={(e) => setMobileMenuAnchor(e.currentTarget)}><MenuIcon /></IconButton>
              <Menu anchorEl={mobileMenuAnchor} open={Boolean(mobileMenuAnchor)} onClose={() => setMobileMenuAnchor(null)}>
                 {/* TODO: Mobile Links hier einfügen */}
              </Menu>
            </Box>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
}
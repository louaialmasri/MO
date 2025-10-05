'use client'

import { useState, useEffect } from 'react';
import { 
    Container, Typography, Paper, Grid, Button, Autocomplete, TextField, 
    List, ListItem, ListItemText, IconButton, Divider, Select, MenuItem, 
    FormControl, InputLabel, Box, Stack, Snackbar, Alert
} from '@mui/material';
import { useAuth } from '@/context/AuthContext';
import { 
    fetchAllUsersForAdmin, fetchProducts, fetchServices, createInvoice, 
    User, Product as ProductType, Service, InvoicePayload, getWalkInCustomer, 
    fetchAllUsers
} from '@/services/api'; // fetchAllUsers wurde entfernt, da fetchAllUsersForAdmin bereits importiert ist
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

// ... (CartItem Typ bleibt gleich)
type CartItem = {
  cartItemId: string; 
  id: string;        
  name: string;
  price: number;
  type: 'product' | 'voucher' | 'service';
  staffId?: string;
};


export default function CashRegisterPage() {
  const { token, user } = useAuth();
  const [customers, setCustomers] = useState<User[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [products, setProducts] = useState<ProductType[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<User | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({ open: false, msg: '', sev: 'success' });

  // --- KORREKTUR: useEffect wurde komplett überarbeitet ---
  useEffect(() => {
    if (!token) return;

    const loadData = async () => {
      try {
        // Lade alle Benutzer (Kunden, Mitarbeiter)
        const allUsers = await fetchAllUsers(token);
        const regularCustomers = allUsers.filter(u => u.role === 'user' && u.email !== 'laufkunde@shop.local');
        setStaff(allUsers.filter(u => u.role === 'staff'));

        // Versuche, den Laufkunden zu laden
        try {
          const walkInCustomer = await getWalkInCustomer(token);
          setCustomers([walkInCustomer, ...regularCustomers]);
        } catch (error) {
          console.error("Laufkunde konnte nicht geladen werden:", error);
          setCustomers(regularCustomers); // Zeige zumindest die normalen Kunden an
        }
        
        // Lade Produkte und Services parallel
        const [fetchedProducts, fetchedServices] = await Promise.all([
          fetchProducts(token),
          fetchServices(token),
        ]);

        setProducts(fetchedProducts);
        setServices(fetchedServices);

        if (fetchedServices.length > 0) {
          setSelectedServiceId(fetchedServices[0]._id);
        }
      } catch (error) {
        console.error("Fehler beim Laden der Kassendaten:", error);
        setToast({ open: true, msg: "Wichtige Daten konnten nicht geladen werden.", sev: 'error' });
      }
    };

    loadData();
  }, [token]);

  const handleAddItem = (item: ProductType | Service, type: 'product' | 'service') => {
    const itemName = type === 'product' ? (item as ProductType).name : (item as Service).title;
    const displayName = type === 'product' ? `Produkt: ${itemName}` : itemName;
    const staffId = type === 'service' ? (staff.length > 0 ? staff[0]._id : undefined) : undefined;
    
    setCart(prevCart => [
      ...prevCart,
      { 
        cartItemId: `${type}_${item._id}_${Date.now()}`,
        id: item._id, 
        name: displayName,
        price: item.price, 
        type: type,
        staffId: staffId,
      }
    ]);
  };
  
  const handleAddSelectedService = () => {
      const serviceToAdd = services.find(s => s._id === selectedServiceId);
      if (serviceToAdd) {
          handleAddItem(serviceToAdd, 'service');
      }
  };

  const handleAddVoucher = () => {
    const value = prompt('Wert des Gutscheins eingeben:');
    const voucherValue = Number(value);
    if (value && !isNaN(voucherValue) && voucherValue > 0) {
      setCart(prevCart => [...prevCart, { 
        cartItemId: `voucher_${Date.now()}`, id: `voucher_${Date.now()}`, 
        name: `Gutschein`, price: voucherValue, type: 'voucher' 
      }]);
    }
  };

  const handleUpdateCartStaff = (cartItemId: string, staffId: string) => {
    setCart(cart => cart.map(item => item.cartItemId === cartItemId ? { ...item, staffId } : item));
  };
  
  const handleRemoveFromCart = (cartItemId: string) => {
    setCart(prevCart => prevCart.filter(item => item.cartItemId !== cartItemId));
  };

  const total = cart.reduce((sum, item) => sum + item.price, 0);

  const handleCheckout = async () => {
    if (!selectedCustomer || cart.length === 0) {
      setToast({ open: true, msg: 'Bitte einen Kunden und mindestens einen Artikel auswählen.', sev: 'error' });
      return;
    }
    const staffIdForInvoice = cart.find(item => item.type === 'service')?.staffId || user?._id;

    const payload: InvoicePayload = {
      customerId: selectedCustomer._id,
      paymentMethod: 'cash',
      staffId: staffIdForInvoice,
      items: cart.map(item => ({
        type: item.type as 'product' | 'voucher' | 'service',
        id: item.type !== 'voucher' ? item.id : undefined,
        value: item.type === 'voucher' ? item.price : undefined,
      })),
    };

    try {
      await createInvoice(payload);
      setToast({ open: true, msg: 'Verkauf erfolgreich abgeschlossen!', sev: 'success' });
      setCart([]);
      setSelectedCustomer(null);
    } catch (error) {
      console.error('Fehler beim Verkauf:', error);
      setToast({ open: true, msg: 'Ein Fehler ist aufgetreten.', sev: 'error' });
    }
  };

  return (
    <Container maxWidth="xl">
      <Typography variant="h4" sx={{ my: 4 }}>Kasse / Sofortverkauf</Typography>
      <Grid container spacing={4}>
        {/* Linke Spalte */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>Dienstleistungen</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
                <FormControl fullWidth>
                    <InputLabel>Dienstleistung auswählen</InputLabel>
                    <Select value={selectedServiceId} label="Dienstleistung auswählen" onChange={(e) => setSelectedServiceId(e.target.value)}>
                        {services.map(service => (
                            <MenuItem key={service._id} value={service._id}>
                                {service.title} - {service.price.toFixed(2)}€
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <Button onClick={handleAddSelectedService} variant="contained" startIcon={<AddIcon />}>
                    Hinzufügen
                </Button>
            </Stack>
          </Paper>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Produkte & Gutscheine</Typography>
            <Button onClick={handleAddVoucher} variant="outlined" startIcon={<AddIcon />} sx={{ mb: 2, width: '100%'}}>Gutschein hinzufügen</Button>
            <List dense>
              {products.map(product => (
                <ListItem key={product._id} secondaryAction={
                  <Button onClick={() => handleAddItem(product, 'product')} startIcon={<AddIcon />} disabled={product.stock < 1}>
                    Hinzufügen
                  </Button>
                }>
                  <ListItemText primary={product.name} secondary={`Preis: ${product.price.toFixed(2)}€ | Lager: ${product.stock}`} />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Rechte Spalte: Warenkorb */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper sx={{ p: 2, position: 'sticky', top: '20px' }}>
            <Typography variant="h6" gutterBottom>Warenkorb</Typography>
            <Autocomplete
              options={customers}
              getOptionLabel={(option) => `${option.firstName} ${option.lastName || ''}`.trim()}
              value={selectedCustomer}
              onChange={(event, newValue) => setSelectedCustomer(newValue)}
              renderInput={(params) => <TextField {...params} label="Kunde auswählen" variant="outlined" fullWidth />}
              sx={{ mb: 2 }}
            />
            <Divider sx={{ my: 2 }} />
            {cart.length === 0 ? (
              <Typography color="text.secondary" sx={{minHeight: 150}}>Warenkorb ist leer.</Typography>
            ) : (
              <List sx={{minHeight: 150, overflowY: 'auto', maxHeight: '40vh'}}>
                {cart.map(item => (
                  <ListItem key={item.cartItemId} secondaryAction={
                    <IconButton edge="end" onClick={() => handleRemoveFromCart(item.cartItemId)}><DeleteIcon /></IconButton>
                  }>
                    <ListItemText 
                      primary={item.name}
                      secondary={
                        item.type === 'service' ? (
                          <FormControl size="small" variant="standard" sx={{mt: 1, minWidth: 150}}>
                            <InputLabel>Mitarbeiter</InputLabel>
                            <Select value={item.staffId || ''} onChange={(e) => handleUpdateCartStaff(item.cartItemId, e.target.value)}>
                              {staff.map(s => <MenuItem key={s._id} value={s._id}>{s.firstName} {s.lastName}</MenuItem>)}
                            </Select>
                          </FormControl>
                        ) : `${item.price.toFixed(2)}€`
                      }
                      secondaryTypographyProps={{ component: 'div' }} 
                    />
                     <Typography sx={{ml: 2}}>{item.price.toFixed(2)}€</Typography>
                  </ListItem>
                ))}
              </List>
            )}
            <Divider sx={{ my: 2 }} />
            <Typography variant="h5" align="right" sx={{ mb: 2 }}>
              Gesamt: {total.toFixed(2)}€
            </Typography>
            <Button
              variant="contained" color="primary" fullWidth
              disabled={!selectedCustomer || cart.length === 0}
              onClick={handleCheckout}
            >
              Verkauf abschließen (Bar)
            </Button>
          </Paper>
        </Grid>
      </Grid>
      
      {/* --- Snackbar-Komponente für Benachrichtigungen --- */}
      <Snackbar 
        open={toast.open} 
        autoHideDuration={4000} 
        onClose={() => setToast(p => ({...p, open: false}))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setToast(p => ({...p, open: false}))} severity={toast.sev} sx={{ width: '100%' }} variant="filled">
            {toast.msg}
        </Alert>
      </Snackbar>
    </Container>
  );
}
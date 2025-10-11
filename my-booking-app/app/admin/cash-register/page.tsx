'use client'

import { useState, useEffect } from 'react';
import { 
    Container, Typography, Paper, Grid, Button, Autocomplete, TextField, 
    List, ListItem, ListItemText, IconButton, Divider, Select, MenuItem, 
    FormControl, InputLabel, Box, Stack, Snackbar, Alert,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    InputAdornment,
    Radio,
    RadioGroup
} from '@mui/material';
import { useAuth } from '@/context/AuthContext';
import { 
    fetchAllUsers, fetchProducts, fetchServices, createInvoice, 
    User, Product as ProductType, Service, InvoicePayload, getWalkInCustomer
} from '@/services/api';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';

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

  // States für Rabatt
  const [discount, setDiscount] = useState({ type: 'percentage' as 'percentage' | 'fixed', value: 0 });
  const [isDiscountDialogOpen, setIsDiscountDialogOpen] = useState(false);
  const [tempDiscount, setTempDiscount] = useState({ type: 'percentage', value: '' });
  
  // NEU: States für Gutscheinverkauf-Dialog
  const [isVoucherDialogOpen, setIsVoucherDialogOpen] = useState(false);
  const [voucherValue, setVoucherValue] = useState('');

  useEffect(() => {
      if (!token) return;
  
      const loadData = async () => {
        try {
          const [customerUsers, staffUsers] = await Promise.all([
            fetchAllUsers(token, 'user'),
            fetchAllUsers(token, 'staff')
          ]); 
          const regularCustomers = customerUsers.filter(u => u.email !== 'laufkunde@shop.local');
          setStaff(staffUsers);
  
          try {
            const walkInCustomer = await getWalkInCustomer(token);
            setCustomers([walkInCustomer, ...regularCustomers]);
          } catch (error) {
            console.error("Laufkunde konnte nicht geladen werden:", error);
            setCustomers(regularCustomers); 
          }
          
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

  // KORREKTUR: Öffnet jetzt den Dialog anstatt prompt()
  const handleAddVoucherClick = () => {
    setVoucherValue('');
    setIsVoucherDialogOpen(true);
  };
  
  // NEU: Logik, wenn der Gutschein aus dem Dialog hinzugefügt wird
  const handleConfirmAddVoucher = () => {
    const value = parseFloat(voucherValue);
    if (!isNaN(value) && value > 0) {
      setCart(prevCart => [...prevCart, { 
        cartItemId: `voucher_${Date.now()}`, 
        id: `voucher_val_${value}`, // Eindeutige ID für den Warenkorb
        name: `Gutschein im Wert von ${value.toFixed(2)}€`, 
        price: value, 
        type: 'voucher' 
      }]);
    }
    setIsVoucherDialogOpen(false);
  };
  
  const handleUpdateCartStaff = (cartItemId: string, staffId: string) => {
    setCart(cart => cart.map(item => item.cartItemId === cartItemId ? { ...item, staffId } : item));
  };
  
  const handleRemoveFromCart = (cartItemId: string) => {
    setCart(prevCart => prevCart.filter(item => item.cartItemId !== cartItemId));
  };

  const subTotal = cart.reduce((sum, item) => sum + item.price, 0);
  let finalTotal = subTotal;
  let discountAmount = 0;
  if (discount.value > 0) {
    if (discount.type === 'percentage') {
      discountAmount = subTotal * (discount.value / 100);
      finalTotal = subTotal - discountAmount;
    } else {
      discountAmount = discount.value;
      finalTotal = subTotal - discountAmount;
    }
  }
  finalTotal = Math.max(0, finalTotal);
  
  const handleOpenDiscountDialog = () => {
    setTempDiscount({type: discount.type, value: discount.value > 0 ? String(discount.value) : ''})
    setIsDiscountDialogOpen(true);
  };
  
  const handleApplyDiscount = () => {
    const value = parseFloat(tempDiscount.value);
    if (!isNaN(value) && value >= 0) {
      setDiscount({ type: tempDiscount.type as 'percentage' | 'fixed', value });
    } else {
      setDiscount({ type: 'percentage', value: 0 }); // Rabatt zurücksetzen bei ungültiger Eingabe
    }
    setIsDiscountDialogOpen(false);
  };
  
  const handleRemoveDiscount = () => {
    setDiscount({ type: 'percentage', value: 0 });
    setIsDiscountDialogOpen(false);
  }
  
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
      discount: discount.value > 0 ? discount : undefined,
    };

    try {
      await createInvoice(payload, token!);
      setToast({ open: true, msg: 'Verkauf erfolgreich abgeschlossen!', sev: 'success' });
      setCart([]);
      setSelectedCustomer(null);
      setDiscount({ type: 'percentage', value: 0 });
      const updatedProducts = await fetchProducts(token!);
      setProducts(updatedProducts);
    } catch (error) {
      console.error('Fehler beim Verkauf:', error);
      const errorMessage = (error instanceof Error) ? error.message : 'Ein unbekannter Fehler ist aufgetreten.';
      setToast({ open: true, msg: `Fehler: ${errorMessage}`, sev: 'error' });
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
            {/* KORREKTUR: Button ruft jetzt handleAddVoucherClick auf */}
            <Button onClick={handleAddVoucherClick} variant="outlined" startIcon={<CardGiftcardIcon />} sx={{ mb: 2, width: '100%'}}>Gutschein verkaufen</Button>
            <List dense sx={{ maxHeight: '50vh', overflowY: 'auto' }}>
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
            <Divider sx={{ my: 1 }} />
            
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 1, p: 1 }}>
                <Typography>Zwischensumme</Typography>
                <Typography>{subTotal.toFixed(2)}€</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1, borderRadius: 1, bgcolor: discount.value > 0 ? 'action.hover' : 'transparent' }}>
                <Button onClick={handleOpenDiscountDialog} startIcon={<LocalOfferIcon />} size="small">
                    {discount.value > 0 ? 'Rabatt bearbeiten' : 'Rabatt hinzufügen'}
                </Button>
                <Typography color={discount.value > 0 ? 'text.primary' : 'text.secondary'}>
                    - {discountAmount.toFixed(2)}€
                </Typography>
            </Stack>

            <Divider sx={{ my: 2 }} />
            <Typography variant="h5" align="right" sx={{ mb: 2 }}>
              Gesamt: {finalTotal.toFixed(2)}€
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
      
      <Dialog open={isDiscountDialogOpen} onClose={() => setIsDiscountDialogOpen(false)}>
        <DialogTitle>Rabatt hinzufügen/bearbeiten</DialogTitle>
        <DialogContent>
            <FormControl component="fieldset" sx={{ my: 2 }}>
              <RadioGroup row value={tempDiscount.type} onChange={(e) => setTempDiscount(p => ({ ...p, type: e.target.value }))}>
                <FormControlLabel value="percentage" control={<Radio />} label="Prozent (%)" />
                <FormControlLabel value="fixed" control={<Radio />} label="Fester Betrag (€)" />
              </RadioGroup>
            </FormControl>
            <TextField
              autoFocus margin="dense" label="Rabattwert" type="number"
              fullWidth variant="outlined" value={tempDiscount.value}
              onChange={(e) => setTempDiscount(p => ({ ...p, value: e.target.value }))}
              InputProps={{
                endAdornment: <InputAdornment position="end">{tempDiscount.type === 'percentage' ? '%' : '€'}</InputAdornment>,
              }}
            />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleRemoveDiscount} color="error">Rabatt entfernen</Button>
          <Box sx={{flexGrow: 1}}/>
          <Button onClick={() => setIsDiscountDialogOpen(false)}>Abbrechen</Button>
          <Button onClick={handleApplyDiscount} variant="contained">Anwenden</Button>
        </DialogActions>
      </Dialog>

      {/* NEU: DIALOG ZUM GUTSCHEINVERKAUF */}
      <Dialog open={isVoucherDialogOpen} onClose={() => setIsVoucherDialogOpen(false)}>
        <DialogTitle>Gutschein verkaufen</DialogTitle>
        <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Gutscheinwert"
              type="number"
              fullWidth
              variant="outlined"
              value={voucherValue}
              onChange={(e) => setVoucherValue(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start">€</InputAdornment>,
              }}
            />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsVoucherDialogOpen(false)}>Abbrechen</Button>
          <Button onClick={handleConfirmAddVoucher} variant="contained">Hinzufügen</Button>
        </DialogActions>
      </Dialog>
      
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
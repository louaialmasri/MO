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
    RadioGroup,
    Chip
} from '@mui/material';
import { useAuth } from '@/context/AuthContext';
import { 
    fetchAllUsers, fetchProducts, fetchServices, createInvoice, validateVoucher,
    User, Product as ProductType, Service, InvoicePayload, getWalkInCustomer
} from '@/services/api';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import PaymentDialog from '@/components/PaymentDialog';

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

  const [selectedStaffId, setSelectedStaffId] = useState<string>('');

  const [discount, setDiscount] = useState({ type: 'percentage' as 'percentage' | 'fixed', value: 0 });
  const [isDiscountDialogOpen, setIsDiscountDialogOpen] = useState(false);
  const [tempDiscount, setTempDiscount] = useState({ type: 'percentage', value: '' });
  
  const [isVoucherDialogOpen, setIsVoucherDialogOpen] = useState(false);
  const [voucherValue, setVoucherValue] = useState('');

  const [voucherCodeInput, setVoucherCodeInput] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<{ code: string, amount: number } | null>(null);
  const [voucherError, setVoucherError] = useState('');

  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  useEffect(() => {
    if (!token) return;
    const loadData = async () => {
        try {
            const [customerUsers, staffUsers, fetchedProducts, fetchedServices, walkInCustomer] = await Promise.all([
                fetchAllUsers(token, 'user'),
                fetchAllUsers(token, 'staff'),
                fetchProducts(token),
                fetchServices(token),
                getWalkInCustomer(token)
            ]);
            
            const regularCustomers = customerUsers.filter(u => u.email !== 'laufkunde@shop.local');
            setCustomers([walkInCustomer, ...regularCustomers]);
            setStaff(staffUsers);
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

  const handleAddToCart = (item: ProductType | Service, type: 'product' | 'service') => {
    // ## Skill-Prüfung für Dienstleistungen
    if (type === 'service') {
      if (!selectedStaffId) {
        setToast({ open: true, msg: 'Bitte wählen Sie zuerst einen Mitarbeiter aus.', sev: 'error' });
        return;
      }
      
      const staffMember = staff.find(s => s._id === selectedStaffId);
      const hasSkill = staffMember?.skills?.some(skill => skill._id === item._id);

      if (!hasSkill) {
        const serviceTitle = (item as Service).title;
        setToast({ open: true, msg: `"${staffMember?.firstName}" kann "${serviceTitle}" nicht ausführen.`, sev: 'error' });
        return;
      }
    }

    const cartItem: CartItem = {
      cartItemId: `${type}-${item._id}-${Date.now()}`,
      id: item._id,
      name: type === 'product' ? (item as ProductType).name : (item as Service).title,
      price: item.price,
      type,
      staffId: type === 'service' ? selectedStaffId : undefined,
    };
    setCart(prevCart => [...prevCart, cartItem]);
  };
  
  const handleAddSelectedService = () => {
    const serviceToAdd = services.find(s => s._id === selectedServiceId);
    if (serviceToAdd) {
        handleAddToCart(serviceToAdd, 'service');
    }
  };
  
  const handleAddVoucherClick = () => {
    setVoucherValue('');
    setIsVoucherDialogOpen(true);
  };
  
  const handleConfirmAddVoucher = () => {
    const value = parseFloat(voucherValue);
    if (!isNaN(value) && value > 0) {
      setCart(prevCart => [...prevCart, { 
        cartItemId: `voucher_${Date.now()}`, 
        id: `voucher_val_${value}`,
        name: `Gutschein im Wert von ${value.toFixed(2)}€`, 
        price: value, 
        type: 'voucher' 
      }]);
    }
    setIsVoucherDialogOpen(false);
  };
  
  const handleRemoveFromCart = (cartItemId: string) => {
    setCart(prevCart => prevCart.filter(item => item.cartItemId !== cartItemId));
  };

  const subTotal = cart.reduce((sum, item) => sum + item.price, 0);
  let discountAmount = 0;
  if (discount.value > 0) {
    discountAmount = discount.type === 'percentage' ? subTotal * (discount.value / 100) : discount.value;
  }
  const totalAfterDiscount = subTotal - discountAmount;
  
  let redeemedAmount = 0;
  if (appliedVoucher) {
    redeemedAmount = Math.min(totalAfterDiscount, appliedVoucher.amount);
  }
  let finalTotal = Math.max(0, totalAfterDiscount - redeemedAmount);
  
  const handleOpenDiscountDialog = () => {
    setTempDiscount({type: discount.type, value: discount.value > 0 ? String(discount.value) : ''})
    setIsDiscountDialogOpen(true);
  };
  
  const handleApplyDiscount = () => {
    const value = parseFloat(tempDiscount.value);
    if (!isNaN(value) && value >= 0) {
      setDiscount({ type: tempDiscount.type as 'percentage' | 'fixed', value });
    } else {
      setDiscount({ type: 'percentage', value: 0 });
    }
    setIsDiscountDialogOpen(false);
  };
  
  const handleRemoveDiscount = () => {
    setDiscount({ type: 'percentage', value: 0 });
    setIsDiscountDialogOpen(false);
  }

  const handleApplyVoucher = async () => {
    if (!token || !voucherCodeInput) return;
    setVoucherError('');
    try {
      const { voucher } = await validateVoucher(voucherCodeInput, token);
      setAppliedVoucher({ code: voucher.code, amount: voucher.currentValue });
      setToast({ open: true, msg: `Gutschein ${voucher.code} mit ${voucher.currentValue.toFixed(2)}€ Guthaben angewendet!`, sev: 'success' });
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Fehler bei der Gutscheinprüfung.';
      setVoucherError(msg);
      setAppliedVoucher(null);
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCodeInput('');
    setVoucherError('');
  };
  
  return (
    <Container maxWidth="xl" sx={{ pb: 4 }}>
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
            <Button onClick={handleAddVoucherClick} variant="outlined" startIcon={<CardGiftcardIcon />} sx={{ mb: 2, width: '100%'}}>Gutschein verkaufen</Button>
            <List dense sx={{ maxHeight: '50vh', overflowY: 'auto' }}>
              {products.map(product => (
                <ListItem key={product._id} secondaryAction={
                  <Button onClick={() => handleAddToCart(product, 'product')} startIcon={<AddIcon />} disabled={product.stock < 1}>
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
          <Paper sx={{ p: 2, position: 'sticky', top: '80px' }}>
            <Typography variant="h6" gutterBottom>Warenkorb</Typography>
            <Autocomplete
              options={customers}
              getOptionLabel={(option) => `${option.firstName} ${option.lastName || ''}`.trim()}
              value={selectedCustomer}
              onChange={(event, newValue) => setSelectedCustomer(newValue)}
              renderInput={(params) => <TextField {...params} label="Kunde auswählen" variant="outlined" fullWidth />}
              sx={{ mb: 2 }}
            />
             <FormControl fullWidth>
                <InputLabel>Mitarbeiter für Dienstleistung</InputLabel>
                <Select
                    value={selectedStaffId}
                    label="Mitarbeiter für Dienstleistung"
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                >
                    {staff.map((s) => (
                        <MenuItem key={s._id} value={s._id}>{s.firstName} {s.lastName}</MenuItem>
                    ))}
                </Select>
            </FormControl>
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
                      secondary={item.type === 'service' ? `durch ${staff.find(s => s._id === item.staffId)?.firstName || 'N/A'}`: `${item.price.toFixed(2)}€`}
                    />
                     <Typography sx={{ml: 2}}>{item.price.toFixed(2)}€</Typography>
                  </ListItem>
                ))}
              </List>
            )}
            <Divider sx={{ my: 2 }} />
            
            <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between"><Typography>Zwischensumme</Typography><Typography>{subTotal.toFixed(2)}€</Typography></Stack>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ color: discountAmount > 0 ? 'success.main' : 'text.primary' }}>
                    <Typography>Rabatt</Typography>
                    <Typography>-{discountAmount.toFixed(2)}€</Typography>
                </Stack>
                <Button startIcon={<LocalOfferIcon />} onClick={handleOpenDiscountDialog} size="small" sx={{justifyContent: 'flex-start'}}>
                  {discount.value > 0 ? 'Rabatt bearbeiten' : 'Rabatt hinzufügen'}
                </Button>

                <Divider sx={{pt: 1}}/>

                {!appliedVoucher ? (
                    <Box>
                        <Typography sx={{mt: 1}}>Gutschein einlösen</Typography>
                        <Stack direction="row" spacing={1} sx={{mt: 1}}>
                            <TextField 
                                size="small" 
                                label="Gutschein-Code" 
                                value={voucherCodeInput}
                                onChange={(e) => setVoucherCodeInput(e.target.value.toUpperCase())}
                                error={!!voucherError}
                                helperText={voucherError}
                                fullWidth
                            />
                            <Button onClick={handleApplyVoucher} variant="outlined">Prüfen</Button>
                        </Stack>
                    </Box>
                ) : (
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ color: 'success.main', mt: 1 }}>
                        <Typography>Gutschein eingelöst</Typography>
                        <Chip 
                            label={`-${redeemedAmount.toFixed(2)}€ (${appliedVoucher.code})`}
                            onDelete={handleRemoveVoucher}
                            color="success"
                            size="small"
                        />
                    </Stack>
                )}

                <Divider sx={{ my: 2 }} variant="middle" />

                <Typography variant="h5" align="right">Gesamt: {finalTotal.toFixed(2)}€</Typography>
                
                <Button 
                  variant="contained" 
                  color="primary" 
                  fullWidth 
                  disabled={!selectedCustomer || cart.length === 0} 
                  onClick={() => setIsPaymentDialogOpen(true)}
                >
                  Verkauf abschließen
                </Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Dialogs */}
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
      
      <PaymentDialog
        open={isPaymentDialogOpen}
        onClose={() => setIsPaymentDialogOpen(false)}
        // PaymentDialog erstellt die Rechnung und liefert das neue Invoice-Objekt zurück
        onPaymentSuccess={async (invoice) => {
          setToast({ open: true, msg: 'Verkauf erfolgreich abgeschlossen!', sev: 'success' });
          setCart([]);
          setSelectedCustomer(null);
          setDiscount({ type: 'percentage', value: 0 });
          handleRemoveVoucher();
          // aktualisiere Produktliste
          if (token) {
            const updatedProducts = await fetchProducts(token);
            setProducts(updatedProducts);
          }
          setIsPaymentDialogOpen(false);
        }}
        total={finalTotal}
        cart={cart}
        customer={selectedCustomer!}
      />
      
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
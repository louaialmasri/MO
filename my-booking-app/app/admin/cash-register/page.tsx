'use client'

import { useState, useEffect } from 'react';
import { Container, Typography, Paper, Grid, Button, Autocomplete, TextField, List, ListItem, ListItemText, IconButton, Divider, Select, MenuItem, FormControl, InputLabel, Box } from '@mui/material';
import { useAuth } from '@/context/AuthContext';
import { fetchAllUsers, fetchProducts, fetchServices, createInvoice, User, Product as ProductType, Service, InvoicePayload } from '@/services/api';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

type CartItem = {
  cartItemId: string; 
  id: string;        
  name: string;
  price: number;
  type: 'product' | 'voucher' | 'service';
  staffId?: string; // Optional für Services
};

export default function CashRegisterPage() {
  const { token, user } = useAuth();
  const [customers, setCustomers] = useState<User[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [products, setProducts] = useState<ProductType[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  const [selectedCustomer, setSelectedCustomer] = useState<User | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    if (token) {
      const loadData = async () => {
        const [fetchedUsers, fetchedProducts, fetchedServices] = await Promise.all([
          fetchAllUsers(token),
          fetchProducts(token),
          fetchServices(token),
        ]);
        setCustomers(fetchedUsers.filter(u => u.role === 'user'));
        setStaff(fetchedUsers.filter(u => u.role === 'staff'));
        setProducts(fetchedProducts);
        setServices(fetchedServices);
      };
      loadData();
    }
  }, [token]);

  const handleAddItem = (item: ProductType | Service, type: 'product' | 'service') => {
    const staffId = type === 'service' ? (staff.length > 0 ? staff[0]._id : undefined) : undefined;
    setCart(prevCart => [
      ...prevCart,
      { 
        cartItemId: `${type}_${item._id}_${Date.now()}`,
        id: item._id, 
        name: type === 'product' ? `Produkt: ${item.title}` : item.title,
        price: item.price, 
        type: type,
        staffId: staffId,
      }
    ]);
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
      alert('Bitte einen Kunden und mindestens einen Artikel auswählen.');
      return;
    }

    // Nimm den Mitarbeiter vom ersten Service im Warenkorb, oder den eingeloggten User
    const staffIdForInvoice = cart.find(item => item.type === 'service')?.staffId || user?._id;

    const payload: InvoicePayload = {
      customerId: selectedCustomer._id,
      paymentMethod: 'cash',
      staffId: staffIdForInvoice,
      items: cart.map(item => ({
        type: item.type,
        id: item.type !== 'voucher' ? item.id : undefined,
        value: item.type === 'voucher' ? item.price : undefined,
      })),
    };

    try {
      await createInvoice(payload);
      alert('Verkauf erfolgreich abgeschlossen!');
      setCart([]);
      setSelectedCustomer(null);
    } catch (error) {
      console.error('Fehler beim Verkauf:', error);
      alert('Ein Fehler ist aufgetreten.');
    }
  };

  return (
    <Container maxWidth="xl">
      <Typography variant="h4" sx={{ my: 4 }}>Kasse / Sofortverkauf</Typography>
      <Grid container spacing={4}>
        {/* Linke Spalte: Services und Produkte */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>Dienstleistungen</Typography>
            <List dense>
              {services.map(service => (
                <ListItem key={service._id} secondaryAction={
                  <Button onClick={() => handleAddItem(service, 'service')} startIcon={<AddIcon />}>Hinzufügen</Button>
                }>
                  <ListItemText primary={service.title} secondary={`${service.price.toFixed(2)}€`} />
                </ListItem>
              ))}
            </List>
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
              getOptionLabel={(option) => `${option.firstName} ${option.lastName} (${option.email})`}
              value={selectedCustomer}
              onChange={(event, newValue) => setSelectedCustomer(newValue)}
              renderInput={(params) => <TextField {...params} label="Kunde auswählen" variant="outlined" fullWidth />}
              sx={{ mb: 2 }}
            />
            <Divider sx={{ my: 2 }} />
            {cart.length === 0 ? (
              <Typography color="text.secondary" sx={{minHeight: 150}}>Warenkorb ist leer.</Typography>
            ) : (
              <List sx={{minHeight: 150}}>
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
    </Container>
  );
}
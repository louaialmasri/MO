// my-booking-app/app/admin/cash-register/page.tsx

'use client'

import { useState, useEffect } from 'react';
import { Container, Typography, Paper, Grid, Button, Autocomplete, TextField, List, ListItem, ListItemText, IconButton, Divider } from '@mui/material';
import { useAuth } from '@/context/AuthContext';
import { fetchAllUsersForAdmin, fetchProducts, createInvoice, User, Product as ProductType, InvoicePayload } from '@/services/api';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

// KORREKTUR 1: 'cartItemId' für einzigartige Keys hinzugefügt
type CartItem = {
  cartItemId: string; // Einzigartiger Key für die React-Liste
  id: string;         // Die eigentliche Produkt-ID
  name: string;
  price: number;
  type: 'product' | 'voucher';
};

export default function CashRegisterPage() {
  const { token } = useAuth();
  const [customers, setCustomers] = useState<User[]>([]);
  const [products, setProducts] = useState<ProductType[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<User | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    // KORREKTUR 2: Daten erst laden, wenn der Token vorhanden ist
    if (token) {
      const loadData = async () => {
        const [fetchedCustomers, fetchedProducts] = await Promise.all([
          fetchAllUsersForAdmin(),
          fetchProducts(token)
        ]);
        setCustomers(fetchedCustomers.filter(u => u.role === 'user'));
        setProducts(fetchedProducts);
      };
      loadData();
    }
  }, [token]);

  const handleAddProduct = (product: ProductType) => {
    setCart(prevCart => [
      ...prevCart,
      { 
        cartItemId: `product_${product._id}_${Date.now()}`, // Eindeutige ID generieren
        id: product._id, 
        name: `Produkt: ${product.name}`, 
        price: product.price, 
        type: 'product' 
      }
    ]);
  };
  
  const handleAddVoucher = () => {
    const value = prompt('Bitte den Wert des Gutscheins eingeben:');
    const voucherValue = Number(value);
    if (value && !isNaN(voucherValue) && voucherValue > 0) {
      const uniqueId = `voucher_${Date.now()}`;
      setCart(prevCart => [
        ...prevCart,
        { 
          cartItemId: uniqueId, // Eindeutige ID
          id: uniqueId, 
          name: `Gutschein`, 
          price: voucherValue, 
          type: 'voucher' 
        }
      ]);
    }
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
    const payload: InvoicePayload = {
      customerId: selectedCustomer._id,
      paymentMethod: 'cash',
      items: cart.map(item => ({
        type: item.type,
        id: item.type === 'product' ? item.id : undefined, // Hier die originale Produkt-ID verwenden
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
    <Container maxWidth="lg">
      <Typography variant="h4" sx={{ my: 4 }}>Kasse / Sofortverkauf</Typography>
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Produkte & Gutscheine</Typography>
            <Button onClick={handleAddVoucher} variant="outlined" startIcon={<AddIcon />} sx={{ mb: 2, width: '100%'}}>Gutschein hinzufügen</Button>
            <List>
              {products.map(product => (
                <ListItem key={product._id} secondaryAction={
                  <Button onClick={() => handleAddProduct(product)} disabled={product.stock < 1}>
                    Hinzufügen
                  </Button>
                }>
                  <ListItemText primary={product.name} secondary={`Preis: ${product.price.toFixed(2)}€ | Lager: ${product.stock}`} />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
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
              <Typography color="text.secondary" sx={{minHeight: 100}}>Warenkorb ist leer.</Typography>
            ) : (
              <List sx={{minHeight: 100}}>
                {cart.map(item => (
                  <ListItem key={item.cartItemId} secondaryAction={ // KORREKTUR 3: Einzigartigen Key verwenden
                    <IconButton edge="end" onClick={() => handleRemoveFromCart(item.cartItemId)}>
                      <DeleteIcon />
                    </IconButton>
                  }>
                    <ListItemText primary={item.name} secondary={`${item.price.toFixed(2)}€`} />
                  </ListItem>
                ))}
              </List>
            )}
            <Divider sx={{ my: 2 }} />
            <Typography variant="h5" align="right" sx={{ mb: 2 }}>
              Gesamt: {total.toFixed(2)}€
            </Typography>
            <Button
              variant="contained"
              color="primary"
              fullWidth
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
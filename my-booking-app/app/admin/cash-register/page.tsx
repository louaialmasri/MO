// my-booking-app/app/admin/cash-register/page.tsx

'use client'

import { useState, useEffect } from 'react';
import { Container, Typography, Paper, Grid, Button, Autocomplete, TextField, List, ListItem, ListItemText, IconButton, Divider } from '@mui/material';
import { useAuth } from '@/context/AuthContext';
// KORREKTUR: Wir importieren unsere neue Funktion
import { fetchAllUsersForAdmin, fetchProducts, createInvoice, User, Product as ProductType, InvoicePayload } from '@/services/api';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

// ... (der 'CartItem' Typ bleibt unverändert)

export default function CashRegisterPage() {
  const { token } = useAuth();
  const [customers, setCustomers] = useState<User[]>([]);
  const [products, setProducts] = useState<ProductType[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<User | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  // ENTFERNT: Die Variable für die Zahlungsmethode wird nicht mehr benötigt
  // const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');

  useEffect(() => {
    const loadData = async () => {
      if (token) {
        // KORREKTUR: Wir rufen beide Funktionen parallel auf, um die Ladezeit zu optimieren
        const [fetchedCustomers, fetchedProducts] = await Promise.all([
          fetchAllUsersForAdmin(), // << HIER DIE NEUE FUNKTION VERWENDEN
          fetchProducts(token)
        ]);
        // Wir zeigen alle Benutzer mit der Rolle 'user' an
        setCustomers(fetchedCustomers.filter(u => u.role === 'user'));
        setProducts(fetchedProducts);
      }
    };
    loadData();
  }, [token]);

  // ... (Die Funktionen handleAddProduct, handleAddVoucher, handleRemoveFromCart bleiben unverändert)
  const handleAddProduct = (product: ProductType) => {
    setCart(prevCart => [
      ...prevCart,
      { id: product._id, name: `Produkt: ${product.name}`, price: product.price, type: 'product' }
    ]);
  };
  
  const handleAddVoucher = () => {
    const value = prompt('Bitte den Wert des Gutscheins eingeben:');
    const voucherValue = Number(value);
    if (value && !isNaN(voucherValue) && voucherValue > 0) {
      setCart(prevCart => [
        ...prevCart,
        { id: `voucher_${Date.now()}`, name: `Gutschein`, price: voucherValue, type: 'voucher' }
      ]);
    }
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== itemId));
  };


  const total = cart.reduce((sum, item) => sum + item.price, 0);

  const handleCheckout = async () => {
    if (!selectedCustomer || cart.length === 0) {
      alert('Bitte einen Kunden und mindestens einen Artikel auswählen.');
      return;
    }

    const payload: InvoicePayload = {
      customerId: selectedCustomer._id,
      paymentMethod: 'cash', // KORREKTUR: Fest auf 'cash' gesetzt
      items: cart.map(item => ({
        type: item.type,
        id: item.type === 'product' ? item.id : undefined,
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
        {/* Linke Seite: Artikelauswahl */}
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

        {/* Rechte Seite: Warenkorb und Abschluss */}
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
                  <ListItem key={item.id} secondaryAction={
                    <IconButton edge="end" onClick={() => handleRemoveFromCart(item.id)}>
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

            {/* ENTFERNT: Die Auswahl der Zahlungsmethode wurde entfernt */}
            
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
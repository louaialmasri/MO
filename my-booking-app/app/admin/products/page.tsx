'use client'

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  fetchProducts, createProduct, fetchProductCategories, createProductCategory,
  type Product, type ProductCategory
} from '@/services/api';
import {
  Container, Typography, Paper, Stack, Button, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, List, ListItem, ListItemText, IconButton,
  Box, Divider, Chip, CircularProgress, Snackbar, Alert, MenuItem,
  Grid
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AdminBreadcrumbs from '@/components/AdminBreadcrumbs';

export default function AdminProductsPage() {
  const { token, loading: authLoading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog States
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  
  // Form States
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductCategory, setNewProductCategory] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');

  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({ open: false, msg: '', sev: 'success' });

  const loadData = async () => {
    if (token) {
      setLoading(true);
      try {
        const [productsData, categoriesData] = await Promise.all([
          fetchProducts(token),
          fetchProductCategories(token)
        ]);
        setProducts(productsData);
        setCategories(categoriesData);
      } catch (error) {
        console.error("Fehler beim Laden der Produktdaten:", error);
        setToast({ open: true, msg: 'Daten konnten nicht geladen werden', sev: 'error' });
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!authLoading) {
      loadData();
    }
  }, [token, authLoading]);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      setToast({ open: true, msg: 'Kategoriename darf nicht leer sein', sev: 'error' });
      return;
    }
    try {
      await createProductCategory(newCategoryName, token!);
      setToast({ open: true, msg: 'Kategorie erfolgreich erstellt', sev: 'success' });
      setCategoryDialogOpen(false);
      setNewCategoryName('');
      loadData(); // Reload all data
    } catch (error) {
      setToast({ open: true, msg: 'Fehler beim Erstellen der Kategorie', sev: 'error' });
    }
  };
  
  const handleCreateProduct = async () => {
    if (!newProductName.trim() || !newProductPrice || !newProductCategory) {
        setToast({ open: true, msg: 'Bitte alle Felder ausfüllen', sev: 'error' });
        return;
    }
    try {
        await createProduct({
            name: newProductName,
            price: parseFloat(newProductPrice),
            category: newProductCategory,
        }, token!);
        setToast({ open: true, msg: 'Produkt erfolgreich erstellt', sev: 'success' });
        setProductDialogOpen(false);
        setNewProductName('');
        setNewProductPrice('');
        setNewProductCategory('');
        loadData(); // Reload all data
    } catch (error) {
        setToast({ open: true, msg: 'Fehler beim Erstellen des Produkts', sev: 'error' });
    }
  };


  return (
    <>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <AdminBreadcrumbs items={[{ label: 'Mein Salon', href: '/admin' }, { label: 'Produkte' }]} />
        <Stack direction="row" alignItems="center" sx={{ mb: 3 }}>
          <Typography variant="h4" fontWeight={800} sx={{ flexGrow: 1 }}>
            Produktverwaltung
          </Typography>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setCategoryDialogOpen(true)} sx={{ mr: 2 }}>
            Neue Kategorie
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setProductDialogOpen(true)}>
            Neues Produkt
          </Button>
        </Stack>

        {loading ? (
           <Box display="flex" justifyContent="center" alignItems="center" height="50vh"><CircularProgress /></Box>
        ) : (
          <Grid container spacing={4}>
            {categories.map((category) => (
              <Grid key={category._id} size={{ xs: 12, md: 6}}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="h6" fontWeight={700} gutterBottom>{category.name}</Typography>
                  <Divider />
                  <List>
                    {products.filter(p => p.category._id === category._id).map(product => (
                      <ListItem key={product._id} secondaryAction={
                        <Typography fontWeight="bold">{product.price.toFixed(2)} €</Typography>
                      }>
                        <ListItemText primary={product.name} />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>

      {/* Dialog for new category */}
      <Dialog open={categoryDialogOpen} onClose={() => setCategoryDialogOpen(false)}>
        <DialogTitle>Neue Produktkategorie erstellen</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Kategoriename"
            type="text"
            fullWidth
            variant="standard"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCategoryDialogOpen(false)}>Abbrechen</Button>
          <Button onClick={handleCreateCategory}>Erstellen</Button>
        </DialogActions>
      </Dialog>
      
      {/* Dialog for new product */}
      <Dialog open={productDialogOpen} onClose={() => setProductDialogOpen(false)}>
        <DialogTitle>Neues Produkt erstellen</DialogTitle>
        <DialogContent>
            <Stack spacing={2} sx={{mt: 1}}>
                <TextField
                    autoFocus
                    label="Produktname"
                    type="text"
                    fullWidth
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                />
                <TextField
                    label="Preis"
                    type="number"
                    fullWidth
                    value={newProductPrice}
                    onChange={(e) => setNewProductPrice(e.target.value)}
                    InputProps={{ endAdornment: '€' }}
                />
                <TextField
                    select
                    label="Kategorie"
                    value={newProductCategory}
                    onChange={(e) => setNewProductCategory(e.target.value)}
                    fullWidth
                >
                    {categories.map((cat) => (
                        <MenuItem key={cat._id} value={cat._id}>
                            {cat.name}
                        </MenuItem>
                    ))}
                </TextField>
            </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProductDialogOpen(false)}>Abbrechen</Button>
          <Button onClick={handleCreateProduct}>Erstellen</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast(p => ({ ...p, open: false }))}>
        <Alert onClose={() => setToast(p => ({ ...p, open: false }))} severity={toast.sev} sx={{ width: '100%' }}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </>
  );
}
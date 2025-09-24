'use client'

import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
} from '@mui/material';
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  fetchProductCategories,
  Product as ProductType,
  ProductCategory,
} from '@/services/api';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '@/context/AuthContext';

export default function ProductsPage() {
  const { token } = useAuth();
  const [products, setProducts] = useState<ProductType[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductType | null>(null);
  const [formState, setFormState] = useState({
    name: '',
    price: '',
    description: '',
    category: '',
    stock: '0', // Lagerbestand zum Formularstatus hinzugefügt
  });

  useEffect(() => {
    if(token) {
      loadData();
    }
  }, [token]);

  const loadData = async () => {
    try {
      const [productsData, categoriesData] = await Promise.all([
        fetchProducts(token),
        fetchProductCategories(token),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
    }
  };

  const handleOpenDialog = (product?: ProductType) => {
    if (product) {
      setEditingProduct(product);
      setFormState({
        name: product.name,
        price: String(product.price),
        description: product.description || '',
        category: product.category,
        stock: String(product.stock), // Lagerbestand beim Bearbeiten setzen
      });
    } else {
      setEditingProduct(null);
      setFormState({
        name: '',
        price: '',
        description: '',
        category: '',
        stock: '0',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleSave = async () => {
    if (!formState.name || !formState.price || !formState.category) {
      alert('Bitte füllen Sie alle Pflichtfelder aus.');
      return;
    }

    const payload = {
      name: formState.name,
      price: parseFloat(formState.price),
      description: formState.description,
      category: formState.category,
      stock: parseInt(formState.stock, 10) || 0, // Lagerbestand zum Payload hinzufügen
    };

    try {
      if (editingProduct) {
        await updateProduct(editingProduct._id, payload);
      } else {
        await createProduct(payload);
      }
      loadData();
      handleCloseDialog();
    } catch (error) {
      console.error('Fehler beim Speichern des Produkts:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Sind Sie sicher, dass Sie dieses Produkt löschen möchten?')) {
      try {
        await deleteProduct(id);
        loadData();
      } catch (error) {
        console.error('Fehler beim Löschen des Produkts:', error);
      }
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', my: 4 }}>
        <Typography variant="h4">Produktverwaltung</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Neues Produkt
        </Button>
      </Box>

      <List>
        {products.map((product) => (
          <ListItem
            key={product._id}
            divider
            secondaryAction={
              <>
                <IconButton edge="end" aria-label="edit" onClick={() => handleOpenDialog(product)}>
                  <EditIcon />
                </IconButton>
                <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(product._id)}>
                  <DeleteIcon />
                </IconButton>
              </>
            }
          >
            <ListItemText
              primary={product.name}
              secondary={`Preis: ${product.price.toFixed(2)}€ | Lagerbestand: ${product.stock}`}
            />
          </ListItem>
        ))}
      </List>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} fullWidth maxWidth="sm">
        <DialogTitle>{editingProduct ? 'Produkt bearbeiten' : 'Neues Produkt erstellen'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Produktname"
            type="text"
            fullWidth
            variant="outlined"
            value={formState.name}
            onChange={(e) => setFormState({ ...formState, name: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Preis (€)"
            type="number"
            fullWidth
            variant="outlined"
            value={formState.price}
            onChange={(e) => setFormState({ ...formState, price: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Lagerbestand"
            type="number"
            fullWidth
            variant="outlined"
            value={formState.stock}
            onChange={(e) => setFormState({ ...formState, stock: e.target.value })}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Kategorie</InputLabel>
            <Select
              value={formState.category}
              label="Kategorie"
              onChange={(e) => setFormState({ ...formState, category: e.target.value })}
            >
              {categories.map((cat) => (
                <MenuItem key={cat._id} value={cat._id}>
                  {cat.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="Beschreibung"
            type="text"
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            value={formState.description}
            onChange={(e) => setFormState({ ...formState, description: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Abbrechen</Button>
          <Button onClick={handleSave} variant="contained">
            Speichern
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
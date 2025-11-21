import { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { productService } from '../../services/supabase';
import { useTranslation } from 'react-i18next';

export default function ProductsManagement() {
  const { t } = useTranslation();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: '',
    description: '',
    unit_price: '',
    stock_quantity: '',
    is_active: true,
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await productService.getProducts();
      setProducts(data || []);
    } catch (error: any) {
      console.error('Error loading products:', error);
      alert(`Error loading products: ${error.message || 'Unknown error'}`);
      setProducts([]);
    }
    setLoading(false);
  };

  const handleAdd = () => {
    setEditProduct(null);
    setFormData({
      code: '',
      name: '',
      category: '',
      description: '',
      unit_price: '',
      stock_quantity: '',
      is_active: true,
    });
    setDialogOpen(true);
  };

  const handleEdit = (product: any) => {
    setEditProduct(product);
    setFormData({
      code: product.code,
      name: product.name,
      category: product.category,
      description: product.description || '',
      unit_price: product.unit_price.toString(),
      stock_quantity: product.stock_quantity.toString(),
      is_active: product.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      // Validation
      if (!formData.code || !formData.name || !formData.category) {
        alert('Please fill in all required fields (Code, Name, Category)');
        return;
      }

      const unitPrice = formData.unit_price ? parseFloat(formData.unit_price) : 0;
      const stockQuantity = formData.stock_quantity ? parseInt(formData.stock_quantity) : 0;

      if (isNaN(unitPrice) || isNaN(stockQuantity)) {
        alert('Please enter valid numbers for price and stock quantity');
        return;
      }

      const data = {
        code: formData.code,
        name: formData.name,
        category: formData.category,
        description: formData.description,
        unit_price: unitPrice,
        stock_quantity: stockQuantity,
        is_active: formData.is_active,
      };

      if (editProduct) {
        await productService.updateProduct(editProduct.id, data);
        alert('Product updated successfully!');
      } else {
        await productService.createProduct(data);
        alert('Product created successfully!');
      }
      setDialogOpen(false);
      loadProducts();
    } catch (error: any) {
      console.error('Error saving product:', error);
      alert(`Error saving product: ${error.message || 'Unknown error'}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await productService.deleteProduct(id);
        alert('Product deleted successfully!');
        loadProducts();
      } catch (error: any) {
        console.error('Error deleting product:', error);
        alert(`Error deleting product: ${error.message || 'Unknown error'}`);
      }
    }
  };

  const columns: GridColDef[] = [
    { field: 'code', headerName: t('code'), width: 120 },
    { field: 'name', headerName: t('name'), width: 200 },
    { field: 'category', headerName: t('category'), width: 150 },
    {
      field: 'unit_price',
      headerName: t('price'),
      width: 120,
      renderCell: (params: GridRenderCellParams) => `₹${params.value}`,
    },
    { field: 'stock_quantity', headerName: t('stock'), width: 100 },
    {
      field: 'is_active',
      headerName: t('status'),
      width: 100,
      renderCell: (params: GridRenderCellParams) => (
        <Typography color={params.value ? 'success.main' : 'error.main'}>
          {params.value ? t('active') : t('inactive')}
        </Typography>
      ),
    },
    {
      field: 'actions',
      headerName: t('actions'),
      width: 120,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <IconButton size="small" color="primary" onClick={() => handleEdit(params.row)}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" color="error" onClick={() => handleDelete(params.row.id)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={600}>
          {t('productsManagement')}
        </Typography>
        <Box>
          <Button
            startIcon={<RefreshIcon />}
            variant="outlined"
            onClick={loadProducts}
            disabled={loading}
            sx={{ mr: 1 }}
          >
            {t('refresh')}
          </Button>
          <Button startIcon={<AddIcon />} variant="contained" onClick={handleAdd}>
            {t('addProduct')}
          </Button>
        </Box>
      </Box>

      <Card>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={products}
              columns={columns}
              loading={loading}
              pageSizeOptions={[10, 25, 50]}
              initialState={{
                pagination: { paginationModel: { pageSize: 10 } },
              }}
              disableRowSelectionOnClick
              sx={{ border: 'none' }}
            />
          </Box>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Product Code*"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            margin="normal"
            required
            inputProps={{ maxLength: 50 }}
          />
          <TextField
            fullWidth
            label="Product Name*"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            margin="normal"
            required
            inputProps={{ maxLength: 100 }}
          />
          <TextField
            fullWidth
            label="Category*"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            margin="normal"
            required
            inputProps={{ maxLength: 50 }}
          />
          <TextField
            fullWidth
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            margin="normal"
            multiline
            rows={2}
            inputProps={{ maxLength: 500 }}
          />
          <TextField
            fullWidth
            label="Unit Price"
            type="number"
            value={formData.unit_price}
            onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
            margin="normal"
            inputProps={{ min: 0, step: 0.01 }}
          />
          <TextField
            fullWidth
            label="Stock Quantity"
            type="number"
            value={formData.stock_quantity}
            onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
            margin="normal"
            inputProps={{ min: 0, step: 1 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
            }
            label="Active"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

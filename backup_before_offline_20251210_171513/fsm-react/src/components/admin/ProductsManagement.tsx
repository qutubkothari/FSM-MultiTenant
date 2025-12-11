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
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  Translate as TranslateIcon,
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { supabase } from '../../services/supabase';
import { useTenantStore } from '../../store/tenantStore';
import { useTranslation } from 'react-i18next';
import { getBilingualDisplay } from '../../utils/arabicUtils';
import BilingualTextField from '../common/BilingualTextField';
import { autoTranslateBilingual } from '../../services/translationService';

export default function ProductsManagement() {
  const { t, i18n } = useTranslation();
  const { tenant } = useTenantStore();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [translating, setTranslating] = useState(false);
  const [translateResult, setTranslateResult] = useState<string>('');
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 25,
  });
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    name_ar: '',
    category: '',
    category_ar: '',
    description: '',
    description_ar: '',
    unit_price: '',
    stock_quantity: '',
    is_active: true,
  });

  useEffect(() => {
    if (tenant?.id) {
      loadProducts();
    }
  }, [tenant?.id]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const tenantId = tenant?.id;
      if (!tenantId) {
        console.warn('No tenant selected');
        setProducts([]);
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('name');
      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error('Error loading products:', error);
      alert(`Error loading products: ${error.message || 'Unknown error'}`);
      setProducts([]);
    }
    setLoading(false);
  };

  const handleTranslateAll = async () => {
    if (!tenant?.id) {
      setTranslateResult('❌ Error: No tenant selected');
      return;
    }

    if (!confirm(t('translateAllConfirm') || 'This will translate all products without Arabic names. Continue?')) {
      return;
    }

    setTranslating(true);
    setTranslateResult('');
    
    try {
      // Get all products without Arabic translations
      const productsToTranslate = products.filter(p => !p.name_ar || !p.category_ar);

      if (productsToTranslate.length === 0) {
        setTranslateResult('✅ All products already have Arabic translations!');
        setTranslating(false);
        return;
      }

      let updated = 0;
      let failed = 0;

      // Update each product with translations
      for (const product of productsToTranslate) {
        try {
          const updates: any = {};

          // Translate name if missing
          if (!product.name_ar && product.name) {
            const nameTranslation = await autoTranslateBilingual(product.name);
            updates.name_ar = nameTranslation.arabic;
          }

          // Translate category if missing
          if (!product.category_ar && product.category) {
            const categoryTranslation = await autoTranslateBilingual(product.category);
            updates.category_ar = categoryTranslation.arabic;
          }

          // Translate description if missing and exists
          if (!product.description_ar && product.description) {
            const descTranslation = await autoTranslateBilingual(product.description);
            updates.description_ar = descTranslation.arabic;
          }

          // Update if we have translations
          if (Object.keys(updates).length > 0) {
            const { error: updateError } = await supabase
              .from('products')
              .update(updates)
              .eq('id', product.id);

            if (updateError) {
              console.error(`Failed to update product ${product.name}:`, updateError);
              failed++;
            } else {
              updated++;
            }
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (err) {
          console.error(`Error translating product ${product.name}:`, err);
          failed++;
        }
      }

      setTranslateResult(`✅ Translation complete!\nUpdated: ${updated} | Failed: ${failed}`);
      
      // Reload products to show updated data
      await loadProducts();
      
    } catch (err: any) {
      setTranslateResult(`❌ Error: ${err.message}`);
    } finally {
      setTranslating(false);
    }
  };

  const handleAdd = () => {
    setEditProduct(null);
    setFormData({
      code: '',
      name: '',
      name_ar: '',
      category: '',
      category_ar: '',
      description: '',
      description_ar: '',
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
      name_ar: product.name_ar || '',
      category: product.category,
      category_ar: product.category_ar || '',
      description: product.description || '',
      description_ar: product.description_ar || '',
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

      // Auto-translate name
      const nameTranslation = formData.name ? await autoTranslateBilingual(formData.name) : { english: '', arabic: '' };
      const name = formData.name || nameTranslation.english;
      const name_ar = formData.name_ar || nameTranslation.arabic;

      // Auto-translate category
      const categoryTranslation = formData.category ? await autoTranslateBilingual(formData.category) : { english: '', arabic: '' };
      const category = formData.category || categoryTranslation.english;
      const category_ar = formData.category_ar || categoryTranslation.arabic;

      // Auto-translate description
      const descriptionTranslation = formData.description ? await autoTranslateBilingual(formData.description) : { english: '', arabic: '' };
      const description = formData.description || descriptionTranslation.english;
      const description_ar = formData.description_ar || descriptionTranslation.arabic;

      const data = {
        code: formData.code,
        name,
        name_ar: name_ar || null,
        category,
        category_ar: category_ar || null,
        description,
        description_ar: description_ar || null,
        unit_price: unitPrice,
        stock_quantity: stockQuantity,
        is_active: formData.is_active,
      };

      if (editProduct) {
        const { error } = await supabase.from('products').update(data).eq('id', editProduct.id);
        if (error) throw error;
        alert('Product updated successfully!');
      } else {
        const tenantId = useTenantStore.getState().tenant?.id;
        if (!tenantId) throw new Error('No tenant selected');
        const { error } = await supabase.from('products').insert([{ ...data, tenant_id: tenantId }]);
        if (error) throw error;
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
    if (window.confirm(t('confirmDeleteProduct'))) {
      try {
        const { error } = await supabase.from('products').update({ deleted_at: new Date().toISOString() }).eq('id', id);
        if (error) throw error;
        alert(t('deleteSuccess'));
        loadProducts();
      } catch (error: any) {
        console.error('Error deleting product:', error);
        alert(t('deleteFailed'));
      }
    }
  };

  const columns: GridColDef[] = [
    { field: 'code', headerName: t('code'), width: 120 },
    {
      field: 'name',
      headerName: t('name'),
      width: 200,
      renderCell: (params: GridRenderCellParams) => {
        return getBilingualDisplay(params.row.name, params.row.name_ar, i18n.language === 'ar');
      },
    },
    {
      field: 'category',
      headerName: t('category'),
      width: 150,
      renderCell: (params: GridRenderCellParams) => {
        return getBilingualDisplay(params.row.category, params.row.category_ar, i18n.language === 'ar');
      },
    },
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
            startIcon={translating ? <CircularProgress size={16} /> : <TranslateIcon />}
            variant="outlined"
            onClick={handleTranslateAll}
            disabled={loading || translating}
            sx={{ mr: 1 }}
            color="secondary"
          >
            {translating ? t('translating') || 'Translating...' : t('translateAll') || 'Translate All'}
          </Button>
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

      {translateResult && (
        <Alert 
          severity={translateResult.includes('❌') ? 'error' : 'success'}
          onClose={() => setTranslateResult('')}
          sx={{ mb: 2, whiteSpace: 'pre-line' }}
        >
          {translateResult}
        </Alert>
      )}

      <Card>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={products}
              columns={columns}
              loading={loading}
              pageSizeOptions={[25, 50, 100]}
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
              disableRowSelectionOnClick
              sx={{
                border: 'none',
                '& .MuiDataGrid-cell:focus': {
                  outline: 'none',
                },
                '& .MuiDataGrid-columnHeader:focus': {
                  outline: 'none',
                },
              }}
            />
          </Box>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editProduct ? t('Edit Product') : t('Add New Product')}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label={t('Product Code') + '*'}
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            margin="normal"
            required
            inputProps={{ maxLength: 50 }}
          />
          <Box sx={{ mt: 2 }}>
            <BilingualTextField
              labelEn="Product Name"
              labelAr="اسم المنتج"
              valueEn={formData.name}
              valueAr={formData.name_ar}
              onChangeEn={(val) => setFormData({ ...formData, name: val })}
              onChangeAr={(val) => setFormData({ ...formData, name_ar: val })}
              required
            />
          </Box>
          <Box sx={{ mt: 2 }}>
            <BilingualTextField
              labelEn="Category"
              labelAr="الفئة"
              valueEn={formData.category}
              valueAr={formData.category_ar}
              onChangeEn={(val) => setFormData({ ...formData, category: val })}
              onChangeAr={(val) => setFormData({ ...formData, category_ar: val })}
              required
            />
          </Box>
          <Box sx={{ mt: 2 }}>
            <BilingualTextField
              labelEn="Description"
              labelAr="الوصف"
              valueEn={formData.description}
              valueAr={formData.description_ar}
              onChangeEn={(val) => setFormData({ ...formData, description: val })}
              onChangeAr={(val) => setFormData({ ...formData, description_ar: val })}
              multiline
              rows={3}
            />
          </Box>
          <TextField
            fullWidth
            label={t('Unit Price')}
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

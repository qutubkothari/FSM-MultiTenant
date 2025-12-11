import { getBilingualDisplay } from '../../utils/arabicUtils';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { supabase } from '../../services/supabase';
import { useTenantStore } from '../../store/tenantStore';
import { SalesmanTarget, ProductTarget } from '../../types';
import { usePlantAccess } from '../../hooks/usePlantAccess';

export default function TargetsManagement() {
  const { t, i18n } = useTranslation();
  const { tenant } = useTenantStore();
  const { filterByPlantAccess } = usePlantAccess();
  const [targets, setTargets] = useState<SalesmanTarget[]>([]);
  const [salesmen, setSalesmen] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<SalesmanTarget | null>(null);
  const [error, setError] = useState('');

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [formData, setFormData] = useState({
    salesman_id: '',
    month: currentMonth,
    year: currentYear,
    visits_per_month: 0,
    visits_per_day: 0,
    new_visits_per_month: 0,
    repeat_visits_per_month: 0,
    orders_per_month: 0,
    order_value_per_month: 0,
    product_targets: [] as ProductTarget[],
  });

  useEffect(() => {
    if (tenant?.id) {
      loadData();
    }
  }, [tenant?.id]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const tenantId = tenant?.id;
      if (!tenantId) {
        setError('No tenant selected. Please select a company.');
        setLoading(false);
        return;
      }
      
      console.log('🎯 Loading targets for tenant:', tenantId);
      
      const [targetsResult, salesmenResult, productsResult] = await Promise.all([
        supabase.from('salesman_targets').select('*, plant').eq('tenant_id', tenantId).is('deleted_at', null),
        supabase.from('salesmen').select('id, name, name_ar, is_admin, plant').eq('is_admin', false).eq('tenant_id', tenantId).is('deleted_at', null),
        supabase.from('products').select('id, name').eq('tenant_id', tenantId).is('deleted_at', null),
      ]);
      
      console.log('🎯 Targets query result:', targetsResult);
      console.log('🎯 Salesmen result:', salesmenResult.data);
      
      if (targetsResult.error) {
        console.error('❌ Targets error:', targetsResult.error);
        throw targetsResult.error;
      }
      
      // Apply plant access filtering
      const allSalesmen = salesmenResult.data || [];
      const filteredSalesmen = filterByPlantAccess(allSalesmen, 'plant');
      
      // Create a map of salesman_id to name and name_ar
      const salesmenMap = new Map();
      filteredSalesmen.forEach((s: any) => {
        salesmenMap.set(s.id, { name: s.name, name_ar: s.name_ar });
      });
      
      // Filter and map targets
      const allTargets = targetsResult.data || [];
      const filteredTargets = filterByPlantAccess(allTargets, 'plant');
      const mappedTargets = filteredTargets.map((target: any) => {
        const salesmanData = salesmenMap.get(target.salesman_id) || { name: 'Unknown', name_ar: null };
        return {
          ...target,
          salesman_name: salesmanData.name,
          salesman_name_ar: salesmanData.name_ar
        };
      });
      
      console.log('🎯 Mapped targets:', mappedTargets);
      
      setTargets(mappedTargets);
      setSalesmen(filteredSalesmen);
      setProducts(productsResult.data || []);
    } catch (err: any) {
      console.error('Error loading data:', err);
      const errorMessage = err.message || 'Failed to load data';
      const errorCode = err.code || '';
      const errorDetails = err.details || '';
      
      // Show detailed error message
      setError(`Error: ${errorMessage} (Code: ${errorCode}). Details: ${errorDetails || 'None'}`);
      
      if (err.code === '42P01' || errorMessage.includes('does not exist')) {
        setError('TARGETS_TABLE_NOT_FOUND');
      }
    }
    setLoading(false);
  };

  const handleOpenDialog = (target?: SalesmanTarget) => {
    if (target) {
      setEditingTarget(target);
      setFormData({
        salesman_id: target.salesman_id,
        month: target.month,
        year: target.year,
        visits_per_month: target.visits_per_month,
        visits_per_day: target.visits_per_day,
        new_visits_per_month: target.new_visits_per_month,
        repeat_visits_per_month: target.repeat_visits_per_month,
        orders_per_month: target.orders_per_month,
        order_value_per_month: target.order_value_per_month,
        product_targets: target.product_targets || [],
      });
    } else {
      setEditingTarget(null);
      setFormData({
        salesman_id: '',
        month: currentMonth,
        year: currentYear,
        visits_per_month: 0,
        visits_per_day: 0,
        new_visits_per_month: 0,
        repeat_visits_per_month: 0,
        orders_per_month: 0,
        order_value_per_month: 0,
        product_targets: [],
      });
    }
    setDialogOpen(true);
    setError('');
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTarget(null);
  };

  const handleSave = async () => {
    try {
      if (!formData.salesman_id) {
        setError('Please select a salesman');
        return;
      }

      const tenantId = useTenantStore.getState().tenant?.id;
      if (!tenantId) {
        setError('No tenant selected');
        return;
      }

      const targetData = {
        salesman_id: formData.salesman_id,
        month: formData.month,
        year: formData.year,
        visits_per_month: formData.visits_per_month,
        visits_per_day: formData.visits_per_day,
        new_visits_per_month: formData.new_visits_per_month,
        repeat_visits_per_month: formData.repeat_visits_per_month,
        orders_per_month: formData.orders_per_month,
        order_value_per_month: formData.order_value_per_month,
        product_targets: formData.product_targets,
        tenant_id: tenantId,
      };

      if (editingTarget) {
        // Update existing target
        const { error } = await supabase
          .from('salesman_targets')
          .update(targetData)
          .eq('id', editingTarget.id);
        
        if (error) throw error;
      } else {
        // Insert or update using upsert (handles conflict)
        const { error } = await supabase
          .from('salesman_targets')
          .upsert(targetData, {
            onConflict: 'salesman_id,month,year'
          });
        
        if (error) throw error;
      }

      await loadData();
      handleCloseDialog();
    } catch (err: any) {
      console.error('Error saving target:', err);
      setError(err.message || 'Failed to save target');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(t('confirmDeleteTarget'))) {
      try {
        await supabase.from('salesman_targets').update({ deleted_at: new Date().toISOString() }).eq('id', id);
        await loadData();
      } catch (err) {
        console.error('Error deleting target:', err);
        setError(t('deleteFailed'));
      }
    }
  };

  const addProductTarget = () => {
    setFormData({
      ...formData,
      product_targets: [
        ...formData.product_targets,
        { product_id: '', target_quantity: 0 },
      ],
    });
  };

  const updateProductTarget = (index: number, field: string, value: any) => {
    const updated = [...formData.product_targets];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, product_targets: updated });
  };

  const removeProductTarget = (index: number) => {
    const updated = formData.product_targets.filter((_, i) => i !== index);
    setFormData({ ...formData, product_targets: updated });
  };

  const getMonthName = (month: number) => {
    const date = new Date(2000, month - 1, 1);
    return date.toLocaleString('default', { month: 'long' });
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={600}>
          {t('salesTargetsManagement')}
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            startIcon={<RefreshIcon />}
            variant="outlined"
            onClick={loadData}
            disabled={loading}
          >
            {t('refresh')}
          </Button>
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            onClick={() => handleOpenDialog()}
          >
            {t('setTarget')}
          </Button>
        </Box>
      </Box>

      {error && error !== 'TARGETS_TABLE_NOT_FOUND' && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {error === 'TARGETS_TABLE_NOT_FOUND' && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom>
            <strong>⚠️ Targets table not found in database</strong>
          </Typography>
          <Typography variant="body2" component="div">
            Please run the SQL migration to create the targets table:<br/>
            1. Open Supabase Dashboard → SQL Editor<br/>
            2. Run: <code>database/create-targets-table.sql</code><br/>
            3. Click "Refresh" button above
          </Typography>
        </Alert>
      )}

      <Card>
        <CardContent>
          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>{t('salesman')}</strong></TableCell>
                  <TableCell><strong>{t('month')}/{t('year')}</strong></TableCell>
                  <TableCell align="right"><strong>{t('visitsPerMonth')}</strong></TableCell>
                  <TableCell align="right"><strong>{t('visitsPerDay')}</strong></TableCell>
                  <TableCell align="right"><strong>{t('newVisitsPerMonth')}</strong></TableCell>
                  <TableCell align="right"><strong>{t('repeatVisitsPerMonth')}</strong></TableCell>
                  <TableCell align="right"><strong>{t('orders')}</strong></TableCell>
                  <TableCell align="right"><strong>{t('orderValue')}</strong></TableCell>
                  <TableCell align="center"><strong>{t('actions')}</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      {t('loading')}
                    </TableCell>
                  </TableRow>
                ) : targets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      {t('noData')}
                    </TableCell>
                  </TableRow>
                ) : (
                  targets.map((target) => (
                    <TableRow key={target.id} hover>
                      <TableCell>{getBilingualDisplay(target.salesman_name || '', target.salesman_name_ar, i18n.language === 'ar') || 'N/A'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={`${getMonthName(target.month)} ${target.year}`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">{target.visits_per_month}</TableCell>
                      <TableCell align="right">{target.visits_per_day}</TableCell>
                      <TableCell align="right">{target.new_visits_per_month}</TableCell>
                      <TableCell align="right">{target.repeat_visits_per_month}</TableCell>
                      <TableCell align="right">{target.orders_per_month}</TableCell>
                      <TableCell align="right">{tenant?.currencySymbol || '₹'}{target.order_value_per_month.toLocaleString()}</TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleOpenDialog(target)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(target.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Target Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingTarget ? t('editTarget') : t('setTarget')}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>{t('salesman')} *</InputLabel>
                <Select
                  value={formData.salesman_id}
                  label={`${t('salesman')} *`}
                  onChange={(e) =>
                    setFormData({ ...formData, salesman_id: e.target.value })
                  }
                  disabled={!!editingTarget}
                >
                  {salesmen.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {getBilingualDisplay(s.name, s.name_ar, i18n.language === 'ar')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>{t('month')} *</InputLabel>
                <Select
                  value={formData.month}
                  label={`${t('month')} *`}
                  onChange={(e) =>
                    setFormData({ ...formData, month: Number(e.target.value) })
                  }
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <MenuItem key={m} value={m}>
                      {getMonthName(m)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label={`${t('year')} *`}
                type="number"
                value={formData.year}
                onChange={(e) =>
                  setFormData({ ...formData, year: Number(e.target.value) })
                }
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" color="primary" sx={{ mt: 2, mb: 1 }}>
                {t('visitsTarget')}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('visitsPerMonth')}
                type="number"
                value={formData.visits_per_month}
                onChange={(e) =>
                  setFormData({ ...formData, visits_per_month: Number(e.target.value) })
                }
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('visitsPerDay')}
                type="number"
                inputProps={{ step: 0.1 }}
                value={formData.visits_per_day}
                onChange={(e) =>
                  setFormData({ ...formData, visits_per_day: Number(e.target.value) })
                }
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('newVisitsPerMonth')}
                type="number"
                value={formData.new_visits_per_month}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    new_visits_per_month: Number(e.target.value),
                  })
                }
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('repeatVisitsPerMonth')}
                type="number"
                value={formData.repeat_visits_per_month}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    repeat_visits_per_month: Number(e.target.value),
                  })
                }
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" color="primary" sx={{ mt: 2, mb: 1 }}>
                {t('ordersTarget')}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('ordersPerMonth')}
                type="number"
                value={formData.orders_per_month}
                onChange={(e) =>
                  setFormData({ ...formData, orders_per_month: Number(e.target.value) })
                }
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('orderValuePerMonth')}
                type="number"
                value={formData.order_value_per_month}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    order_value_per_month: Number(e.target.value),
                  })
                }
              />
            </Grid>

            <Grid item xs={12}>
              <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mt: 2, mb: 1 }}>
                <Typography variant="subtitle2" color="primary">
                  {t('productTargets')}
                </Typography>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={addProductTarget}
                >
                  {t('addProductTarget')}
                </Button>
              </Box>
            </Grid>

            {formData.product_targets.map((pt, index) => (
              <Grid item xs={12} key={index}>
                <Box display="flex" gap={2} alignItems="center">
                  <FormControl sx={{ flex: 1 }}>
                    <InputLabel>{t('product')}</InputLabel>
                    <Select
                      value={pt.product_id}
                      label={t('product')}
                      onChange={(e) =>
                        updateProductTarget(index, 'product_id', e.target.value)
                      }
                    >
                      {products.map((p) => (
                        <MenuItem key={p.id} value={p.id}>
                          {p.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField
                    label={t('targetQuantity')}
                    type="number"
                    value={pt.target_quantity}
                    onChange={(e) =>
                      updateProductTarget(index, 'target_quantity', Number(e.target.value))
                    }
                    sx={{ width: 150 }}
                  />
                  <IconButton
                    color="error"
                    onClick={() => removeProductTarget(index)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{t('cancel')}</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            startIcon={<SaveIcon />}
          >
            {t('save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

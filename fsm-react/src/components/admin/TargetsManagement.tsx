import { useState, useEffect } from 'react';
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
import { targetsService, salesmanService, productService } from '../../services/supabase';
import { SalesmanTarget, ProductTarget } from '../../types';

export default function TargetsManagement() {
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
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [targetsData, salesmenData, productsData] = await Promise.all([
        targetsService.getTargets(),
        salesmanService.getSalesmen(),
        productService.getProducts(),
      ]);
      setTargets(targetsData);
      setSalesmen(salesmenData.filter((s: any) => !s.is_admin));
      setProducts(productsData);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
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

      const targetData = {
        ...formData,
        product_targets: formData.product_targets,
      };

      if (editingTarget) {
        await targetsService.updateTarget(editingTarget.id, targetData);
      } else {
        await targetsService.createTarget(targetData);
      }

      await loadData();
      handleCloseDialog();
    } catch (err: any) {
      console.error('Error saving target:', err);
      setError(err.message || 'Failed to save target');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this target?')) {
      try {
        await targetsService.deleteTarget(id);
        await loadData();
      } catch (err) {
        console.error('Error deleting target:', err);
        setError('Failed to delete target');
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
          Sales Targets Management
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            startIcon={<RefreshIcon />}
            variant="outlined"
            onClick={loadData}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            onClick={() => handleOpenDialog()}
          >
            Set Target
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Salesman</strong></TableCell>
                  <TableCell><strong>Period</strong></TableCell>
                  <TableCell align="right"><strong>Visits/Month</strong></TableCell>
                  <TableCell align="right"><strong>Visits/Day</strong></TableCell>
                  <TableCell align="right"><strong>New Visits</strong></TableCell>
                  <TableCell align="right"><strong>Repeat Visits</strong></TableCell>
                  <TableCell align="right"><strong>Orders</strong></TableCell>
                  <TableCell align="right"><strong>Order Value</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : targets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      No targets set. Click "Set Target" to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  targets.map((target) => (
                    <TableRow key={target.id} hover>
                      <TableCell>{target.salesman_name}</TableCell>
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
                      <TableCell align="right">₹{target.order_value_per_month.toLocaleString()}</TableCell>
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
          {editingTarget ? 'Edit Target' : 'Set New Target'}
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
                <InputLabel>Salesman *</InputLabel>
                <Select
                  value={formData.salesman_id}
                  label="Salesman *"
                  onChange={(e) =>
                    setFormData({ ...formData, salesman_id: e.target.value })
                  }
                  disabled={!!editingTarget}
                >
                  {salesmen.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Month *</InputLabel>
                <Select
                  value={formData.month}
                  label="Month *"
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
                label="Year *"
                type="number"
                value={formData.year}
                onChange={(e) =>
                  setFormData({ ...formData, year: Number(e.target.value) })
                }
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" color="primary" sx={{ mt: 2, mb: 1 }}>
                Visit Targets
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Visits Per Month"
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
                label="Visits Per Day"
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
                label="New Visits Per Month"
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
                label="Repeat Visits Per Month"
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
                Order Targets
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Orders Per Month"
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
                label="Order Value Per Month (₹)"
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
                  Product-wise Targets (Optional)
                </Typography>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={addProductTarget}
                >
                  Add Product
                </Button>
              </Box>
            </Grid>

            {formData.product_targets.map((pt, index) => (
              <Grid item xs={12} key={index}>
                <Box display="flex" gap={2} alignItems="center">
                  <FormControl sx={{ flex: 1 }}>
                    <InputLabel>Product</InputLabel>
                    <Select
                      value={pt.product_id}
                      label="Product"
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
                    label="Target Quantity"
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
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            startIcon={<SaveIcon />}
          >
            Save Target
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

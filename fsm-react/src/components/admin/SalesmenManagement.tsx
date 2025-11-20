import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { supabase } from '../../services/supabase';
import { format } from 'date-fns';

export default function SalesmenManagement() {
  const { t } = useTranslation();
  const [salesmen, setSalesmen] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSalesman, setEditSalesman] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    is_admin: false,
    is_active: true,
  });

  useEffect(() => {
    loadSalesmen();
  }, []);

  const loadSalesmen = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('salesmen').select('*').order('created_at', { ascending: false });
      setSalesmen(data || []);
    } catch (error) {
      console.error('Error loading salesmen:', error);
    }
    setLoading(false);
  };

  const handleAdd = () => {
    setEditSalesman(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      is_admin: false,
      is_active: true,
    });
    setDialogOpen(true);
  };

  const handleEdit = (salesman: any) => {
    setEditSalesman(salesman);
    setFormData({
      name: salesman.name,
      phone: salesman.phone,
      email: salesman.email || '',
      is_admin: salesman.is_admin,
      is_active: salesman.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editSalesman) {
        await supabase.from('salesmen').update(formData).eq('id', editSalesman.id);
      } else {
        await supabase.from('salesmen').insert([formData]);
      }
      setDialogOpen(false);
      loadSalesmen();
    } catch (error) {
      console.error('Error saving salesman:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('⚠️ Are you sure you want to delete this salesman? This will also delete all their visits, targets, and related data.')) {
      try {
        // First, delete related data
        await supabase.from('salesman_targets').delete().eq('salesman_id', id);
        await supabase.from('visits').delete().eq('salesman_id', id);
        
        // Then delete the salesman
        const { error } = await supabase.from('salesmen').delete().eq('id', id);
        
        if (error) {
          alert(`Failed to delete salesman: ${error.message}`);
          console.error('Error deleting salesman:', error);
        } else {
          loadSalesmen();
        }
      } catch (error) {
        alert('Failed to delete salesman. They may have related data.');
        console.error('Error deleting salesman:', error);
      }
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: t('name'),
      width: 200,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" fontWeight={500}>
          {params.value}
        </Typography>
      ),
    },
    { field: 'phone', headerName: t('phone'), width: 150 },
    { field: 'email', headerName: t('email'), width: 200 },
    {
      field: 'is_admin',
      headerName: t('role'),
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value ? t('admin') : t('salesman')}
          size="small"
          color={params.value ? 'secondary' : 'default'}
        />
      ),
    },
    {
      field: 'is_active',
      headerName: t('status'),
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value ? t('active') : t('inactive')}
          size="small"
          color={params.value ? 'success' : 'error'}
        />
      ),
    },
    {
      field: 'created_at',
      headerName: t('joined'),
      width: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2">
          {format(new Date(params.value), 'MMM dd, yyyy')}
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
          {t('salesmenManagement')}
        </Typography>
        <Box>
          <Button
            startIcon={<RefreshIcon />}
            variant="outlined"
            onClick={loadSalesmen}
            disabled={loading}
            sx={{ mr: 1 }}
          >
            {t('refresh')}
          </Button>
          <Button startIcon={<AddIcon />} variant="contained" onClick={handleAdd}>
            {t('addSalesman')}
          </Button>
        </Box>
      </Box>

      <Card>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={salesmen}
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
        <DialogTitle>{editSalesman ? 'Edit Salesman' : 'Add New Salesman'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Full Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Phone Number"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Email (Optional)"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            margin="normal"
            type="email"
          />
          <FormControlLabel
            control={
              <Switch
                checked={formData.is_admin}
                onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
              />
            }
            label="Admin Access"
            sx={{ mt: 2 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
            }
            label="Active"
            sx={{ mt: 1 }}
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

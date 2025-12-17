import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getBilingualDisplay } from '../../utils/arabicUtils';
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
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  Visibility,
  VisibilityOff,
  VpnKey as KeyIcon,
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { supabase } from '../../services/supabase';
import { useTenantStore } from '../../store/tenantStore';
import { format } from 'date-fns';
import { plantService, Plant } from '../../services/plantService';
import BilingualTextField from '../common/BilingualTextField';
import { normalizeArabicNumerals } from '../../utils/arabicUtils';
import { usePlantAccess } from '../../hooks/usePlantAccess';

export default function SalesmenManagement() {
  const { t, i18n } = useTranslation();
  const { tenant } = useTenantStore();
  const { hasAccessToAllPlants, getAccessiblePlantIds } = usePlantAccess();
  const [salesmen, setSalesmen] = useState<any[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSalesman, setEditSalesman] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    name_ar: '',
    phone: '',
    email: '',
    password: '',
    is_admin: false,
    is_active: true,
    plant: [] as string[],
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (tenant?.id) {
      loadSalesmen();
      loadPlants();
    }
  }, [tenant?.id]);

  const loadPlants = async () => {
    try {
      if (!tenant?.id) {
        console.log('SalesmenManagement: No tenant ID available');
        return;
      }
      console.log('SalesmenManagement: Loading plants for tenant:', tenant.id);
      const allPlants = await plantService.getPlants(tenant.id);
      
      // Filter plants by access - regular admins only see their assigned plants
      const accessiblePlantIds = getAccessiblePlantIds();
      const filteredPlants = accessiblePlantIds 
        ? allPlants.filter(p => accessiblePlantIds.includes(p.id))
        : allPlants;
      
      console.log('SalesmenManagement: Loaded plants:', filteredPlants);
      setPlants(filteredPlants);
    } catch (error) {
      console.error('Error loading plants:', error);
    }
  };

  const loadSalesmen = async () => {
    setLoading(true);
    try {
      const tenantId = tenant?.id;
      console.log('🔍 Loading salesmen for tenant:', tenantId);
      console.log('🔍 Tenant object:', tenant);
      
      if (!tenantId) {
        console.warn('No tenant selected');
        setSalesmen([]);
        setLoading(false);
        return;
      }
      
      let query = supabase
        .from('salesmen')
        .select('*')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null);

      // Apply plant filter at database level for regular admins
      const accessiblePlantIds = getAccessiblePlantIds();
      const isFullAccess = hasAccessToAllPlants();
      
      console.log('🔐 SalesmenManagement - Plant Access Check:', {
        accessiblePlantIds,
        isFullAccess,
        hasPlantIds: accessiblePlantIds && accessiblePlantIds.length > 0
      });
      
      if (accessiblePlantIds && accessiblePlantIds.length > 0) {
        console.log('🔐 Applying plant filter:', accessiblePlantIds);
        
        // For TEXT[] array fields, we need to check if any of the accessible plants
        // overlap with the salesman's plant array using the && (overlap) operator
        // Format: plant && ARRAY['id1','id2']
        query = query.contains('plant', accessiblePlantIds);
        
        // Regular admins should NOT see other admins - only salesmen
        query = query.eq('is_admin', false);
      } else {
        console.log('🔐 No plant filter applied - showing all data');
      }
      
      query = query.order('created_at', { ascending: false });
      
      const { data, error } = await query;
      
      console.log('📊 Salesmen query result:', {
        data,
        error,
        tenantId,
        accessiblePlantIds,
        isRegularAdmin: accessiblePlantIds !== null
      });
      
      if (error) {
        console.error('Error loading salesmen:', error);
        throw error;
      }
      
      console.log('Loaded salesmen:', data?.length || 0);
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
      name_ar: '',
      phone: '',
      email: '',
      password: '',
      is_admin: false,
      is_active: true,
      plant: [],
    });
    setDialogOpen(true);
  };

  const generatePassword = () => {
    // Generate a random 8-character password
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, password });
  };

  const handleEdit = (salesman: any) => {
    setEditSalesman(salesman);
    setFormData({
      name: salesman.name,
      name_ar: salesman.name_ar || '',
      phone: salesman.phone,
      email: salesman.email || '',
      password: '', // Leave empty for edits
      is_admin: salesman.is_admin,
      is_active: salesman.is_active,
      plant: Array.isArray(salesman.plant) ? salesman.plant : (salesman.plant ? [salesman.plant] : []),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      // Security check: Regular admins cannot create admin users
      if (!hasAccessToAllPlants() && formData.is_admin) {
        alert('❌ Only super admins can create admin users');
        return;
      }
      
      // Security check: Regular admins can only assign plants they have access to
      if (!hasAccessToAllPlants()) {
        const accessiblePlantIds = getAccessiblePlantIds() || [];
        const invalidPlants = formData.plant.filter(p => !accessiblePlantIds.includes(p));
        if (invalidPlants.length > 0) {
          alert('❌ You can only assign plants you have access to');
          return;
        }
      }
      
      // Normalize phone and password to handle Arabic numerals
      const normalizedPhone = normalizeArabicNumerals(formData.phone);
      const normalizedPassword = formData.password ? normalizeArabicNumerals(formData.password) : '';
      
      if (editSalesman) {
        // Update salesman
        const updateData: any = {
          name: formData.name,
          name_ar: formData.name_ar || null,
          phone: normalizedPhone,
          email: formData.email,
          is_admin: formData.is_admin,
          is_active: formData.is_active,
          plant: formData.plant,
        };
        await supabase.from('salesmen').update(updateData).eq('id', editSalesman.id);
        
        // Update user password if provided
        // Note: Password is stored in plain text in the users table (not using Supabase Auth)
        if (normalizedPassword) {
          // Look up user by phone number (salesmen table doesn't have user_id)
          const { error: passwordError } = await supabase
            .from('users')
            .update({ password: normalizedPassword })
            .eq('phone', normalizedPhone);
          
          if (passwordError) {
            console.error('Password update error:', passwordError);
            throw passwordError;
          }
        }
      } else {
        // Validate password for new salesman
        if (!normalizedPassword || normalizedPassword.length < 6) {
          alert('Password must be at least 6 characters');
          return;
        }

        // Create user account first with tenant_id
        const tenantId = useTenantStore.getState().tenant?.id;
        if (!tenantId) throw new Error('No tenant selected');
        
        const { data: userData, error: userError } = await supabase
          .from('users')
          .insert([{
            phone: normalizedPhone,
            name: formData.name,
            name_ar: formData.name_ar || null,
            password: normalizedPassword,
            role: formData.is_admin ? 'admin' : 'salesman',
            is_active: formData.is_active,
            tenant_id: tenantId,
          }])
          .select()
          .single();

        if (userError) throw userError;

        console.log('User created:', userData);

        // Create salesman record linked to user with tenant_id
        const { data: salesmanData, error: salesmanError } = await supabase
          .from('salesmen')
          .insert([{
            name: formData.name,
            name_ar: formData.name_ar || null,
            phone: normalizedPhone,
            email: formData.email,
            is_active: formData.is_active,
            plant: formData.plant,
            tenant_id: tenantId,
          }])
          .select();

        if (salesmanError) {
          console.error('Error creating salesman:', salesmanError);
          throw salesmanError;
        }

        console.log('Salesman created:', salesmanData);
        alert(`✅ Salesman "${formData.name}" created successfully! Login: ${formData.phone} / Password: ${formData.password}`);
      }
      setDialogOpen(false);
      
      // Small delay to ensure database writes complete
      setTimeout(() => {
        loadSalesmen();
      }, 500);
    } catch (error: any) {
      console.error('Error saving salesman:', error);
      alert(`Error: ${error.message || 'Failed to save salesman'}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(t('confirmDeleteSalesman'))) {
      try {
        const { error } = await supabase.from('salesmen').update({ deleted_at: new Date().toISOString() }).eq('id', id);
        
        if (error) {
          alert(t('deleteFailed'));
          console.error('Error deleting salesman:', error);
        } else {
          alert(t('deleteSuccess'));
          loadSalesmen();
        }
      } catch (error) {
        alert(t('deleteFailed'));
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
          {getBilingualDisplay(
            params.row.name,
            params.row.name_ar,
            i18n.language === 'ar'
          )}
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editSalesman ? t('Edit Salesman') : t('Add New Salesman')}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <BilingualTextField
              labelEn="Full Name"
              labelAr="الاسم الكامل"
              valueEn={formData.name}
              valueAr={formData.name_ar}
              onChangeEn={(val) => setFormData({ ...formData, name: val })}
              onChangeAr={(val) => setFormData({ ...formData, name_ar: val })}
              required
            />
          </Box>
          <TextField
            fullWidth
            label={t('Phone Number') + '*'}
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            margin="normal"
            helperText={t('Accepts Arabic numerals (٠-٩)')}
          />
          <TextField
            fullWidth
            label={t('Email (Optional)')}
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            margin="normal"
            type="email"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Plants</InputLabel>
            <Select
              multiple
              value={formData.plant}
              onChange={(e) => setFormData({ ...formData, plant: e.target.value as string[] })}
              label="Plants"
              renderValue={(selected) => {
                // Ensure selected is always an array
                const selectedArray = Array.isArray(selected) ? selected : (selected ? [selected] : []);
                const selectedNames = selectedArray
                  .map((id: string) => plants.find(p => p.id === id)?.plant_name || '')
                  .filter(name => name !== ''); // Filter out empty names
                return selectedNames.length > 0 ? selectedNames.join(', ') : 'Select plants';
              }}
            >
              {plants.map((plant) => (
                <MenuItem key={plant.id} value={plant.id}>
                  <Checkbox checked={formData.plant.includes(plant.id)} />
                  <ListItemText primary={`${plant.plant_name} (${plant.plant_code})${plant.city ? ` - ${plant.city}` : ''}`} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label={editSalesman ? "New Password (leave empty to keep current)" : "Password"}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            margin="normal"
            type={showPassword ? 'text' : 'password'}
            required={!editSalesman}
            helperText={editSalesman ? "Only fill if you want to change the password" : "Password for login (min 6 characters)"}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    size="small"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                  {!editSalesman && (
                    <IconButton
                      onClick={generatePassword}
                      edge="end"
                      size="small"
                      title="Generate Password"
                    >
                      <KeyIcon />
                    </IconButton>
                  )}
                </InputAdornment>
              ),
            }}
          />
          {hasAccessToAllPlants() && (
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
          )}
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

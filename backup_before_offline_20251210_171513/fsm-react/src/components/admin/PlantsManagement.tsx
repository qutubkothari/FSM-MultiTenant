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
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useTenantStore } from '../../store/tenantStore';
import { plantService, Plant } from '../../services/plantService';
import { useTranslation } from 'react-i18next';
import BilingualTextField from '../common/BilingualTextField';
import { getBilingualDisplay } from '../../utils/arabicUtils';
import { usePlantAccess } from '../../hooks/usePlantAccess';

export default function PlantsManagement() {
  const { t, i18n } = useTranslation();
  const { tenant } = useTenantStore();
  const { filterByPlantAccess, hasAccessToAllPlants } = usePlantAccess();
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPlant, setEditPlant] = useState<Plant | null>(null);
  const [formData, setFormData] = useState({
    plant_code: '',
    plant_name: '',
    plant_name_ar: '',
    area: '',
    area_ar: '',
    city: '',
    city_ar: '',
  });

  useEffect(() => {
    if (tenant?.id) {
      loadPlants();
    }
  }, [tenant?.id]);

  const loadPlants = async () => {
    setLoading(true);
    try {
      if (!tenant?.id) return;
      const allPlants = await plantService.getPlants(tenant.id);
      // Filter plants based on admin's assigned plants
      const accessiblePlants = filterByPlantAccess(allPlants, 'id');
      setPlants(accessiblePlants);
    } catch (error) {
      console.error('Error loading plants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (plant?: Plant) => {
    if (plant) {
      setEditPlant(plant);
      setFormData({
        plant_code: plant.plant_code,
        plant_name: plant.plant_name,
        plant_name_ar: (plant as any).plant_name_ar || '',
        area: plant.area || '',
        area_ar: (plant as any).area_ar || '',
        city: plant.city || '',
        city_ar: (plant as any).city_ar || '',
      });
    } else {
      setEditPlant(null);
      setFormData({
        plant_code: '',
        plant_name: '',
        plant_name_ar: '',
        area: '',
        area_ar: '',
        city: '',
        city_ar: '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditPlant(null);
    setFormData({
      plant_code: '',
      plant_name: '',
      plant_name_ar: '',
      area: '',
      area_ar: '',
      city: '',
      city_ar: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tenant?.id) return;

    try {
      if (editPlant) {
        await plantService.updatePlant(editPlant.id, {
          plant_code: formData.plant_code,
          plant_name: formData.plant_name,
          plant_name_ar: formData.plant_name_ar || null,
          area: formData.area || null,
          area_ar: formData.area_ar || null,
          city: formData.city || null,
          city_ar: formData.city_ar || null,
        });
      } else {
        await plantService.createPlant({
          tenant_id: tenant.id,
          plant_code: formData.plant_code,
          plant_name: formData.plant_name,
          plant_name_ar: formData.plant_name_ar || null,
          area: formData.area || null,
          area_ar: formData.area_ar || null,
          city: formData.city || null,
          city_ar: formData.city_ar || null,
        });
      }
      
      handleCloseDialog();
      loadPlants();
    } catch (error) {
      console.error('Error saving plant:', error);
      alert('Error saving plant. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('confirmDeletePlant'))) {
      return;
    }

    try {
      await plantService.deletePlant(id);
      alert(t('deleteSuccess'));
      loadPlants();
    } catch (error) {
      console.error('Error deleting plant:', error);
      alert(t('deleteFailed'));
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'plant_code',
      headerName: t('plantCode'),
      flex: 1,
      minWidth: 120,
    },
    {
      field: 'plant_name',
      headerName: t('plantName'),
      flex: 1.5,
      minWidth: 180,
      renderCell: (params: GridRenderCellParams) => (
        <span>{getBilingualDisplay(params.row.plant_name, params.row.plant_name_ar, i18n.language === 'ar')}</span>
      ),
    },
    {
      field: 'area',
      headerName: t('area'),
      flex: 1,
      minWidth: 120,
      renderCell: (params: GridRenderCellParams) => (
        <span>{getBilingualDisplay(params.row.area || '', params.row.area_ar, i18n.language === 'ar')}</span>
      ),
    },
    {
      field: 'city',
      headerName: t('city'),
      flex: 1,
      minWidth: 120,
      renderCell: (params: GridRenderCellParams) => (
        <span>{getBilingualDisplay(params.row.city || '', params.row.city_ar, i18n.language === 'ar')}</span>
      ),
    },
    {
      field: 'actions',
      headerName: t('actions'),
      width: 120,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <IconButton
            size="small"
            onClick={() => handleOpenDialog(params.row)}
            color="primary"
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleDelete(params.row.id)}
            color="error"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3, direction: i18n.language === 'ar' ? 'rtl' : 'ltr' }}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" component="h2">
              {t('plantsManagement')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadPlants}
              >
                {t('refresh')}
              </Button>
              {hasAccessToAllPlants() && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenDialog()}
                >
                  {t('addPlant')}
                </Button>
              )}
            </Box>
          </Box>

          <DataGrid
            rows={plants}
            columns={columns}
            loading={loading}
            autoHeight
            pageSizeOptions={[5, 10, 25, 50]}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
            }}
            disableRowSelectionOnClick
            sx={{
              '& .MuiDataGrid-root': {
                direction: i18n.language === 'ar' ? 'rtl' : 'ltr'
              }
            }}
          />
        </CardContent>
      </Card>

      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog} 
        maxWidth="md" 
        fullWidth
        dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}
        PaperProps={{
          sx: {
            direction: i18n.language === 'ar' ? 'rtl' : 'ltr'
          }
        }}
      >
        <form onSubmit={handleSubmit}>
          <DialogTitle sx={{ textAlign: i18n.language === 'ar' ? 'right' : 'left' }}>
            {editPlant ? t('editPlant') : t('addNewPlant')}
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label={t('plantCode') + '*'}
              value={formData.plant_code}
              onChange={(e) => setFormData({ ...formData, plant_code: e.target.value })}
              margin="normal"
              required
              placeholder="e.g., P001, MUM01"
            />
            <Box sx={{ mt: 2 }}>
              <BilingualTextField
                labelEn="Company Name"
                labelAr="اسم الشركة"
                valueEn={formData.plant_name}
                valueAr={formData.plant_name_ar}
                onChangeEn={(val) => setFormData({ ...formData, plant_name: val })}
                onChangeAr={(val) => setFormData({ ...formData, plant_name_ar: val })}
                required
              />
            </Box>
            <Box sx={{ mt: 2 }}>
              <BilingualTextField
                labelEn="Area"
                labelAr="المنطقة"
                valueEn={formData.area}
                valueAr={formData.area_ar}
                onChangeEn={(val) => setFormData({ ...formData, area: val })}
                onChangeAr={(val) => setFormData({ ...formData, area_ar: val })}
              />
            </Box>
            <Box sx={{ mt: 2 }}>
              <BilingualTextField
                labelEn="City"
                labelAr="المدينة"
                valueEn={formData.city}
                valueAr={formData.city_ar}
                onChangeEn={(val) => setFormData({ ...formData, city: val })}
                onChangeAr={(val) => setFormData({ ...formData, city_ar: val })}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{
            justifyContent: i18n.language === 'ar' ? 'flex-start' : 'flex-end',
            flexDirection: i18n.language === 'ar' ? 'row-reverse' : 'row'
          }}>
            <Button onClick={handleCloseDialog}>{t('cancel')}</Button>
            <Button type="submit" variant="contained">
              {editPlant ? t('update') : t('create')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}

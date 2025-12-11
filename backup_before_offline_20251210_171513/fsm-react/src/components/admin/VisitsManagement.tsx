import { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Chip,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  LocationOn as LocationIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { supabase } from '../../services/supabase';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { plantService, Plant } from '../../services/plantService';
import { useTenantStore } from '../../store/tenantStore';
import { useTranslation } from 'react-i18next';
import { getBilingualDisplay } from '../../utils/arabicUtils';
import { usePlantAccess } from '../../hooks/usePlantAccess';

export default function VisitsManagement() {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;
  const { tenant } = useTenantStore();
  const { filterByPlantAccess, getAccessiblePlantIds } = usePlantAccess();
  const [visits, setVisits] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 25, // Load only 25 at a time
  });
  const [migrating, setMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState('');
  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [showImage, setShowImage] = useState(false);
  const [clientsDialogOpen, setClientsDialogOpen] = useState(false);
  const [selectedSalesmanClients, setSelectedSalesmanClients] = useState<any[]>([]);
  const [selectedSalesmanName, setSelectedSalesmanName] = useState('');
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [filterSalesman, setFilterSalesman] = useState<string>('all');
  const [salesmen, setSalesmen] = useState<any[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadVisits();
    loadProducts();
    loadSalesmen();
  }, []);

  useEffect(() => {
    if (tenant?.id) {
      loadPlants();
    }
  }, [tenant?.id]);

  const loadPlants = async () => {
    try {
      if (!tenant?.id) {
        console.log('VisitsManagement: No tenant ID available');
        return;
      }
      console.log('VisitsManagement: Loading plants for tenant:', tenant.id);
      const data = await plantService.getPlants(tenant.id);
      console.log('VisitsManagement: Loaded plants:', data);
      
      // Filter plants by accessible IDs
      const accessiblePlantIds = getAccessiblePlantIds();
      const filteredPlants = accessiblePlantIds 
        ? data.filter(plant => accessiblePlantIds.includes(plant.id))
        : data;
      
      console.log('VisitsManagement: Filtered plants:', filteredPlants.length, 'out of', data.length);
      setPlants(filteredPlants);
    } catch (error) {
      console.error('Error loading plants:', error);
    }
  };

  const loadVisits = async () => {
    setLoading(true);
    try {
      if (!tenant?.id) {
        console.warn('No tenant selected');
        setVisits([]);
        setLoading(false);
        return;
      }

      // Load only last 7 days for instant load
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data } = await supabase
        .from('visits')
        .select(`
          id, customer_name, customer_name_ar, contact_person_ar, remarks_ar, 
          salesman_name, meeting_type, visit_type, created_at, location_address, status, plant,
          salesmen!visits_salesman_id_fkey(name, name_ar)
        `)
        .eq('tenant_id', tenant.id)
        .is('deleted_at', null)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(100); // Hard limit for speed
      
      // Extract salesman Arabic names from joined data
      const allVisits = (data || []).map((visit: any) => ({
        ...visit,
        salesman_name_ar: visit.salesmen?.name_ar || null,
      }));
      
      // Apply plant access filtering
      const visitsWithSalesmanNames = filterByPlantAccess(allVisits, 'plant');
      setVisits(visitsWithSalesmanNames);
    } catch (error) {
      console.error('Error loading visits:', error);
    }
    setLoading(false);
  };

  const handleViewClientsByfilter = (salesmanName: string) => {
    const salesmanVisits = visits.filter(v => v.salesman_name === salesmanName);
    const uniqueClients = Array.from(
      new Set(salesmanVisits.map(v => JSON.stringify({
        name: v.customer_name,
        phone: v.customer_phone,
        lastVisit: v.created_at
      })))
    ).map(str => JSON.parse(str));
    
    const sortedClients = uniqueClients.sort((a, b) => 
      new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime()
    );
    
    setSelectedSalesmanName(salesmanName);
    setSelectedSalesmanClients(sortedClients);
    setClientsDialogOpen(true);
  };

  const loadProducts = async () => {
    try {
      const { data } = await supabase.from('products').select('*');
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadSalesmen = async () => {
    try {
      if (!tenant?.id) return;
      const { data } = await supabase
        .from('salesmen')
        .select('id, name, name_ar')
        .eq('tenant_id', tenant.id)
        .eq('is_admin', false)
        .is('deleted_at', null);
      setSalesmen(data || []);
    } catch (error) {
      console.error('Error loading salesmen:', error);
    }
  };

  const migrateLocations = async () => {
    if (!window.confirm(t('confirmGpsToAddressConversion'))) {
      return;
    }

    setMigrating(true);
    setMigrationStatus(t('startingMigration'));

    try {
      const visitsToMigrate = visits.filter((visit) => {
        // Check if location_address looks like coordinates (contains comma and numbers)
        const addr = visit.location_address || '';
        return addr.match(/^[-\d.]+,\s*[-\d.]+$/) && visit.location_lat && visit.location_lng;
      });

      setMigrationStatus(t('foundVisitsToMigrate', { count: visitsToMigrate.length }));

      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < visitsToMigrate.length; i++) {
        const visit = visitsToMigrate[i];
        setMigrationStatus(t('processingVisit', { current: i + 1, total: visitsToMigrate.length }));

        try {
          // Reverse geocode
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${visit.location_lat}&lon=${visit.location_lng}&zoom=18&addressdetails=1`,
            {
              headers: {
                'User-Agent': 'Gazelle FSM App'
              }
            }
          );
          const data = await response.json();
          
          if (data && data.display_name) {
            // Update visit in database
            await supabase
              .from('visits')
              .update({ location_address: data.display_name })
              .eq('id', visit.id);
            successCount++;
          } else {
            failCount++;
          }

          // Rate limiting: wait 1 second between requests (Nominatim requirement)
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Failed to migrate visit ${visit.id}:`, error);
          failCount++;
        }
      }

      setMigrationStatus(t('migrationComplete', { success: successCount, failed: failCount }));
      
      // Reload visits to show updated addresses
      setTimeout(() => {
        loadVisits();
        setMigrationStatus('');
        setMigrating(false);
      }, 3000);
    } catch (error) {
      console.error('Migration error:', error);
      setMigrationStatus(t('migrationFailed'));
      setMigrating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(t('confirmDeleteVisit'))) {
      try {
        await supabase.from('visits').update({ deleted_at: new Date().toISOString() }).eq('id', id);
        loadVisits();
      } catch (error: any) {
        console.error('Error deleting visit:', error);
        alert(t('deleteFailed'));
      }
    }
  };

  const handleViewDetails = async (visit: any) => {
    console.log('Opening visit details for:', visit.id);
    // Fetch full visit details including image
    try {
      const { data, error } = await supabase
        .from('visits')
        .select('*')
        .eq('id', visit.id)
        .single();
      
      if (error) {
        console.error('Supabase error loading visit:', error);
        setSelectedVisit(visit);
      } else {
        console.log('Loaded visit details:', data);
        setSelectedVisit(data || visit);
      }
    } catch (error) {
      console.error('Error loading visit details:', error);
      setSelectedVisit(visit);
    }
    setDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedVisit(null);
    setShowImage(false); // Reset image visibility
  };

  const handleExportToExcel = async () => {
    if (!tenant?.id) {
      alert(t('noTenantSelected'));
      return;
    }

    setExporting(true);
    
    try {
      // Fetch complete visit data for export
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: completeVisits } = await supabase
        .from('visits')
        .select('*')
        .eq('tenant_id', tenant.id)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (!completeVisits) {
        alert(t('noDataToExport'));
        setExporting(false);
        return;
      }

    // Build product ID to name map
    const productMap: Record<string, string> = {};
    products.forEach((p: any) => {
      productMap[p.id] = p.name;
    });

    // Build plant ID to name map
    const plantMap: Record<string, string> = {};
    plants.forEach((plant: any) => {
      plantMap[plant.id] = `${plant.plant_name} (${plant.plant_code})`;
    });

    // Prepare data for Excel
    const exportData = completeVisits.map((visit) => {
      // Map product IDs to names
      let productNames = '';
      if (Array.isArray(visit.products_discussed)) {
        productNames = visit.products_discussed.map((pid: string) => productMap[pid] || pid).join(', ');
      } else if (Array.isArray(visit.products)) {
        productNames = visit.products.map((vp: any) => productMap[vp.product_id] || vp.product_id).join(', ');
      } else {
        productNames = visit.products_discussed || '';
      }

      // Map plant IDs to names
      let plantNames = '';
      if (Array.isArray(visit.plant)) {
        plantNames = visit.plant.map((plantId: string) => plantMap[plantId] || plantId).join(', ');
      } else if (visit.plant) {
        plantNames = plantMap[visit.plant] || visit.plant;
      }

      return {
        'Salesman': visit.salesman_name || 'N/A',
        'Customer Name': visit.customer_name || '',
        'Contact Person': visit.contact_person || '',
        'Phone': visit.customer_phone || '',
        'Visit Type': visit.visit_type || '',
        'Meeting Type': Array.isArray(visit.meeting_type) ? visit.meeting_type.join(', ') : visit.meeting_type || '',
        'Order Value': visit.order_value || 0,
        'Products Discussed': productNames,
        'Plants': plantNames,
        'Next Action': Array.isArray(visit.next_action) ? visit.next_action.join(', ') : (visit.next_action || ''),
        'Next Action Date': visit.next_action_date ? format(new Date(visit.next_action_date), 'MMM dd, yyyy') : '',
        'Potential': visit.potential || '',
        'Competitor': visit.competitor_name || '',
        'Can Be Switched': visit.can_be_switched || '',
        'Remarks': visit.remarks || '',
        'Status': visit.status || 'pending',
        'Location': visit.location_address || 'N/A',
        'GPS Lat': visit.location_lat || '',
        'GPS Lng': visit.location_lng || '',
        'Time In': visit.time_in ? format(new Date(visit.time_in), 'MMM dd, yyyy HH:mm') : '',
        'Time Out': visit.time_out ? format(new Date(visit.time_out), 'MMM dd, yyyy HH:mm') : '',
        'Created At': format(new Date(visit.created_at), 'MMM dd, yyyy HH:mm'),
      };
    });

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Visits');

    // Set column widths
    const colWidths = [
      { wch: 15 }, // Salesman
      { wch: 20 }, // Customer Name
      { wch: 20 }, // Contact Person
      { wch: 15 }, // Phone
      { wch: 25 }, // Meeting Type
      { wch: 30 }, // Products Discussed
      { wch: 20 }, // Next Action
      { wch: 15 }, // Next Action Date
      { wch: 12 }, // Potential
      { wch: 20 }, // Competitor
      { wch: 15 }, // Can Be Switched
      { wch: 30 }, // Remarks
      { wch: 12 }, // Status
      { wch: 30 }, // Location
      { wch: 12 }, // GPS Lat
      { wch: 12 }, // GPS Lng
      { wch: 18 }, // Time In
      { wch: 18 }, // Time Out
      { wch: 18 }, // Created At
    ];
    ws['!cols'] = colWidths;

    // Generate filename with current date
    const fileName = `Visits_Export_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`;

    // Fixed for Mac/Safari compatibility
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
      alert('✅ Export successful! File downloaded.');
    } catch (error) {
      console.error('Export error:', error);
      alert('❌ Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'salesman_name',
      headerName: t('salesman'),
      width: 180,
      renderCell: (params: GridRenderCellParams) => (
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="body2" fontWeight={500}>
            {getBilingualDisplay(
              params.row.salesman_name,
              params.row.salesman_name_ar,
              currentLanguage === 'ar'
            )}
          </Typography>
          <IconButton
            size="small"
            color="primary"
            onClick={() => handleViewClientsByfilter(params.value)}
            title={t('viewClients')}
          >
            <PeopleIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
    {
      field: 'customer_name',
      headerName: t('customer'),
      width: 150,
      renderCell: (params: GridRenderCellParams) => {
        return getBilingualDisplay(
          params.row.customer_name,
          params.row.customer_name_ar,
          currentLanguage === 'ar'
        );
      },
    },
    {
      field: 'visit_type',
      headerName: t('visitType'),
      width: 140,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value === 'personal' ? `🚗 ${t('personal')}` : `📞 ${t('telephone')}`}
          size="small"
          color={params.value === 'personal' ? 'primary' : 'secondary'}
          sx={{ textTransform: 'capitalize', fontWeight: 500 }}
        />
      ),
    },
    {
      field: 'customer_phone',
      headerName: t('phone'),
      width: 130,
    },
    {
      field: 'status',
      headerName: t('status'),
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={t(params.value)}
          size="small"
          color={
            params.value === 'completed'
              ? 'success'
              : params.value === 'pending'
              ? 'warning'
              : 'error'
          }
          sx={{ textTransform: 'capitalize' }}
        />
      ),
    },
    {
      field: 'created_at',
      headerName: t('date'),
      width: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2">
          {format(new Date(params.value), 'MMM dd, yyyy HH:mm')}
        </Typography>
      ),
    },
    {
      field: 'location_address',
      headerName: t('location'),
      width: 200,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" noWrap>
          {params.value || 'N/A'}
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
          <IconButton
            size="small"
            color="primary"
            onClick={() => handleViewDetails(params.row)}
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => handleDelete(params.row.id)}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  // Filter visits based on selected filters
  const filteredVisits = visits.filter(visit => {
    if (filterCompany !== 'all') {
      // Visit.plant can be either an array of IDs or a single ID
      if (visit.plant) {
        const visitPlantValue = Array.isArray(visit.plant) ? visit.plant : [visit.plant];
        const plantMatches = visitPlantValue.includes(filterCompany);
        if (!plantMatches) return false;
      } else {
        return false; // No plant data, filter out
      }
    }
    if (filterSalesman !== 'all' && visit.salesman_name !== filterSalesman) return false;
    return true;
  });

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={600}>
          {t('visits')} {t('dashboard')}
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            startIcon={<LocationIcon />}
            variant="contained"
            color="secondary"
            onClick={migrateLocations}
            disabled={loading || migrating || visits.length === 0}
          >
            {migrating ? t('loading') : t('convertGpsToAddresses')}
          </Button>
          <Button
            startIcon={<DownloadIcon />}
            variant="contained"
            onClick={handleExportToExcel}
            disabled={loading || visits.length === 0 || exporting}
          >
            {exporting ? t('exporting') + '...' : t('exportToExcel')}
          </Button>
          <Button
            startIcon={<RefreshIcon />}
            variant="outlined"
            onClick={loadVisits}
            disabled={loading}
          >
            {t('refresh')}
          </Button>
        </Box>
      </Box>

      {migrationStatus && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {migrationStatus}
        </Alert>
      )}

      {/* Filters */}
      <Box display="flex" gap={2} mb={2}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>{t('filterByCompany')}</InputLabel>
          <Select
            value={filterCompany}
            onChange={(e) => setFilterCompany(e.target.value)}
            label={t('filterByCompany')}
          >
            <MenuItem value="all">{t('allCompanies')}</MenuItem>
            {plants.map(plant => (
              <MenuItem key={plant.id} value={plant.id}>
                {currentLanguage === 'ar' && plant.plant_name_ar ? plant.plant_name_ar : plant.plant_name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>{t('filterBySalesman')}</InputLabel>
          <Select
            value={filterSalesman}
            onChange={(e) => setFilterSalesman(e.target.value)}
            label={t('filterBySalesman')}
          >
            <MenuItem value="all">{t('allSalesmen')}</MenuItem>
            {salesmen.map(salesman => (
              <MenuItem key={salesman.id} value={salesman.name}>
                {currentLanguage === 'ar' && salesman.name_ar ? salesman.name_ar : salesman.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {(filterCompany !== 'all' || filterSalesman !== 'all') && (
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              setFilterCompany('all');
              setFilterSalesman('all');
            }}
          >
            {t('clearFilters')}
          </Button>
        )}
      </Box>

      <Card>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={filteredVisits}
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

      {/* Visit Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight={600}>
            {t('visitDetails')}
          </Typography>
        </DialogTitle>
        <DialogContent>
          {selectedVisit && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('salesman')}
                  </Typography>
                  <Typography variant="body1" fontWeight={500} gutterBottom>
                    {getBilingualDisplay(
                      selectedVisit.salesman_name,
                      selectedVisit.salesman_name_ar,
                      currentLanguage === 'ar'
                    ) || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('customerName')}
                  </Typography>
                  <Typography variant="body1" fontWeight={500} gutterBottom>
                    {getBilingualDisplay(
                      selectedVisit.customer_name,
                      selectedVisit.customer_name_ar,
                      currentLanguage === 'ar'
                    ) || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('contactPerson')}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {getBilingualDisplay(
                      selectedVisit.contact_person,
                      selectedVisit.contact_person_ar,
                      currentLanguage === 'ar'
                    ) || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('phone')}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedVisit.customer_phone || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('meetingType')}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                    {Array.isArray(selectedVisit.meeting_type)
                      ? selectedVisit.meeting_type.map((type: string) => (
                          <Chip key={type} label={type} size="small" />
                        ))
                      : selectedVisit.meeting_type || 'N/A'}
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('orderValue')}
                  </Typography>
                  <Typography variant="body1" fontWeight={600} color="success.main" gutterBottom>
                    {selectedVisit.order_value && selectedVisit.order_value > 0
                      ? `₹${selectedVisit.order_value.toLocaleString()}`
                      : 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('productsDiscussed')}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                    {selectedVisit.products_discussed &&
                    Array.isArray(selectedVisit.products_discussed)
                      ? selectedVisit.products_discussed.map((productId: string) => {
                          const product = products.find((p: any) => p.id === productId);
                          return (
                            <Chip
                              key={productId}
                              label={getBilingualDisplay(
                                product?.name,
                                product?.name_ar,
                                currentLanguage === 'ar'
                              ) || productId}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          );
                        })
                      : 'N/A'}
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('nextAction')}
                  </Typography>
                  {selectedVisit.next_action && Array.isArray(selectedVisit.next_action) ? (
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                      {selectedVisit.next_action.map((action: string, index: number) => (
                        <Chip
                          key={index}
                          label={t(action)}
                          size="small"
                          color="secondary"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body1" gutterBottom>
                      {selectedVisit.next_action ? t(selectedVisit.next_action) : 'N/A'}
                    </Typography>
                  )}
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('nextActionDate')}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedVisit.next_action_date
                      ? format(new Date(selectedVisit.next_action_date), 'MMM dd, yyyy')
                      : 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('potential')}
                  </Typography>
                  <Chip
                    label={selectedVisit.potential ? t(selectedVisit.potential.toLowerCase()) : 'N/A'}
                    size="small"
                    color={
                      selectedVisit.potential === 'High'
                        ? 'error'
                        : selectedVisit.potential === 'Medium'
                        ? 'warning'
                        : 'default'
                    }
                    sx={{ mt: 0.5 }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('competitor')}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedVisit.competitor_name || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('canBeSwitched')}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedVisit.can_be_switched === true
                      ? t('yes')
                      : selectedVisit.can_be_switched === false
                      ? t('no')
                      : 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('location')}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedVisit.location_address || 'N/A'}
                  </Typography>
                  {selectedVisit.location_lat && selectedVisit.location_lng && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      {t('gps')}: {selectedVisit.location_lat.toFixed(4)}, {selectedVisit.location_lng.toFixed(4)}
                    </Typography>
                  )}
                </Grid>
                {selectedVisit.plant && Array.isArray(selectedVisit.plant) && selectedVisit.plant.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">
                      {t('plants')}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                      {selectedVisit.plant.map((plantId: string) => {
                        const plant = plants.find(p => p.id === plantId);
                        return (
                          <Chip
                            key={plantId}
                            label={plant ? `${plant.plant_name} (${plant.plant_code})` : plantId}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        );
                      })}
                    </Box>
                  </Grid>
                )}
                {selectedVisit.visit_image && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      {t('visitPhoto')}
                    </Typography>
                    {!showImage ? (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => setShowImage(true)}
                        sx={{ mt: 1 }}
                      >
                        {t('loadPhoto')}
                      </Button>
                    ) : (
                      <Box>
                        <Box
                          component="img"
                          src={selectedVisit.visit_image}
                          alt={t('visitLocation')}
                          loading="lazy"
                          sx={{
                            maxWidth: '100%',
                            maxHeight: '200px',
                            width: 'auto',
                            height: 'auto',
                            borderRadius: 2,
                            border: '1px solid #e0e0e0',
                            mt: 1,
                            objectFit: 'contain',
                            cursor: 'pointer',
                          }}
                          onClick={() => window.open(selectedVisit.visit_image, '_blank')}
                        />
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                          {t('clickImageToViewFullSize')}
                        </Typography>
                      </Box>
                    )}
                  </Grid>
                )}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('remarks')}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {getBilingualDisplay(
                      selectedVisit.remarks,
                      selectedVisit.remarks_ar,
                      currentLanguage === 'ar'
                    ) || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('status')}
                  </Typography>
                  <Chip
                    label={t(selectedVisit.status)}
                    size="small"
                    color={
                      selectedVisit.status === 'completed'
                        ? 'success'
                        : selectedVisit.status === 'pending'
                        ? 'warning'
                        : 'error'
                    }
                    sx={{ mt: 0.5, textTransform: 'capitalize' }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('visitDate')}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {format(new Date(selectedVisit.created_at), 'MMM dd, yyyy HH:mm')}
                  </Typography>
                </Grid>
                {selectedVisit.time_in && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      {t('timeIn')}
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {format(new Date(selectedVisit.time_in), 'MMM dd, yyyy HH:mm')}
                    </Typography>
                  </Grid>
                )}
                {selectedVisit.time_out && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      {t('timeOut')}
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {format(new Date(selectedVisit.time_out), 'MMM dd, yyyy HH:mm')}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetails}>{t('close')}</Button>
        </DialogActions>
      </Dialog>

      {/* Clients Dialog */}
      <Dialog 
        open={clientsDialogOpen} 
        onClose={() => setClientsDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          {t('clientsVisitedBy')} {selectedSalesmanName}
        </DialogTitle>
        <DialogContent>
          {selectedSalesmanClients.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" py={3}>
              {t('noClientsFound')}
            </Typography>
          ) : (
            <List>
              {selectedSalesmanClients.map((client, index) => (
                <ListItem key={index} divider>
                  <ListItemText
                    primary={
                      <Typography variant="body1" fontWeight={500}>
                        {client.name}
                      </Typography>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {t('phone')}: {client.phone || 'N/A'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t('lastVisit')}: {format(new Date(client.lastVisit), 'MMM dd, yyyy HH:mm')}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClientsDialogOpen(false)}>{t('close')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

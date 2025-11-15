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
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { visitService } from '../../services/supabase';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

export default function VisitsManagement() {
  const [visits, setVisits] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState('');
  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
  loadVisits();
  loadProducts();
  }, []);

  const loadVisits = async () => {
    setLoading(true);
    try {
      const data = await visitService.getVisits();
      setVisits(data);
    } catch (error) {
      console.error('Error loading visits:', error);
    }
    setLoading(false);
  };

  const loadProducts = async () => {
    try {
      const { productService } = await import('../../services/supabase');
      const data = await productService.getProducts();
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const migrateLocations = async () => {
    if (!window.confirm('This will convert all GPS coordinates to actual addresses. This may take a few minutes. Continue?')) {
      return;
    }

    setMigrating(true);
    setMigrationStatus('Starting migration...');

    try {
      const visitsToMigrate = visits.filter((visit) => {
        // Check if location_address looks like coordinates (contains comma and numbers)
        const addr = visit.location_address || '';
        return addr.match(/^[-\d.]+,\s*[-\d.]+$/) && visit.location_lat && visit.location_lng;
      });

      setMigrationStatus(`Found ${visitsToMigrate.length} visits to migrate...`);

      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < visitsToMigrate.length; i++) {
        const visit = visitsToMigrate[i];
        setMigrationStatus(`Processing ${i + 1} of ${visitsToMigrate.length}...`);

        try {
          // Reverse geocode
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${visit.location_lat}&lon=${visit.location_lng}&zoom=18&addressdetails=1`,
            {
              headers: {
                'User-Agent': 'Hylite FSM App'
              }
            }
          );
          const data = await response.json();
          
          if (data && data.display_name) {
            // Update visit in database
            const { visitService } = await import('../../services/supabase');
            await visitService.updateVisit(visit.id, {
              location_address: data.display_name
            });
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

      setMigrationStatus(`Migration complete! Success: ${successCount}, Failed: ${failCount}`);
      
      // Reload visits to show updated addresses
      setTimeout(() => {
        loadVisits();
        setMigrationStatus('');
        setMigrating(false);
      }, 3000);
    } catch (error) {
      console.error('Migration error:', error);
      setMigrationStatus('Migration failed. Please try again.');
      setMigrating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this visit?')) {
      try {
        await visitService.deleteVisit(id);
        loadVisits();
      } catch (error) {
        console.error('Error deleting visit:', error);
      }
    }
  };

  const handleViewDetails = (visit: any) => {
    setSelectedVisit(visit);
    setDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedVisit(null);
  };

  const handleExportToExcel = () => {
    // Build product ID to name map
    const productMap: Record<string, string> = {};
    products.forEach((p: any) => {
      productMap[p.id] = p.name;
    });

    // Prepare data for Excel
    const exportData = visits.map((visit) => {
      // Map product IDs to names
      let productNames = '';
      if (Array.isArray(visit.products_discussed)) {
        productNames = visit.products_discussed.map((pid: string) => productMap[pid] || pid).join(', ');
      } else if (Array.isArray(visit.products)) {
        productNames = visit.products.map((vp: any) => productMap[vp.product_id] || vp.product_id).join(', ');
      } else {
        productNames = visit.products_discussed || '';
      }
      return {
        'Salesman': visit.salesman_name || 'N/A',
        'Customer Name': visit.customer_name || '',
        'Contact Person': visit.contact_person || '',
        'Phone': visit.customer_phone || '',
        'Meeting Type': Array.isArray(visit.meeting_type) ? visit.meeting_type.join(', ') : visit.meeting_type || '',
        'Products Discussed': productNames,
        'Next Action': visit.next_action || '',
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

    // Save file
    XLSX.writeFile(wb, fileName);
  };

  const columns: GridColDef[] = [
    {
      field: 'salesman_name',
      headerName: 'Salesman',
      width: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" fontWeight={500}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'customer_name',
      headerName: 'Customer',
      width: 150,
    },
    {
      field: 'customer_phone',
      headerName: 'Phone',
      width: 130,
    },
    {
      field: 'visit_type',
      headerName: 'Type',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value}
          size="small"
          color={
            params.value === 'new'
              ? 'success'
              : params.value === 'followup'
              ? 'info'
              : 'warning'
          }
          sx={{ textTransform: 'capitalize' }}
        />
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value}
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
      headerName: 'Date',
      width: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2">
          {format(new Date(params.value), 'MMM dd, yyyy HH:mm')}
        </Typography>
      ),
    },
    {
      field: 'location_address',
      headerName: 'Location',
      width: 200,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" noWrap>
          {params.value || 'N/A'}
        </Typography>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
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

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={600}>
          Visits Management
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            startIcon={<LocationIcon />}
            variant="contained"
            color="secondary"
            onClick={migrateLocations}
            disabled={loading || migrating || visits.length === 0}
          >
            {migrating ? 'Migrating...' : 'Convert GPS to Addresses'}
          </Button>
          <Button
            startIcon={<DownloadIcon />}
            variant="contained"
            onClick={handleExportToExcel}
            disabled={loading || visits.length === 0}
          >
            Export to Excel
          </Button>
          <Button
            startIcon={<RefreshIcon />}
            variant="outlined"
            onClick={loadVisits}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {migrationStatus && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {migrationStatus}
        </Alert>
      )}

      <Card>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={visits}
              columns={columns}
              loading={loading}
              pageSizeOptions={[10, 25, 50]}
              initialState={{
                pagination: { paginationModel: { pageSize: 10 } },
              }}
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
            Visit Details
          </Typography>
        </DialogTitle>
        <DialogContent>
          {selectedVisit && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Salesman
                  </Typography>
                  <Typography variant="body1" fontWeight={500} gutterBottom>
                    {selectedVisit.salesman_name || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Customer Name
                  </Typography>
                  <Typography variant="body1" fontWeight={500} gutterBottom>
                    {selectedVisit.customer_name || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Contact Person
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedVisit.contact_person || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Phone
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
                    Meeting Type
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
                    Products Discussed
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                    {selectedVisit.products_discussed &&
                    Array.isArray(selectedVisit.products_discussed)
                      ? selectedVisit.products_discussed.map((productId: string) => {
                          const product = products.find((p: any) => p.id === productId);
                          return (
                            <Chip
                              key={productId}
                              label={product?.name || productId}
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
                    Next Action
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedVisit.next_action || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Next Action Date
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedVisit.next_action_date
                      ? format(new Date(selectedVisit.next_action_date), 'MMM dd, yyyy')
                      : 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Potential
                  </Typography>
                  <Chip
                    label={selectedVisit.potential || 'N/A'}
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
                    Competitor
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedVisit.competitor_name || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Can Be Switched
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedVisit.can_be_switched === true
                      ? 'Yes'
                      : selectedVisit.can_be_switched === false
                      ? 'No'
                      : 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Location
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedVisit.location_address || 'N/A'}
                  </Typography>
                  {selectedVisit.location_lat && selectedVisit.location_lng && (
                    <Typography variant="caption" color="text.secondary">
                      GPS: {selectedVisit.location_lat.toFixed(4)},{' '}
                      {selectedVisit.location_lng.toFixed(4)}
                    </Typography>
                  )}
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Remarks
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedVisit.remarks || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Status
                  </Typography>
                  <Chip
                    label={selectedVisit.status}
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
                    Visit Date
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {format(new Date(selectedVisit.created_at), 'MMM dd, yyyy HH:mm')}
                  </Typography>
                </Grid>
                {selectedVisit.time_in && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Time In
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {format(new Date(selectedVisit.time_in), 'MMM dd, yyyy HH:mm')}
                    </Typography>
                  </Grid>
                )}
                {selectedVisit.time_out && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Time Out
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {format(new Date(selectedVisit.time_out), 'MMM dd, yyyy HH:mm')}
                    </Typography>
                  </Grid>
                )}
                {selectedVisit.visit_image && (
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Visit Photo
                    </Typography>
                    <Box
                      component="img"
                      src={selectedVisit.visit_image}
                      alt="Visit location"
                      sx={{
                        maxWidth: '100%',
                        maxHeight: '400px',
                        borderRadius: 2,
                        border: '1px solid #e0e0e0',
                        mt: 1,
                      }}
                    />
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetails}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

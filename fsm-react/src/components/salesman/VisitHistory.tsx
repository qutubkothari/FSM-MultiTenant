import { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  CircularProgress,
  IconButton,
  Button,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Grid,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  LocationOn as LocationIcon,
  MoreVert as MoreVertIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';
import { visitService, supabase } from '../../services/supabase';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { getBilingualDisplay } from '../../utils/arabicUtils';
import { plantService, Plant } from '../../services/plantService';
import { useTenantStore } from '../../store/tenantStore';
import { syncManager } from '../../services/syncManager';

export default function VisitHistory() {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const { tenant } = useTenantStore();
  const [visits, setVisits] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 10;

  useEffect(() => {
    loadVisits(true);
    loadProducts();
    
    // Listen for sync completion to refresh visits
    const unsubscribe = syncManager.onSyncComplete((result) => {
      if (result.success > 0) {
        console.log('✅ Sync completed, refreshing visit history...');
        loadVisits(true);
      }
    });
    
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (tenant?.id) {
      loadPlants();
    }
  }, [tenant?.id]);

  const loadPlants = async () => {
    try {
      if (!tenant?.id) {
        console.log('VisitHistory: No tenant ID available');
        return;
      }
      console.log('VisitHistory: Loading plants for tenant:', tenant.id);
      const data = await plantService.getPlants(tenant.id);
      console.log('VisitHistory: Loaded plants:', data);
      setPlants(data);
    } catch (error) {
      console.error('Error loading plants:', error);
    }
  };

  const loadVisits = async (reset = false) => {
    if (!user) {
      console.log('VisitHistory: No user available');
      setLoading(false);
      return;
    }
    
    if (reset) setLoading(true);

    try {
      // Auto-load tenant if missing
      if (!tenant && user.tenant_id) {
        console.log('VisitHistory: Auto-loading tenant for user');
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', user.tenant_id)
          .single();
        
        if (tenantData) {
          useTenantStore.getState().setTenant({
            id: tenantData.id,
            name: tenantData.name,
            slug: tenantData.slug,
            companyName: tenantData.company_name,
            logoUrl: tenantData.logo_url,
            primaryColor: tenantData.primary_color || '#1976d2',
            secondaryColor: tenantData.secondary_color || '#dc004e',
            isActive: tenantData.is_active,
            defaultLanguage: tenantData.default_language || 'en',
            translationEnabled: tenantData.translation_enabled || false,
            currencyCode: tenantData.currency_code || 'USD',
            currencySymbol: tenantData.currency_symbol || '$',
          });
        }
      }
      
      const currentPage = reset ? 0 : page;
      console.log(`VisitHistory: Loading visits page ${currentPage}`);
      
      const data = await visitService.getVisits(undefined, user.phone, PAGE_SIZE, currentPage);
      console.log('VisitHistory: Loaded visits:', data?.length || 0);
      
      if (reset) {
        setVisits(data || []);
        setPage(1);
        setHasMore((data?.length || 0) >= PAGE_SIZE);
      } else {
        setVisits(prev => [...prev, ...(data || [])]);
        setPage(prev => prev + 1);
        if (!data || data.length < PAGE_SIZE) {
          setHasMore(false);
        }
      }
    } catch (error) {
      console.error('Error loading visits:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      if (!tenant?.id) return;
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('tenant_id', tenant.id);
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, visit: any) => {
    setAnchorEl(event.currentTarget);
    setSelectedVisit(visit);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedVisit(null);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedVisit) return;
    
    try {
      await visitService.updateVisit(selectedVisit.id, { status: newStatus });
      // Update local state
      setVisits(visits.map(v => 
        v.id === selectedVisit.id ? { ...v, status: newStatus } : v
      ));
      handleMenuClose();
    } catch (error) {
      console.error('Error updating visit status:', error);
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={600}>
          {t('visitHistory')}
        </Typography>
        <IconButton onClick={() => loadVisits(true)} disabled={loading}>
          <RefreshIcon />
        </IconButton>
      </Box>

      {visits.length === 0 ? (
        <Card>
          <CardContent>
            <Typography variant="body1" color="text.secondary" textAlign="center">
              {t('noVisitsYet')}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box display="flex" flexDirection="column" gap={2}>
          {visits.map((visit) => (
            <Card key={visit.id}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
                  <Typography variant="h6" fontWeight={600}>
                    {getBilingualDisplay(visit.customer_name, visit.customer_name_ar, i18n.language === 'ar')}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Chip
                      label={visit.status}
                      size="small"
                      color={
                        visit.status === 'completed'
                          ? 'success'
                          : visit.status === 'pending'
                          ? 'warning'
                          : 'error'
                      }
                      sx={{ textTransform: 'capitalize' }}
                    />
                    <IconButton 
                      size="small" 
                      onClick={() => handleViewDetails(visit)}
                      color="primary"
                    >
                      <VisibilityIcon />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      onClick={(e) => handleMenuOpen(e, visit)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Box>
                </Box>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  📱 {visit.customer_phone}
                </Typography>

                {visit.customer_address && (
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    📍 {visit.customer_address}
                  </Typography>
                )}

                <Box display="flex" gap={1} mt={1} mb={1} flexWrap="wrap">
                  <Chip
                    label={t(visit.visit_type)}
                    size="small"
                    sx={{ textTransform: 'capitalize' }}
                  />
                  {visit.order_value > 0 && (
                    <Chip
                      label={`${t('order')}: ${tenant?.currencySymbol || '$'}${visit.order_value.toLocaleString()}`}
                      size="small"
                      color="success"
                      sx={{ fontWeight: 600 }}
                    />
                  )}
                  {visit.location_address && (
                    <Chip
                      icon={<LocationIcon />}
                      label={visit.location_address}
                      size="small"
                      color="info"
                      sx={{ maxWidth: '100%' }}
                    />
                  )}
                </Box>

                {visit.notes && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    <strong>{t('notes')}:</strong> {visit.notes}
                  </Typography>
                )}

                <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                  {format(new Date(visit.created_at), 'MMM dd, yyyy hh:mm a')}
                </Typography>

                {/* Quick Action Buttons for Pending Visits */}
                {visit.status === 'pending' && (
                  <Box display="flex" gap={1} mt={2}>
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      startIcon={<CheckCircleIcon />}
                      onClick={() => {
                        setSelectedVisit(visit);
                        handleStatusChange('completed');
                      }}
                      fullWidth
                    >
                      {t('markCompleted')}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<CancelIcon />}
                      onClick={() => {
                        setSelectedVisit(visit);
                        handleStatusChange('cancelled');
                      }}
                      fullWidth
                    >
                      {t('cancel')}
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Load More Button */}
      {hasMore && visits.length > 0 && (
        <Box display="flex" justifyContent="center" mt={2} mb={2}>
          <Button 
            variant="outlined" 
            onClick={() => loadVisits(false)}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : t('loadMore')}
          </Button>
        </Box>
      )}

      {/* Status Change Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleStatusChange('pending')}>
          {t('markAsPending')}
        </MenuItem>
        <MenuItem onClick={() => handleStatusChange('completed')}>
          {t('markAsCompleted')}
        </MenuItem>
        <MenuItem onClick={() => handleStatusChange('cancelled')}>
          {t('markAsCancelled')}
        </MenuItem>
      </Menu>

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
                    {t('customerName')}
                  </Typography>
                  <Typography variant="body1" fontWeight={500} gutterBottom>
                    {getBilingualDisplay(
                      selectedVisit.customer_name,
                      selectedVisit.customer_name_ar,
                      i18n.language === 'ar'
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
                      i18n.language === 'ar'
                    ) || 'N/A'}
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
                          <Chip key={type} label={t(type)} size="small" />
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
                      ? `${tenant?.currencySymbol || '$'}${selectedVisit.order_value.toLocaleString()}`
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
                                i18n.language === 'ar'
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
                    label={t(selectedVisit.potential?.toLowerCase()) || 'N/A'}
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
                    <Typography variant="caption" color="text.secondary">
                      {t('gps')}: {selectedVisit.location_lat.toFixed(4)},{' '}
                      {selectedVisit.location_lng.toFixed(4)}
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
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('remarks')}
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
                    {t('date')}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {format(new Date(selectedVisit.created_at), 'MMM dd, yyyy HH:mm')}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetails}>
            {t('close')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

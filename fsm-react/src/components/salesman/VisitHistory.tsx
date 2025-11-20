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

export default function VisitHistory() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [visits, setVisits] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    loadVisits();
    loadProducts();
  }, [user]);

  const loadVisits = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await visitService.getVisits(undefined, user.phone);
      setVisits(data);
    } catch (error) {
      console.error('Error loading visits:', error);
    }
    setLoading(false);
  };

  const loadProducts = async () => {
    try {
      const { data } = await supabase.from('products').select('*');
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
        <IconButton onClick={loadVisits} disabled={loading}>
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
                    {visit.customer_name}
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
                    {selectedVisit.customer_name || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('contactPerson')}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedVisit.contact_person || 'N/A'}
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
                    {t('nextAction')}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedVisit.next_action ? t(selectedVisit.next_action) : 'N/A'}
                  </Typography>
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
                      GPS: {selectedVisit.location_lat.toFixed(4)},{' '}
                      {selectedVisit.location_lng.toFixed(4)}
                    </Typography>
                  )}
                </Grid>
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

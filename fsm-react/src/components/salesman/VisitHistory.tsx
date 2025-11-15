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
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  LocationOn as LocationIcon,
  MoreVert as MoreVertIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';
import { visitService } from '../../services/supabase';
import { format } from 'date-fns';

export default function VisitHistory() {
  const { user } = useAuthStore();
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedVisit, setSelectedVisit] = useState<any>(null);

  useEffect(() => {
    loadVisits();
  }, [user]);

  const loadVisits = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await visitService.getVisits(user.id);
      setVisits(data);
    } catch (error) {
      console.error('Error loading visits:', error);
    }
    setLoading(false);
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
          Visit History
        </Typography>
        <IconButton onClick={loadVisits} disabled={loading}>
          <RefreshIcon />
        </IconButton>
      </Box>

      {visits.length === 0 ? (
        <Card>
          <CardContent>
            <Typography variant="body1" color="text.secondary" textAlign="center">
              No visits yet. Create your first visit!
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

                <Box display="flex" gap={1} mt={1} mb={1}>
                  <Chip
                    label={visit.visit_type}
                    size="small"
                    sx={{ textTransform: 'capitalize' }}
                  />
                  {visit.location_lat && (
                    <Chip
                      icon={<LocationIcon />}
                      label="GPS"
                      size="small"
                      color="info"
                    />
                  )}
                </Box>

                {visit.notes && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    <strong>Notes:</strong> {visit.notes}
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
                      Mark Completed
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
                      Cancel
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
          Mark as Pending
        </MenuItem>
        <MenuItem onClick={() => handleStatusChange('completed')}>
          Mark as Completed
        </MenuItem>
        <MenuItem onClick={() => handleStatusChange('cancelled')}>
          Mark as Cancelled
        </MenuItem>
      </Menu>
    </Box>
  );
}

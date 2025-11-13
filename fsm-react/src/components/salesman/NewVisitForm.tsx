import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Chip,
  Paper,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  Send as SendIcon,
  Lightbulb as LightbulbIcon,
  TrendingUp as TrendingUpIcon,
  ShoppingCart as ShoppingCartIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';
import { visitService } from '../../services/supabase';
import { aiService } from '../../services/ai.service';

interface Props {
  onSuccess: () => void;
}

export default function NewVisitForm({ onSuccess }: Props) {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_address: '',
    visit_type: 'new',
    notes: '',
    location_lat: null as number | null,
    location_lng: null as number | null,
    location_address: '',
  });

  const getLocation = () => {
    setGettingLocation(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            location_lat: position.coords.latitude,
            location_lng: position.coords.longitude,
            location_address: `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`,
          });
          setGettingLocation(false);
        },
        () => {
          setError('Unable to get location. Please enable GPS.');
          setGettingLocation(false);
        }
      );
    } else {
      setError('Geolocation is not supported by your device.');
      setGettingLocation(false);
    }
  };

  useEffect(() => {
    getLocation();
  }, []);

  // AI Intelligence: Load insights when customer name is entered
  useEffect(() => {
    const loadAIInsights = async () => {
      if (formData.customer_name.length < 3) {
        setAiInsights(null);
        return;
      }

      setLoadingInsights(true);
      try {
        // Get all visits for this salesman
        const allVisits = await visitService.getVisits(user?.id);
        
        // Filter visits for this customer
        const customerVisits = allVisits.filter((v: any) => 
          v.customer_name.toLowerCase().includes(formData.customer_name.toLowerCase())
        );

        if (customerVisits.length > 0) {
          // Get AI recommendations for this customer
          const productRecommendations = await aiService.getProductRecommendations(
            formData.customer_name,
            customerVisits
          );

          // Calculate visit stats
          const lastVisit = customerVisits[0];
          const daysSinceLastVisit = Math.floor(
            (Date.now() - new Date(lastVisit.created_at).getTime()) / (1000 * 60 * 60 * 24)
          );

          setAiInsights({
            isExistingCustomer: true,
            totalVisits: customerVisits.length,
            lastVisitDate: new Date(lastVisit.created_at).toLocaleDateString(),
            daysSinceLastVisit,
            productRecommendations,
            visitHistory: customerVisits.slice(0, 3),
            suggestion: daysSinceLastVisit > 7 
              ? 'This customer hasn\'t been visited in a while. Consider a follow-up!' 
              : 'Recent customer - good timing for a follow-up visit.',
          });

          // Auto-fill customer info if found
          if (customerVisits.length > 0 && !formData.customer_phone) {
            setFormData(prev => ({
              ...prev,
              customer_phone: lastVisit.customer_phone || '',
              customer_address: lastVisit.customer_address || '',
              visit_type: 'followup',
            }));
          }
        } else {
          setAiInsights({
            isExistingCustomer: false,
            suggestion: 'New customer! Make a great first impression.',
            productRecommendations: ['Product A', 'Product B', 'Product C'],
          });
        }
      } catch (error) {
        console.error('Failed to load AI insights:', error);
      } finally {
        setLoadingInsights(false);
      }
    };

    const debounceTimer = setTimeout(loadAIInsights, 500);
    return () => clearTimeout(debounceTimer);
  }, [formData.customer_name, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.customer_name || !formData.customer_phone) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await visitService.createVisit({
        salesman_id: user?.id,
        salesman_name: user?.name,
        ...formData,
        status: 'pending',
      });
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to create visit');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="50vh"
        p={3}
      >
        <Alert severity="success" sx={{ fontSize: '1.1rem' }}>
          Visit created successfully! 🎉
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Create New Visit
          </Typography>

          {formData.location_lat && (
            <Chip
              icon={<LocationIcon />}
              label={`Location: ${formData.location_address}`}
              color="success"
              sx={{ mb: 2 }}
            />
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Customer Name *"
              value={formData.customer_name}
              onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              margin="normal"
              helperText={loadingInsights ? 'Loading AI insights...' : 'Start typing to get AI-powered suggestions'}
            />

            {/* AI Insights Panel */}
            {aiInsights && (
              <Paper 
                elevation={3} 
                sx={{ 
                  p: 2, 
                  mt: 2, 
                  bgcolor: aiInsights.isExistingCustomer ? '#e3f2fd' : '#fff3e0',
                  border: '2px solid',
                  borderColor: aiInsights.isExistingCustomer ? '#2196f3' : '#ff9800',
                }}
              >
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <LightbulbIcon color={aiInsights.isExistingCustomer ? 'primary' : 'warning'} />
                  <Typography variant="h6" fontWeight={600}>
                    🤖 AI Insights
                  </Typography>
                </Box>

                <Alert 
                  severity={aiInsights.isExistingCustomer ? 'info' : 'warning'} 
                  sx={{ mb: 2 }}
                >
                  {aiInsights.suggestion}
                </Alert>

                {aiInsights.isExistingCustomer && (
                  <Box mb={2}>
                    <Typography variant="subtitle2" gutterBottom>
                      <TrendingUpIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                      Customer History:
                    </Typography>
                    <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
                      <Chip label={`${aiInsights.totalVisits} visits`} size="small" color="primary" />
                      <Chip label={`Last visit: ${aiInsights.lastVisitDate}`} size="small" />
                      <Chip 
                        label={`${aiInsights.daysSinceLastVisit} days ago`} 
                        size="small" 
                        color={aiInsights.daysSinceLastVisit > 7 ? 'error' : 'success'}
                      />
                    </Box>
                  </Box>
                )}

                {aiInsights.productRecommendations && aiInsights.productRecommendations.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      <ShoppingCartIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                      Recommended Products:
                    </Typography>
                    <Box display="flex" gap={1} flexWrap="wrap">
                      {aiInsights.productRecommendations.map((product: string) => (
                        <Chip 
                          key={product} 
                          label={product} 
                          size="small" 
                          color="success"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Box>
                )}

                {aiInsights.visitHistory && aiInsights.visitHistory.length > 0 && (
                  <Box mt={2}>
                    <Typography variant="subtitle2" gutterBottom>
                      Recent Visit Notes:
                    </Typography>
                    <List dense>
                      {aiInsights.visitHistory.map((visit: any, idx: number) => (
                        <ListItem key={idx} sx={{ pl: 0 }}>
                          <ListItemText
                            primary={new Date(visit.created_at).toLocaleDateString()}
                            secondary={visit.notes || 'No notes'}
                            primaryTypographyProps={{ variant: 'caption', fontWeight: 600 }}
                            secondaryTypographyProps={{ variant: 'caption' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </Paper>
            )}

            <TextField
              fullWidth
              label="Customer Phone *"
              value={formData.customer_phone}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  customer_phone: e.target.value.replace(/\D/g, '').slice(0, 10),
                })
              }
              margin="normal"
              inputProps={{ maxLength: 10 }}
            />

            <TextField
              fullWidth
              label="Customer Address"
              value={formData.customer_address}
              onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
              margin="normal"
              multiline
              rows={2}
            />

            <FormControl fullWidth margin="normal">
              <InputLabel>Visit Type</InputLabel>
              <Select
                value={formData.visit_type}
                onChange={(e) => setFormData({ ...formData, visit_type: e.target.value })}
                label="Visit Type"
              >
                <MenuItem value="new">New Customer</MenuItem>
                <MenuItem value="followup">Follow-up</MenuItem>
                <MenuItem value="delivery">Delivery</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              margin="normal"
              multiline
              rows={3}
              placeholder="Add any additional notes here..."
            />

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}

            <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={gettingLocation ? <CircularProgress size={20} /> : <LocationIcon />}
                onClick={getLocation}
                disabled={gettingLocation || loading}
              >
                {gettingLocation ? 'Getting...' : 'Get Location'}
              </Button>
              <Button
                fullWidth
                type="submit"
                variant="contained"
                endIcon={<SendIcon />}
                disabled={loading || !formData.location_lat}
              >
                {loading ? 'Creating...' : 'Create Visit'}
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}

import { useState, useEffect, useRef } from 'react';
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
  FormLabel,
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  Send as SendIcon,
  Lightbulb as LightbulbIcon,
  TrendingUp as TrendingUpIcon,
  ShoppingCart as ShoppingCartIcon,
  CameraAlt as CameraIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';
import { visitService, productService } from '../../services/supabase';
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
  const [products, setProducts] = useState<any[]>([]);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    customer_name: '',
    contact_person: '',
    meeting_type: [] as string[],
    products_discussed: [] as string[],
    next_action: '',
    next_action_date: '',
    potential: 'Medium' as 'High' | 'Medium' | 'Low',
    competitor_name: '',
    can_be_switched: null as boolean | null,
    remarks: '',
    location_lat: null as number | null,
    location_lng: null as number | null,
    location_address: '',
    time_in: new Date().toISOString(),
    visit_image: null as string | null,
  });

  const meetingTypes = [
    'Introduction',
    'Enquiry',
    'Order',
    'Payment',
    'Follow-up',
  ];

  const nextActionOptions = [
    'Meeting',
    'Send Sample',
    'Visit Again with Management',
    'Invite to Factory',
  ];

  useEffect(() => {
    getLocation();
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await productService.getProducts();
      setProducts(data);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  const getLocation = () => {
    setGettingLocation(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          // Use reverse geocoding to get address
          let address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`; // fallback to coordinates
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
              {
                headers: {
                  'User-Agent': 'Hylite FSM App'
                }
              }
            );
            const data = await response.json();
            if (data && data.display_name) {
              address = data.display_name;
            }
          } catch (error) {
            console.error('Reverse geocoding failed:', error);
            // Keep fallback address
          }
          
          setFormData(prev => ({
            ...prev,
            location_lat: lat,
            location_lng: lng,
            location_address: address,
          }));
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

  // AI Intelligence: Load insights when customer name is entered
  useEffect(() => {
    const loadAIInsights = async () => {
      if (formData.customer_name.length < 3) {
        setAiInsights(null);
        return;
      }

      setLoadingInsights(true);
      try {
        const allVisits = await visitService.getVisits(user?.id);
        const customerVisits = allVisits.filter((v: any) => 
          v.customer_name.toLowerCase().includes(formData.customer_name.toLowerCase())
        );

        if (customerVisits.length > 0) {
          const productRecommendations = await aiService.getProductRecommendations(
            formData.customer_name,
            customerVisits
          );

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
          if (!formData.contact_person && lastVisit.contact_person) {
            setFormData(prev => ({
              ...prev,
              contact_person: lastVisit.contact_person || '',
            }));
          }
        } else {
          setAiInsights({
            isExistingCustomer: false,
            suggestion: 'New customer! Make a great first impression.',
            productRecommendations: products.slice(0, 3).map(p => p.name),
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
  }, [formData.customer_name, user, products]);

  const handleMeetingTypeChange = (type: string) => {
    setFormData(prev => ({
      ...prev,
      meeting_type: prev.meeting_type.includes(type)
        ? prev.meeting_type.filter(t => t !== type)
        : [...prev.meeting_type, type],
    }));
  };

  const handleProductChange = (productId: string) => {
    setFormData(prev => ({
      ...prev,
      products_discussed: prev.products_discussed.includes(productId)
        ? prev.products_discussed.filter(p => p !== productId)
        : [...prev.products_discussed, productId],
    }));
  };

  const handleCaptureImage = () => {
    fileInputRef.current?.click();
  };

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event: any) => {
        const base64String = event.target.result;
        setCapturedImage(base64String);
        setFormData(prev => ({
          ...prev,
          visit_image: base64String,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setCapturedImage(null);
    setFormData(prev => ({
      ...prev,
      visit_image: null,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.customer_name || formData.meeting_type.length === 0) {
      setError('Please fill in customer name and select at least one meeting type');
      return;
    }

    if (!formData.visit_image) {
      setError('Please capture a photo of the location/office');
      return;
    }

    setLoading(true);
    try {
      // Clean up the data - convert empty strings to null for date fields
      const visitData = {
        salesman_id: user?.id,
        salesman_name: user?.name,
        ...formData,
        next_action_date: formData.next_action_date || null, // Convert empty string to null
        time_out: new Date().toISOString(),
        status: 'completed',
      };

      await visitService.createVisit(visitData);
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: any) {
      console.error('error adding visit', err);
      setError(err.message || 'Failed to create visit');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh" p={3}>
        <Alert severity="success" sx={{ fontSize: '1.1rem' }}>
          Visit created successfully! 🎉
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, pb: 10 }}>
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            📝 New Visit
          </Typography>

          {formData.location_lat && (
            <Chip
              icon={<LocationIcon />}
              label={`Location: ${formData.location_address}`}
              color="success"
              size="small"
              sx={{ mb: 2 }}
            />
          )}

          <form onSubmit={handleSubmit}>
            {/* Hidden file input for camera */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={handleImageCapture}
            />

            {/* Customer Name */}
            <TextField
              fullWidth
              label="Customer Name *"
              value={formData.customer_name}
              onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              margin="normal"
              helperText={loadingInsights ? 'Loading AI insights...' : 'Type to auto-fill from previous visits'}
            />

            {/* AI Insights Panel */}
            {aiInsights && (
              <Paper 
                elevation={3} 
                sx={{ 
                  p: 2, 
                  mt: 2, 
                  mb: 2,
                  bgcolor: aiInsights.isExistingCustomer ? '#e3f2fd' : '#fff3e0',
                  border: '2px solid',
                  borderColor: aiInsights.isExistingCustomer ? '#2196f3' : '#ff9800',
                }}
              >
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <LightbulbIcon color={aiInsights.isExistingCustomer ? 'primary' : 'warning'} />
                  <Typography variant="subtitle1" fontWeight={600}>
                    🤖 AI Insights
                  </Typography>
                </Box>

                <Alert severity={aiInsights.isExistingCustomer ? 'info' : 'warning'} sx={{ mb: 1 }}>
                  {aiInsights.suggestion}
                </Alert>

                {aiInsights.isExistingCustomer && (
                  <Box mb={1}>
                    <Typography variant="body2" gutterBottom>
                      <TrendingUpIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                      <strong>History:</strong> {aiInsights.totalVisits} visits | Last: {aiInsights.lastVisitDate} ({aiInsights.daysSinceLastVisit} days ago)
                    </Typography>
                  </Box>
                )}

                {aiInsights.productRecommendations && aiInsights.productRecommendations.length > 0 && (
                  <Box>
                    <Typography variant="body2" gutterBottom>
                      <ShoppingCartIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                      <strong>Suggested Products:</strong>
                    </Typography>
                    <Box display="flex" gap={0.5} flexWrap="wrap">
                      {aiInsights.productRecommendations.map((product: string) => (
                        <Chip key={product} label={product} size="small" color="success" variant="outlined" />
                      ))}
                    </Box>
                  </Box>
                )}
              </Paper>
            )}

            {/* Contact Person */}
            <TextField
              fullWidth
              label="Contact Person"
              value={formData.contact_person}
              onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
              margin="normal"
            />

            {/* Meeting Type */}
            <FormControl component="fieldset" margin="normal" fullWidth>
              <FormLabel component="legend" sx={{ mb: 1 }}>Type of Meeting * (Select all that apply)</FormLabel>
              <Box 
                sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: 1,
                }}
              >
                {meetingTypes.map((type) => (
                  <Chip
                    key={type}
                    label={type}
                    onClick={() => handleMeetingTypeChange(type)}
                    color={formData.meeting_type.includes(type) ? 'primary' : 'default'}
                    variant={formData.meeting_type.includes(type) ? 'filled' : 'outlined'}
                    sx={{ 
                      height: 'auto',
                      py: 1,
                      '& .MuiChip-label': { 
                        whiteSpace: 'normal',
                        textAlign: 'center',
                      },
                    }}
                  />
                ))}
              </Box>
            </FormControl>

            {/* Products Discussed */}
            <FormControl component="fieldset" margin="normal" fullWidth>
              <FormLabel component="legend" sx={{ mb: 1 }}>Products Discussed (Select all discussed)</FormLabel>
              <Box 
                sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: 1,
                }}
              >
                {products.map((product) => (
                  <Chip
                    key={product.id}
                    label={product.name}
                    onClick={() => handleProductChange(product.id)}
                    color={formData.products_discussed.includes(product.id) ? 'success' : 'default'}
                    variant={formData.products_discussed.includes(product.id) ? 'filled' : 'outlined'}
                    sx={{ 
                      height: 'auto',
                      py: 1,
                      '& .MuiChip-label': { 
                        whiteSpace: 'normal',
                        textAlign: 'center',
                      },
                    }}
                  />
                ))}
              </Box>
            </FormControl>

            {/* Next Action */}
            <FormControl fullWidth margin="normal">
              <InputLabel>Next Action</InputLabel>
              <Select
                value={formData.next_action}
                onChange={(e) => setFormData({ ...formData, next_action: e.target.value })}
                label="Next Action"
              >
                <MenuItem value="">None</MenuItem>
                {nextActionOptions.map((action) => (
                  <MenuItem key={action} value={action}>{action}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Next Action Date */}
            {formData.next_action && (
              <TextField
                fullWidth
                type="date"
                label="Next Action Date"
                value={formData.next_action_date}
                onChange={(e) => setFormData({ ...formData, next_action_date: e.target.value })}
                margin="normal"
                InputLabelProps={{ shrink: true }}
              />
            )}

            {/* Potential */}
            <FormControl component="fieldset" margin="normal" fullWidth>
              <FormLabel component="legend" sx={{ mb: 1 }}>Potential *</FormLabel>
              <Box 
                sx={{ 
                  display: 'flex', 
                  gap: 1,
                  flexWrap: 'wrap',
                }}
              >
                {['High', 'Medium', 'Low'].map((level) => (
                  <Chip
                    key={level}
                    label={level}
                    onClick={() => setFormData({ ...formData, potential: level as any })}
                    color={
                      formData.potential === level 
                        ? level === 'High' ? 'error' : level === 'Medium' ? 'warning' : 'info'
                        : 'default'
                    }
                    variant={formData.potential === level ? 'filled' : 'outlined'}
                    sx={{ 
                      flex: 1,
                      minWidth: '80px',
                      height: 40,
                    }}
                  />
                ))}
              </Box>
            </FormControl>

            {/* Competitor */}
            <TextField
              fullWidth
              label="Currently with Competitor (if any)"
              value={formData.competitor_name}
              onChange={(e) => setFormData({ ...formData, competitor_name: e.target.value })}
              margin="normal"
            />

            {/* Can be switched */}
            {formData.competitor_name && (
              <FormControl component="fieldset" margin="normal" fullWidth>
                <FormLabel component="legend" sx={{ mb: 1 }}>Can be switched?</FormLabel>
                <Box 
                  sx={{ 
                    display: 'flex', 
                    gap: 1,
                  }}
                >
                  <Chip
                    label="Yes"
                    onClick={() => setFormData({ ...formData, can_be_switched: true })}
                    color={formData.can_be_switched === true ? 'success' : 'default'}
                    variant={formData.can_be_switched === true ? 'filled' : 'outlined'}
                    sx={{ flex: 1, height: 40 }}
                  />
                  <Chip
                    label="No"
                    onClick={() => setFormData({ ...formData, can_be_switched: false })}
                    color={formData.can_be_switched === false ? 'error' : 'default'}
                    variant={formData.can_be_switched === false ? 'filled' : 'outlined'}
                    sx={{ flex: 1, height: 40 }}
                  />
                </Box>
              </FormControl>
            )}

            {/* Remarks */}
            <TextField
              fullWidth
              label="Remarks / Notes"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              margin="normal"
              multiline
              rows={3}
              placeholder="Any additional notes about this visit..."
            />

            {/* Image Capture */}
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Photo of Location/Office *
              </Typography>
              
              {capturedImage ? (
                <Box sx={{ position: 'relative', display: 'inline-block' }}>
                  <img
                    src={capturedImage}
                    alt="Visit location"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '300px',
                      borderRadius: '8px',
                      border: '2px solid #e0e0e0',
                    }}
                  />
                  <Button
                    variant="contained"
                    color="error"
                    size="small"
                    startIcon={<DeleteIcon />}
                    onClick={handleRemoveImage}
                    sx={{ mt: 1 }}
                  >
                    Remove Photo
                  </Button>
                </Box>
              ) : (
                <Button
                  variant="outlined"
                  startIcon={<CameraIcon />}
                  onClick={handleCaptureImage}
                  fullWidth
                  sx={{ py: 1.5 }}
                >
                  Capture Photo
                </Button>
              )}
            </Box>

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
                {gettingLocation ? 'Getting...' : 'Refresh GPS'}
              </Button>
              <Button
                fullWidth
                type="submit"
                variant="contained"
                endIcon={<SendIcon />}
                disabled={loading || !formData.location_lat || !formData.visit_image}
              >
                {loading ? 'Submitting...' : 'Submit Visit'}
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}

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
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';
import { visitService } from '../../services/supabase';

interface Props {
  onSuccess: () => void;
}

export default function NewVisitForm({ onSuccess }: Props) {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
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
            />

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

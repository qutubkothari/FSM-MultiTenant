import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
  InputAdornment,
  Grid,
} from '@mui/material';
import { ArrowBack, Business, Check, Close } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTenantStore } from '../store/tenantStore';
import { tenantService } from '../services/tenant.service';

export const CreateTenantPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    companyName: '',
    contactEmail: '',
    contactPhone: '',
    primaryColor: '#1976d2',
    secondaryColor: '#dc004e',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const { setTenant } = useTenantStore();
  const navigate = useNavigate();

  const handleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));

    // Auto-generate slug from company name if slug is empty
    if (field === 'companyName' && !formData.slug) {
      const autoSlug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      setFormData(prev => ({ ...prev, slug: autoSlug }));
      checkSlugAvailability(autoSlug);
    }

    // Check slug availability when manually changed
    if (field === 'slug') {
      const cleanSlug = value
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '')
        .replace(/^-|-$/g, '');
      setFormData(prev => ({ ...prev, slug: cleanSlug }));
      checkSlugAvailability(cleanSlug);
    }
  };

  const checkSlugAvailability = async (slug: string) => {
    if (!slug || slug.length < 3) {
      setSlugAvailable(null);
      return;
    }

    setSlugChecking(true);
    try {
      const available = await tenantService.isSlugAvailable(slug);
      setSlugAvailable(available);
    } catch (error) {
      console.error('Error checking slug:', error);
      setSlugAvailable(null);
    } finally {
      setSlugChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.companyName || !formData.slug || !formData.name) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.slug.length < 3) {
      setError('Organization slug must be at least 3 characters');
      return;
    }

    if (slugAvailable === false) {
      setError('This organization slug is already taken');
      return;
    }

    setLoading(true);

    try {
      const tenant = await tenantService.createTenant({
        name: formData.name,
        slug: formData.slug,
        companyName: formData.companyName,
        contactEmail: formData.contactEmail || undefined,
        contactPhone: formData.contactPhone || undefined,
        primaryColor: formData.primaryColor,
        secondaryColor: formData.secondaryColor,
      });

      if (tenant) {
        setTenant(tenant);
        // Redirect to registration page for this tenant
        navigate(`/${tenant.slug}/register`);
      }
    } catch (err: any) {
      console.error('Error creating tenant:', err);
      setError(err.message || 'Failed to create organization');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          py: 4,
        }}
      >
        {/* Back Button */}
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/select-tenant')}
          sx={{ alignSelf: 'flex-start', mb: 2 }}
        >
          Back to Organizations
        </Button>

        <Paper elevation={3} sx={{ p: 4 }}>
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Business sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom fontWeight={700}>
              Create New Organization
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Set up your organization to start managing your field sales team
            </Typography>
          </Box>

          {/* Error Message */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Form */}
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Organization Name */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Organization Name"
                  value={formData.name}
                  onChange={handleChange('name')}
                  required
                  helperText="The display name for your organization"
                />
              </Grid>

              {/* Company Name */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Company Name"
                  value={formData.companyName}
                  onChange={handleChange('companyName')}
                  required
                  helperText="Your official company name"
                />
              </Grid>

              {/* Slug */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Organization Slug"
                  value={formData.slug}
                  onChange={handleChange('slug')}
                  required
                  helperText="URL-friendly identifier (e.g., your-company)"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Typography variant="body2" color="text.secondary">
                          fsm.com/
                        </Typography>
                      </InputAdornment>
                    ),
                    endAdornment: slugChecking ? (
                      <CircularProgress size={20} />
                    ) : slugAvailable === true ? (
                      <Check color="success" />
                    ) : slugAvailable === false ? (
                      <Close color="error" />
                    ) : null,
                  }}
                  error={slugAvailable === false}
                />
              </Grid>

              {/* Contact Email */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Contact Email"
                  type="email"
                  value={formData.contactEmail}
                  onChange={handleChange('contactEmail')}
                  helperText="Organization contact email"
                />
              </Grid>

              {/* Contact Phone */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Contact Phone"
                  type="tel"
                  value={formData.contactPhone}
                  onChange={handleChange('contactPhone')}
                  helperText="Organization contact phone"
                />
              </Grid>

              {/* Primary Color */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Primary Color"
                  type="color"
                  value={formData.primaryColor}
                  onChange={handleChange('primaryColor')}
                  helperText="Main brand color"
                />
              </Grid>

              {/* Secondary Color */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Secondary Color"
                  type="color"
                  value={formData.secondaryColor}
                  onChange={handleChange('secondaryColor')}
                  helperText="Accent brand color"
                />
              </Grid>

              {/* Submit Button */}
              <Grid item xs={12}>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={loading || slugAvailable === false}
                  sx={{ mt: 2 }}
                >
                  {loading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    'Create Organization'
                  )}
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

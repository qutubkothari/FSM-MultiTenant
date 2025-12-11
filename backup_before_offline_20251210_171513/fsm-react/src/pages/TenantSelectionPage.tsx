import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Add, Business } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTenantStore, Tenant } from '../store/tenantStore';
import { tenantService } from '../services/tenant.service';

export const TenantSelectionPage: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { setTenant } = useTenantStore();
  const navigate = useNavigate();

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      setLoading(true);
      const data = await tenantService.getAllTenants();
      setTenants(data);
    } catch (err) {
      console.error('Error loading tenants:', err);
      setError('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTenant = (tenant: Tenant) => {
    setTenant(tenant);
    // Navigate to login page with tenant context set
    navigate('/login');
  };

  const handleCreateTenant = () => {
    navigate('/create-tenant');
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: 2,
        }}
      >
        <CircularProgress size={60} />
        <Typography variant="h6" color="text.secondary">
          Loading organizations...
        </Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          py: 4,
        }}
      >
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h3" gutterBottom fontWeight={700}>
            Select Your Organization
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Choose an organization to continue to your Field Sales Management system
          </Typography>
        </Box>

        {/* Error Message */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Tenant Grid */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {tenants.map((tenant) => (
            <Grid item xs={12} sm={6} md={4} key={tenant.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
              >
                <CardActionArea 
                  onClick={() => handleSelectTenant(tenant)}
                  sx={{ height: '100%', p: 2 }}
                >
                  <CardContent sx={{ textAlign: 'center' }}>
                    {/* Logo or Icon */}
                    {tenant.logoUrl ? (
                      <Box
                        component="img"
                        src={tenant.logoUrl}
                        alt={tenant.companyName}
                        sx={{
                          height: 80,
                          objectFit: 'contain',
                          mb: 2,
                          mx: 'auto',
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: 80,
                          height: 80,
                          borderRadius: '50%',
                          backgroundColor: tenant.primaryColor || '#1976d2',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mx: 'auto',
                          mb: 2,
                        }}
                      >
                        <Business sx={{ fontSize: 40, color: 'white' }} />
                      </Box>
                    )}

                    {/* Company Name */}
                    <Typography variant="h6" gutterBottom fontWeight={600}>
                      {tenant.companyName}
                    </Typography>

                    {/* Slug */}
                    <Typography variant="body2" color="text.secondary">
                      @{tenant.slug}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}

          {/* Create New Tenant Card */}
          <Grid item xs={12} sm={6} md={4}>
            <Card 
              sx={{ 
                height: '100%',
                border: '2px dashed',
                borderColor: 'primary.main',
                backgroundColor: 'transparent',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                },
              }}
            >
              <CardActionArea 
                onClick={handleCreateTenant}
                sx={{ height: '100%', p: 2 }}
              >
                <CardContent 
                  sx={{ 
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 200,
                  }}
                >
                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      border: '2px dashed',
                      borderColor: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 2,
                    }}
                  >
                    <Add sx={{ fontSize: 40, color: 'primary.main' }} />
                  </Box>

                  <Typography variant="h6" gutterBottom fontWeight={600} color="primary">
                    Create New Organization
                  </Typography>

                  <Typography variant="body2" color="text.secondary">
                    Set up a new organization for your team
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        </Grid>

        {/* Empty State */}
        {tenants.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No organizations found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Create your first organization to get started
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleCreateTenant}
              size="large"
            >
              Create Organization
            </Button>
          </Box>
        )}
      </Box>
    </Container>
  );
};

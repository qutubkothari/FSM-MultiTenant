import React, { useEffect, useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useTenantStore } from '../store/tenantStore';
import { tenantService } from '../services/tenant.service';
import { useNavigate } from 'react-router-dom';

interface TenantResolverProps {
  children: React.ReactNode;
}

export const TenantResolver: React.FC<TenantResolverProps> = ({ children }) => {
  const { tenant, setTenant, setLoading, setError } = useTenantStore();
  const [isResolving, setIsResolving] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const resolveTenant = async () => {
      try {
        setLoading(true);
        
        // Try to resolve tenant from URL
        const resolvedTenant = await tenantService.resolveTenantFromUrl();
        
        if (resolvedTenant) {
          setTenant(resolvedTenant);
          setIsResolving(false);
        } else if (tenant) {
          // Use cached tenant if available
          setIsResolving(false);
        } else {
          // No tenant found, redirect to tenant selection
          setIsResolving(false);
          navigate('/select-tenant');
        }
      } catch (error) {
        console.error('Error resolving tenant:', error);
        setError('Failed to load tenant information');
        setIsResolving(false);
      } finally {
        setLoading(false);
      }
    };

    resolveTenant();
  }, [setTenant, setLoading, setError, navigate]);

  if (isResolving) {
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
          Loading tenant...
        </Typography>
      </Box>
    );
  }

  if (!tenant) {
    return null; // Will be handled by navigation to tenant selection
  }

  return <>{children}</>;
};

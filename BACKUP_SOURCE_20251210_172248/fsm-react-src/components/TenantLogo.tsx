import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTenantStore } from '../store/tenantStore';

interface TenantLogoProps {
  size?: 'small' | 'medium' | 'large';
  showName?: boolean;
}

export const TenantLogo: React.FC<TenantLogoProps> = ({ 
  size = 'medium',
  showName = false 
}) => {
  const { tenant } = useTenantStore();

  const sizes = {
    small: { 
      height: 32, 
      fontSize: '1rem',
      nameSize: '0.875rem'
    },
    medium: { 
      height: 48, 
      fontSize: '1.5rem',
      nameSize: '1rem'
    },
    large: { 
      height: 64, 
      fontSize: '2rem',
      nameSize: '1.25rem'
    },
  };

  const currentSize = sizes[size];

  // If tenant has a logo URL, display it
  if (tenant?.logoUrl) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          component="img"
          src={tenant.logoUrl}
          alt={tenant.companyName}
          sx={{ 
            height: currentSize.height, 
            objectFit: 'contain',
            maxWidth: '200px'
          }}
        />
        {showName && (
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 600,
              fontSize: currentSize.nameSize,
              color: 'text.primary'
            }}
          >
            {tenant.companyName}
          </Typography>
        )}
      </Box>
    );
  }

  // Fallback to text-based logo
  return (
    <Typography 
      variant="h6" 
      sx={{ 
        fontWeight: 700,
        fontSize: currentSize.fontSize,
        color: 'primary.main',
        letterSpacing: '0.5px'
      }}
    >
      {tenant?.companyName || 'FSM'}
    </Typography>
  );
};

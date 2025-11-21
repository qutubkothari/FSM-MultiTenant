# Multi-Tenant FSM Architecture

## Overview
This document outlines the multi-tenant architecture for the Field Sales Management system, allowing multiple companies/organizations to use the same application with isolated data, custom branding, and tenant-specific configurations.

## Architecture Components

### 1. Database Schema Changes

#### New Tables

**tenants**
```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL, -- URL-friendly identifier
  company_name VARCHAR(255) NOT NULL,
  logo_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#1976d2',
  secondary_color VARCHAR(7) DEFAULT '#dc004e',
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  subscription_plan VARCHAR(50) DEFAULT 'basic', -- basic, premium, enterprise
  subscription_expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tenant" ON tenants
  FOR SELECT USING (id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can manage their tenant" ON tenants
  FOR ALL USING (
    id = (SELECT tenant_id FROM users WHERE id = auth.uid() AND role = 'admin')
  );
```

#### Modified Tables

**users** - Add tenant_id
```sql
ALTER TABLE users ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX idx_users_tenant_id ON users(tenant_id);

-- Update RLS policies to include tenant isolation
DROP POLICY IF EXISTS "Users can view their own data" ON users;
CREATE POLICY "Users can view own tenant data" ON users
  FOR SELECT USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));
```

**salesmen** - Add tenant_id
```sql
ALTER TABLE salesmen ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX idx_salesmen_tenant_id ON salesmen(tenant_id);

-- Update RLS policies
DROP POLICY IF EXISTS "Salesmen can view their own data" ON salesmen;
CREATE POLICY "Salesmen can view own tenant data" ON salesmen
  FOR SELECT USING (tenant_id = (SELECT tenant_id FROM users WHERE phone = phone AND users.tenant_id = tenant_id));
```

**customers** - Add tenant_id
```sql
ALTER TABLE customers ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX idx_customers_tenant_id ON customers(tenant_id);

-- Update RLS policies
CREATE POLICY "Users can view own tenant customers" ON customers
  FOR SELECT USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));
```

**visits** - Add tenant_id
```sql
ALTER TABLE visits ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX idx_visits_tenant_id ON visits(tenant_id);

-- Update RLS policies
CREATE POLICY "Users can view own tenant visits" ON visits
  FOR SELECT USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));
```

**products** - Add tenant_id
```sql
ALTER TABLE products ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX idx_products_tenant_id ON products(tenant_id);

-- Update RLS policies
CREATE POLICY "Users can view own tenant products" ON products
  FOR SELECT USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));
```

**targets** - Add tenant_id
```sql
ALTER TABLE targets ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX idx_targets_tenant_id ON targets(tenant_id);

-- Update RLS policies
CREATE POLICY "Users can view own tenant targets" ON targets
  FOR SELECT USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));
```

### 2. Tenant Context Management

**Create Tenant Context Hook**
```typescript
// src/hooks/useTenant.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  companyName: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
}

interface TenantStore {
  tenant: Tenant | null;
  setTenant: (tenant: Tenant | null) => void;
  clearTenant: () => void;
}

export const useTenantStore = create<TenantStore>()(
  persist(
    (set) => ({
      tenant: null,
      setTenant: (tenant) => set({ tenant }),
      clearTenant: () => set({ tenant: null }),
    }),
    {
      name: 'tenant-storage',
    }
  )
);
```

### 3. Tenant Selection & Routing

#### Subdomain-based Routing (Recommended)
- Format: `{tenant-slug}.yourdomain.com`
- Example: `acme.fsm.saksolution.com`
- Automatically extract tenant from subdomain

#### Path-based Routing (Alternative)
- Format: `yourdomain.com/{tenant-slug}`
- Example: `fsm.saksolution.com/acme`
- Extract tenant from URL path

#### Tenant Resolver Component
```typescript
// src/components/TenantResolver.tsx
import { useEffect, useState } from 'react';
import { useTenantStore } from '../hooks/useTenant';
import { supabase } from '../services/supabase';

export const TenantResolver: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tenant, setTenant } = useTenantStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const resolveTenant = async () => {
      // Extract tenant slug from subdomain or path
      const hostname = window.location.hostname;
      const parts = hostname.split('.');
      
      let tenantSlug: string | null = null;
      
      // Subdomain-based
      if (parts.length > 2 && parts[0] !== 'www') {
        tenantSlug = parts[0];
      }
      // Path-based fallback
      else {
        const pathParts = window.location.pathname.split('/');
        if (pathParts.length > 1 && pathParts[1]) {
          tenantSlug = pathParts[1];
        }
      }

      if (!tenantSlug) {
        // Show tenant selection page
        setLoading(false);
        return;
      }

      // Fetch tenant data
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('slug', tenantSlug)
        .eq('is_active', true)
        .single();

      if (data && !error) {
        setTenant(data);
      }

      setLoading(false);
    };

    resolveTenant();
  }, [setTenant]);

  if (loading) {
    return <div>Loading tenant...</div>;
  }

  if (!tenant) {
    return <TenantSelectionPage />;
  }

  return <>{children}</>;
};
```

### 4. Branding System

**Theme Provider with Tenant Colors**
```typescript
// src/theme.ts
import { createTheme } from '@mui/material/styles';
import { useTenantStore } from './hooks/useTenant';

export const useAppTheme = () => {
  const { tenant } = useTenantStore();

  return createTheme({
    palette: {
      primary: {
        main: tenant?.primaryColor || '#1976d2',
      },
      secondary: {
        main: tenant?.secondaryColor || '#dc004e',
      },
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    },
  });
};
```

**Logo Component**
```typescript
// src/components/TenantLogo.tsx
import { useTenantStore } from '../hooks/useTenant';
import { Box, Typography } from '@mui/material';

export const TenantLogo: React.FC<{ size?: 'small' | 'medium' | 'large' }> = ({ 
  size = 'medium' 
}) => {
  const { tenant } = useTenantStore();

  const sizes = {
    small: { height: 32, fontSize: '1rem' },
    medium: { height: 48, fontSize: '1.5rem' },
    large: { height: 64, fontSize: '2rem' },
  };

  if (tenant?.logoUrl) {
    return (
      <Box
        component="img"
        src={tenant.logoUrl}
        alt={tenant.companyName}
        sx={{ height: sizes[size].height, objectFit: 'contain' }}
      />
    );
  }

  return (
    <Typography 
      variant="h6" 
      sx={{ 
        fontWeight: 700,
        fontSize: sizes[size].fontSize,
        color: 'primary.main'
      }}
    >
      {tenant?.companyName || 'FSM'}
    </Typography>
  );
};
```

### 5. Service Layer Updates

**Add Tenant Context to All Queries**
```typescript
// src/services/supabase.ts
import { useTenantStore } from '../hooks/useTenant';

// Helper function to add tenant filter
const withTenantFilter = (query: any) => {
  const { tenant } = useTenantStore.getState();
  if (tenant?.id) {
    return query.eq('tenant_id', tenant.id);
  }
  return query;
};

// Example usage in getVisits
export const getVisits = async (salesmanId?: string, userPhone?: string, limit?: number) => {
  let query = supabase.from('visits').select(`
    *,
    customer:customers(*),
    salesman:salesmen(*)
  `);

  // Add tenant filter
  query = withTenantFilter(query);

  if (salesmanId) {
    query = query.eq('salesman_id', salesmanId);
  }
  
  // ... rest of the logic
};

// Update createVisit to include tenant_id
export const createVisit = async (visitData: Partial<Visit>) => {
  const { tenant } = useTenantStore.getState();
  
  const { data, error } = await supabase
    .from('visits')
    .insert({
      ...visitData,
      tenant_id: tenant?.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};
```

### 6. Registration Flow Updates

**Update Registration to Include Tenant Selection**
```typescript
// Registration page should:
1. Allow new tenant creation (for first admin)
2. Allow joining existing tenant (with invite code or email verification)
3. Store tenant_id with user and salesman records

// During registration:
const register = async (userData: RegisterData) => {
  const { tenant } = useTenantStore.getState();
  
  // Create user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: userData.phone + '@tenant.local', // Placeholder email
    password: userData.password,
  });

  if (authError) throw authError;

  // Create user record with tenant
  const { data: user, error: userError } = await supabase
    .from('users')
    .insert({
      phone: userData.phone,
      name: userData.name,
      role: userData.role,
      tenant_id: tenant?.id,
    })
    .select()
    .single();

  if (userError) throw userError;

  // If salesman, create salesman record
  if (userData.role === 'salesman') {
    await supabase.from('salesmen').insert({
      name: userData.name,
      phone: userData.phone,
      email: userData.phone + '@tenant.local',
      tenant_id: tenant?.id,
    });
  }

  return user;
};
```

### 7. Admin Panel Updates

**Tenant Management Section**
```typescript
// src/components/admin/TenantSettings.tsx
- View/Edit tenant details
- Upload/change logo
- Customize colors
- Manage subscription
- View usage statistics
- Invite users
```

**User Management with Tenant Context**
```typescript
// All user queries filtered by tenant_id
// Admin can only see/manage users in their tenant
```

### 8. Deployment Configuration

**App Engine with Wildcard Subdomain**
```yaml
# app-react.yaml
runtime: nodejs18
service: default

env_variables:
  VITE_SUPABASE_URL: "your-supabase-url"
  VITE_SUPABASE_ANON_KEY: "your-anon-key"
  VITE_MULTI_TENANT_MODE: "subdomain" # or "path"

handlers:
- url: /.*
  script: auto
  secure: always

# Configure custom domain with wildcard DNS
# *.fsm.saksolution.com -> points to your App Engine service
```

**DNS Configuration**
```
A     @                  216.239.32.21 (App Engine IP)
A     *                  216.239.32.21 (Wildcard for subdomains)
CNAME fsm                ghs.googlehosted.com
```

## Implementation Phases

### Phase 1: Database & Core Infrastructure (Week 1)
- [ ] Create tenants table
- [ ] Add tenant_id to all existing tables
- [ ] Update RLS policies
- [ ] Create migration script
- [ ] Test data isolation

### Phase 2: Tenant Context & Service Layer (Week 1-2)
- [ ] Implement tenant store
- [ ] Create tenant resolver
- [ ] Update all service methods with tenant filter
- [ ] Add tenant context to auth flow

### Phase 3: Branding & UI (Week 2)
- [ ] Implement dynamic theming
- [ ] Create tenant logo component
- [ ] Update all pages with tenant branding
- [ ] Add tenant selection page

### Phase 4: Registration & Onboarding (Week 2-3)
- [ ] Update registration flow
- [ ] Create tenant creation flow
- [ ] Implement invite system
- [ ] Add email verification

### Phase 5: Admin Panel (Week 3)
- [ ] Add tenant settings page
- [ ] Implement logo upload
- [ ] Add color customization
- [ ] Create user invitation system

### Phase 6: Testing & Deployment (Week 3-4)
- [ ] Test with multiple tenants
- [ ] Verify data isolation
- [ ] Load testing
- [ ] Configure wildcard subdomain
- [ ] Deploy to production

## Security Considerations

1. **Data Isolation**: RLS policies ensure complete data separation
2. **Tenant Context**: Always verify tenant_id in all operations
3. **Cross-Tenant Access**: Prevent any cross-tenant data leakage
4. **Admin Privileges**: Restrict to tenant-level only
5. **API Security**: Validate tenant context in all API calls

## Performance Optimization

1. **Indexes**: Add tenant_id indexes on all tables
2. **Caching**: Cache tenant data (logo, colors) in localStorage
3. **Query Optimization**: Include tenant_id in all where clauses
4. **Connection Pooling**: Use per-tenant connection pools if needed

## Migration Strategy

1. **Create default tenant**: Migrate existing data to a default tenant
2. **Backfill tenant_id**: Update all existing records with default tenant_id
3. **Enable RLS**: Gradually enable RLS policies
4. **Test thoroughly**: Verify all features work with tenant context
5. **Go live**: Deploy multi-tenant version

## Future Enhancements

1. **White Labeling**: Custom domains per tenant
2. **SSO Integration**: Allow enterprise SSO
3. **Tenant Analytics**: Per-tenant usage dashboards
4. **Billing Integration**: Automated subscription management
5. **Multi-language**: Per-tenant language preferences
6. **Custom Fields**: Allow tenants to add custom fields
7. **API Access**: Tenant-specific API keys
8. **Data Export**: Per-tenant data export functionality

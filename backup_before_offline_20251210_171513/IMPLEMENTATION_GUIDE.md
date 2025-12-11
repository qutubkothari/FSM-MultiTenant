# FSM Multi-Tenant Implementation Guide

## 🎯 Quick Start

Your FSM project has been successfully copied to **FSM-MultiTenant** with a complete multi-tenant architecture ready for implementation.

## 📋 What's Been Created

### 1. **Documentation**
- `MULTI_TENANT_ARCHITECTURE.md` - Complete architecture overview and implementation phases
- `IMPLEMENTATION_GUIDE.md` - This file - step-by-step implementation instructions

### 2. **Database Migration**
- `database/multi-tenant-migration.sql` - Complete SQL migration script

### 3. **Core Components**
- `src/store/tenantStore.ts` - Tenant state management (Zustand)
- `src/services/tenant.service.ts` - Tenant CRUD operations
- `src/components/TenantResolver.tsx` - Automatic tenant resolution from URL
- `src/components/TenantLogo.tsx` - Dynamic logo/branding component

### 4. **New Pages**
- `src/pages/TenantSelectionPage.tsx` - Organization selection interface
- `src/pages/CreateTenantPage.tsx` - New organization creation form

## 🚀 Implementation Steps

### Phase 1: Database Setup (30 minutes)

1. **Run the migration script**
   ```bash
   # Open Supabase Dashboard -> SQL Editor
   # Copy contents of database/multi-tenant-migration.sql
   # Execute the script
   ```

2. **Verify migration**
   - Check that `tenants` table exists
   - Verify all tables have `tenant_id` column
   - Confirm default tenant was created
   - Test RLS policies

3. **Create Storage Bucket (for logos)**
   ```sql
   -- In Supabase Dashboard -> Storage
   -- Create bucket named: 'public'
   -- Set as public bucket
   ```

### Phase 2: Service Layer Updates (2-3 hours)

Update `src/services/supabase.ts` to include tenant context:

```typescript
import { getCurrentTenantId } from '../store/tenantStore';

// Helper function to add tenant filter to queries
const withTenantFilter = (query: any) => {
  const tenantId = getCurrentTenantId();
  if (tenantId) {
    return query.eq('tenant_id', tenantId);
  }
  return query;
};

// Update ALL query methods to include tenant filter
export const getVisits = async (salesmanId?: string, userPhone?: string, limit?: number) => {
  let query = supabase.from('visits').select(`
    *,
    customer:customers(*),
    salesman:salesmen(*)
  `);

  // Add tenant filter - CRITICAL!
  query = withTenantFilter(query);

  // ... rest of logic
};

// Update ALL insert methods to include tenant_id
export const createVisit = async (visitData: Partial<Visit>) => {
  const tenantId = getCurrentTenantId();
  
  const { data, error } = await supabase
    .from('visits')
    .insert({
      ...visitData,
      tenant_id: tenantId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};
```

**Files to update:**
- ✅ `getVisits()` - Add tenant filter
- ✅ `createVisit()` - Add tenant_id
- ✅ `getCustomers()` - Add tenant filter
- ✅ `createCustomer()` - Add tenant_id
- ✅ `getProducts()` - Add tenant filter
- ✅ `createProduct()` - Add tenant_id
- ✅ `getSalesmen()` - Add tenant filter
- ✅ `getTargets()` - Add tenant filter
- ✅ All other query/insert methods

### Phase 3: Auth Flow Updates (1-2 hours)

Update `src/store/authStore.ts`:

```typescript
import { getCurrentTenantId } from './tenantStore';

// Update register function
register: async (name: string, phone: string, password: string, role: string) => {
  const tenantId = getCurrentTenantId();
  
  if (!tenantId) {
    throw new Error('No tenant selected');
  }

  // ... create auth user
  
  // Create user with tenant_id
  const { data: user, error: userError } = await supabase
    .from('users')
    .insert({
      phone,
      name,
      role,
      tenant_id: tenantId, // CRITICAL!
    })
    .select()
    .single();

  // If salesman, create salesman record
  if (role === 'salesman') {
    await supabase.from('salesmen').insert({
      name,
      phone,
      email: phone + '@tenant.local',
      tenant_id: tenantId, // CRITICAL!
    });
  }

  // ... rest of logic
};

// Update login function to verify tenant
login: async (phone: string, password: string) => {
  const tenantId = getCurrentTenantId();
  
  if (!tenantId) {
    throw new Error('No tenant selected');
  }

  // ... authenticate

  // Verify user belongs to current tenant
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('phone', phone)
    .eq('tenant_id', tenantId)
    .single();

  if (!user) {
    throw new Error('User not found in this organization');
  }

  // ... rest of logic
};
```

### Phase 4: App Structure Updates (2 hours)

Update `src/App.tsx`:

```typescript
import { TenantResolver } from './components/TenantResolver';
import { TenantSelectionPage } from './pages/TenantSelectionPage';
import { CreateTenantPage } from './pages/CreateTenantPage';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Router>
        <Routes>
          {/* Tenant selection routes - NO tenant context required */}
          <Route path="/select-tenant" element={<TenantSelectionPage />} />
          <Route path="/create-tenant" element={<CreateTenantPage />} />

          {/* All other routes require tenant context */}
          <Route path="/*" element={
            <TenantResolver>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/" element={<ProtectedRoute />}>
                  {/* ... existing routes */}
                </Route>
              </Routes>
            </TenantResolver>
          } />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}
```

### Phase 5: Update Theme (30 minutes)

Update `src/theme.ts`:

```typescript
import { useTenantStore } from './store/tenantStore';

export const useAppTheme = () => {
  const { tenant } = useTenantStore();

  return useMemo(() => 
    createTheme({
      palette: {
        primary: {
          main: tenant?.primaryColor || '#1976d2',
        },
        secondary: {
          main: tenant?.secondaryColor || '#dc004e',
        },
      },
      // ... rest of theme
    }),
    [tenant]
  );
};

// Update App.tsx to use dynamic theme
function App() {
  const theme = useAppTheme();
  
  return (
    <ThemeProvider theme={theme}>
      {/* ... */}
    </ThemeProvider>
  );
}
```

### Phase 6: Update UI Components (1-2 hours)

Replace hardcoded branding:

**LoginPage.tsx:**
```typescript
import { TenantLogo } from '../components/TenantLogo';

// Replace:
<Typography variant="h6">HYLiTE</Typography>

// With:
<TenantLogo size="large" />
```

**AppBar components:**
```typescript
import { TenantLogo } from '../components/TenantLogo';

// In all AppBar components, replace logo with:
<TenantLogo size="small" showName />
```

**Files to update:**
- ✅ `LoginPage.tsx`
- ✅ `AdminAppBar.tsx`
- ✅ `SalesmanAppBar.tsx`
- ✅ Any other components showing logo/branding

### Phase 7: Admin Panel Enhancements (2-3 hours)

Create `src/components/admin/TenantSettings.tsx`:

```typescript
export const TenantSettings: React.FC = () => {
  const { tenant, setTenant } = useTenantStore();
  const [formData, setFormData] = useState({...tenant});
  const [uploading, setUploading] = useState(false);

  const handleLogoUpload = async (file: File) => {
    setUploading(true);
    try {
      const logoUrl = await tenantService.uploadLogo(tenant!.id, file);
      setTenant({ ...tenant!, logoUrl });
      // Show success message
    } catch (error) {
      // Show error
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      const updated = await tenantService.updateTenant(tenant!.id, formData);
      setTenant(updated!);
      // Show success
    } catch (error) {
      // Show error
    }
  };

  return (
    <Paper>
      {/* Logo upload */}
      <Box>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            if (e.target.files?.[0]) {
              handleLogoUpload(e.target.files[0]);
            }
          }}
        />
      </Box>

      {/* Company details form */}
      <TextField
        label="Company Name"
        value={formData.companyName}
        onChange={...}
      />

      {/* Color pickers */}
      <TextField
        type="color"
        label="Primary Color"
        value={formData.primaryColor}
        onChange={...}
      />

      <Button onClick={handleSave}>Save Changes</Button>
    </Paper>
  );
};
```

Add route in admin panel:
```typescript
<Route path="/settings" element={<TenantSettings />} />
```

### Phase 8: Testing (2-3 hours)

**Test Checklist:**
- [ ] Create new tenant from UI
- [ ] Switch between tenants
- [ ] Register admin user in new tenant
- [ ] Register salesman in new tenant
- [ ] Verify data isolation (users can't see other tenant data)
- [ ] Upload tenant logo
- [ ] Change tenant colors and verify theme updates
- [ ] Create visits, customers, products in each tenant
- [ ] Verify RLS policies prevent cross-tenant access
- [ ] Test with multiple browsers/incognito for different tenants

### Phase 9: Deployment Configuration (1 hour)

**Option A: Subdomain-based (Recommended)**

1. Update DNS:
```
A     *     216.239.32.21  (Wildcard for all subdomains)
```

2. Configure App Engine dispatch.yaml:
```yaml
dispatch:
  - url: "*.fsm.saksolution.com/*"
    service: default
```

3. Update environment variables:
```yaml
env_variables:
  VITE_MULTI_TENANT_MODE: "subdomain"
  VITE_BASE_DOMAIN: "fsm.saksolution.com"
```

**Option B: Path-based**

1. Update `app-react.yaml`:
```yaml
env_variables:
  VITE_MULTI_TENANT_MODE: "path"
```

2. Routes will be: `fsm.saksolution.com/acme/...`

### Phase 10: Migration of Existing Data

Run this SQL to assign all existing data to default tenant:

```sql
-- Already included in migration script
-- But verify with:
SELECT 
  'users' as table_name,
  COUNT(*) as records,
  COUNT(DISTINCT tenant_id) as tenants
FROM users
UNION ALL
SELECT 'salesmen', COUNT(*), COUNT(DISTINCT tenant_id) FROM salesmen
UNION ALL
SELECT 'customers', COUNT(*), COUNT(DISTINCT tenant_id) FROM customers
UNION ALL
SELECT 'visits', COUNT(*), COUNT(DISTINCT tenant_id) FROM visits
UNION ALL
SELECT 'products', COUNT(*), COUNT(DISTINCT tenant_id) FROM products;
```

## 🔧 Development Workflow

```bash
# Navigate to multi-tenant project
cd FSM-MultiTenant/fsm-react

# Install dependencies (if needed)
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Deploy
gcloud app deploy app.yaml --quiet
```

## 🎨 Customization Examples

### Adding Custom Tenant Fields

1. Add column to tenants table:
```sql
ALTER TABLE tenants ADD COLUMN welcome_message TEXT;
```

2. Update Tenant interface:
```typescript
export interface Tenant {
  // ... existing fields
  welcomeMessage?: string;
}
```

3. Use in components:
```typescript
const { tenant } = useTenantStore();
<Typography>{tenant?.welcomeMessage}</Typography>
```

### Per-Tenant Feature Flags

```typescript
// Add to tenants table
ALTER TABLE tenants ADD COLUMN features JSONB DEFAULT '{}'::jsonb;

// Use in code
const hasFeature = (feature: string) => {
  const { tenant } = useTenantStore();
  return tenant?.features?.[feature] === true;
};

// In component
{hasFeature('advancedReports') && <AdvancedReports />}
```

## 🔒 Security Checklist

- [ ] RLS policies enabled on all tables
- [ ] Tenant context required for all operations
- [ ] No cross-tenant data leakage
- [ ] Admin privileges scoped to tenant only
- [ ] API endpoints validate tenant context
- [ ] File uploads scoped to tenant folder
- [ ] Audit logging includes tenant_id

## 📊 Performance Optimization

- [x] Indexes on all tenant_id columns
- [x] Composite indexes for common queries
- [ ] Tenant data cached in localStorage
- [ ] Logo/branding cached in service worker
- [ ] Database connection pooling per tenant (if needed)

## 🐛 Troubleshooting

### Issue: "No tenant selected" error
**Solution:** Ensure TenantResolver wraps protected routes and tenant is loaded before navigation

### Issue: Data not showing after switching tenants
**Solution:** Clear query cache and reload data when tenant changes

### Issue: RLS policy blocking queries
**Solution:** Check that `get_user_tenant_id()` function returns correct tenant_id

### Issue: Logo not uploading
**Solution:** Verify Supabase Storage bucket 'public' exists and is public

## 📚 Additional Resources

- Supabase Row Level Security: https://supabase.com/docs/guides/auth/row-level-security
- Multi-tenant Architecture Patterns: https://docs.microsoft.com/en-us/azure/architecture/guide/multitenant/overview
- Zustand State Management: https://github.com/pmndrs/zustand

## 🎉 Next Steps

1. **Immediate:** Run database migration
2. **Today:** Update service layer with tenant filters
3. **This Week:** Complete auth flow and UI updates
4. **Testing:** Create 2-3 test tenants and verify isolation
5. **Deploy:** Configure subdomain routing and deploy

## 📞 Need Help?

Refer to `MULTI_TENANT_ARCHITECTURE.md` for detailed architecture information.

---

**Original Project:** FSM (single-tenant)  
**New Project:** FSM-MultiTenant (multi-tenant ready)  
**Created:** November 22, 2025  
**Status:** Ready for implementation ✅

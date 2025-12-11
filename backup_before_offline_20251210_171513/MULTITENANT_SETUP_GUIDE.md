# 🚀 FSM Multi-Tenant Setup Guide

## Overview
This guide will help you set up your FSM application with multi-tenant support. You'll be able to manage multiple organizations/companies in the same system with complete data isolation.

---

## 📋 Prerequisites

- ✅ Supabase account with project created
- ✅ Database connection details (URL and anon key)
- ✅ Access to Supabase SQL Editor

---

## 🎯 Setup Methods

Choose one of these methods to set up your multi-tenant database:

### Method 1: Using the Setup Tool (Recommended) ⭐

1. **Open the setup tool:**
   ```
   Open: setup-multitenant.html in your browser
   ```

2. **Check connection:**
   - The tool will automatically test your Supabase connection
   - You should see "✅ Connected to Supabase"

3. **Run migration:**
   - Click "🚀 Run Migration" button
   - Wait for all checkboxes to turn green
   - If you see permission errors, use Method 2 instead

4. **Verify setup:**
   - Click "🔍 Verify Setup" button
   - All checks should show ✅

5. **Create tenants:**
   - Fill in the tenant form
   - Click "➕ Create Tenant"
   - Click "📋 List All Tenants" to see all organizations

### Method 2: Using Supabase SQL Editor (Direct)

1. **Open Supabase Dashboard:**
   - Go to: https://app.supabase.com
   - Select your project

2. **Navigate to SQL Editor:**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and paste the migration script:**
   ```
   Open: database/multi-tenant-migration.sql
   Copy all contents
   Paste into SQL Editor
   Click "Run" button
   ```

4. **Verify completion:**
   - You should see: "Migration completed successfully!"
   - Check tenant count and user count in output

5. **Create additional tenants (optional):**
   ```sql
   INSERT INTO tenants (name, slug, company_name, primary_color, secondary_color)
   VALUES 
     ('Acme Corp', 'acme', 'Acme Corporation', '#FF5722', '#FFC107'),
     ('TechCo', 'techco', 'TechCo Industries', '#3F51B5', '#00BCD4');
   ```

---

## 🔍 What Gets Created

### 1. Tenants Table
Stores organization information:
- Company name and display name
- URL slug for routing (e.g., "acme", "techco")
- Custom branding (logo, colors)
- Contact information
- Subscription details

### 2. Updated Tables
All existing tables get a `tenant_id` column:
- ✅ users
- ✅ salesmen
- ✅ customers
- ✅ visits
- ✅ products
- ✅ targets
- ✅ orders

### 3. Row Level Security (RLS)
Automatic data isolation:
- Users can only see data from their tenant
- Admins can manage their tenant settings
- Complete security at database level

### 4. Default Tenant
Your existing data is preserved:
- Default tenant created: "SAK Solution"
- Slug: "sak"
- All existing data assigned to this tenant

---

## 📊 Verification Steps

### Check Tenants Table
```sql
SELECT id, name, slug, company_name, is_active 
FROM tenants 
ORDER BY created_at;
```

Expected result: At least 1 tenant (default)

### Check Tenant IDs on Tables
```sql
-- Check users
SELECT COUNT(*) as total, COUNT(tenant_id) as with_tenant 
FROM users;

-- Check salesmen
SELECT COUNT(*) as total, COUNT(tenant_id) as with_tenant 
FROM salesmen;

-- Check customers
SELECT COUNT(*) as total, COUNT(tenant_id) as with_tenant 
FROM customers;
```

Expected result: total = with_tenant (all records have tenant_id)

### Test Tenant Isolation
```sql
-- Get tenant by slug
SELECT * FROM get_tenant_by_slug('sak');

-- Count records per tenant
SELECT 
  t.name as tenant_name,
  (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) as users,
  (SELECT COUNT(*) FROM customers c WHERE c.tenant_id = t.id) as customers,
  (SELECT COUNT(*) FROM visits v WHERE v.tenant_id = t.id) as visits
FROM tenants t
ORDER BY t.created_at;
```

---

## 🎨 Creating New Tenants

### Using the Setup Tool
1. Open `setup-multitenant.html`
2. Scroll to "Step 3: Create New Tenant"
3. Fill in the form:
   - **Company Name**: Full legal name
   - **URL Slug**: lowercase, no spaces (e.g., "acme")
   - **Display Name**: Short name for UI
   - **Contact Email**: Admin email
   - **Contact Phone**: Admin phone
   - **Primary Color**: Main brand color
   - **Secondary Color**: Accent color
4. Click "➕ Create Tenant"

### Using SQL
```sql
-- Create a new tenant manually
INSERT INTO tenants (
  name,
  slug,
  company_name,
  contact_email,
  contact_phone,
  primary_color,
  secondary_color
) VALUES (
  'Acme',
  'acme',
  'Acme Corporation',
  'admin@acme.com',
  '+1234567890',
  '#FF5722',
  '#FFC107'
);
```

### Using the Function
```sql
-- Use the helper function
SELECT create_tenant(
  'TechCo',              -- name
  'techco',              -- slug
  'TechCo Industries',   -- company_name
  'info@techco.com',     -- contact_email
  '+9876543210',         -- contact_phone
  '#3F51B5',            -- primary_color
  '#00BCD4'             -- secondary_color
);
```

---

## 🔗 Connecting Users to Tenants

### When Creating New Users
Make sure to include `tenant_id` when creating users:

```typescript
// In your registration code
const { data, error } = await supabase
  .from('users')
  .insert({
    phone: phone,
    name: name,
    password: hashedPassword,
    role: role,
    tenant_id: tenantId,  // ← Add this!
    email: email
  });
```

### For Existing Users
All existing users are automatically assigned to the default tenant ("sak").

To move a user to a different tenant:
```sql
UPDATE users 
SET tenant_id = (SELECT id FROM tenants WHERE slug = 'acme')
WHERE phone = '+1234567890';
```

---

## 🌐 Tenant Routing

### Option 1: Subdomain Routing
- acme.yourdomain.com → Acme tenant
- techco.yourdomain.com → TechCo tenant

Configure in your app:
```typescript
// Extract subdomain from URL
const hostname = window.location.hostname;
const subdomain = hostname.split('.')[0];

// Fetch tenant by slug
const { data: tenant } = await supabase
  .from('tenants')
  .select('*')
  .eq('slug', subdomain)
  .single();
```

### Option 2: Path-Based Routing
- yourdomain.com/acme → Acme tenant
- yourdomain.com/techco → TechCo tenant

Configure in your app:
```typescript
// Extract tenant from path
const path = window.location.pathname;
const tenantSlug = path.split('/')[1];

// Fetch tenant by slug
const { data: tenant } = await supabase
  .from('tenants')
  .select('*')
  .eq('slug', tenantSlug)
  .single();
```

### Option 3: Tenant Selection
- yourdomain.com/select → Show tenant selection page
- User selects organization
- Store tenant in local storage

---

## 🛠️ Application Updates Needed

### 1. Add Tenant Context
Create a tenant store (already exists in `fsm-react/src/store/tenantStore.ts`):
```typescript
import { create } from 'zustand';

interface TenantState {
  tenant: Tenant | null;
  setTenant: (tenant: Tenant | null) => void;
}

export const useTenantStore = create<TenantState>((set) => ({
  tenant: null,
  setTenant: (tenant) => set({ tenant }),
}));
```

### 2. Update All Database Queries
Add `tenant_id` filter to all queries:

**Before:**
```typescript
const { data } = await supabase
  .from('customers')
  .select('*');
```

**After:**
```typescript
const { data } = await supabase
  .from('customers')
  .select('*')
  .eq('tenant_id', currentTenant.id);
```

### 3. Update All Insert Operations
Include `tenant_id` when creating records:

**Before:**
```typescript
const { data } = await supabase
  .from('customers')
  .insert({ name, phone, email });
```

**After:**
```typescript
const { data } = await supabase
  .from('customers')
  .insert({ 
    name, 
    phone, 
    email,
    tenant_id: currentTenant.id 
  });
```

---

## 🎨 Custom Branding

### Apply Tenant Colors
```typescript
// In your app
const tenant = useTenantStore((state) => state.tenant);

// Create theme with tenant colors
const theme = createTheme({
  palette: {
    primary: {
      main: tenant?.primary_color || '#1976d2',
    },
    secondary: {
      main: tenant?.secondary_color || '#dc004e',
    },
  },
});
```

### Display Tenant Logo
```typescript
// In your header/navbar
{tenant?.logo_url && (
  <img 
    src={tenant.logo_url} 
    alt={tenant.name}
    style={{ height: 40 }}
  />
)}
```

---

## 🐛 Troubleshooting

### Issue: "relation 'tenants' does not exist"
**Solution:** Run the migration script in Supabase SQL Editor

### Issue: "null value in column 'tenant_id'"
**Solution:** Make sure to include tenant_id when creating new records

### Issue: "permission denied for table tenants"
**Solution:** Check RLS policies are correctly set up, or temporarily disable RLS for testing

### Issue: Can't see data from other tenants
**This is expected!** Each tenant's data is isolated. To see data:
1. Log in as a user from that tenant, OR
2. Update your user's tenant_id in the database

### Issue: Migration fails with "duplicate key"
**Solution:** Migration already ran. Check if tenants table exists:
```sql
SELECT * FROM tenants;
```

---

## 📚 Next Steps

1. ✅ **Database Setup** - Complete (you're here!)
2. 🔄 **Update App Services** - Modify all Supabase queries
3. 🎨 **Implement Branding** - Add tenant-aware theming
4. 🌐 **Configure Routing** - Set up subdomain/path routing
5. 👥 **User Management** - Create tenant-specific user flows
6. 🚀 **Deploy** - Test with multiple tenants

---

## 🆘 Need Help?

Check these files for reference:
- `MULTI_TENANT_ARCHITECTURE.md` - Complete architecture details
- `IMPLEMENTATION_GUIDE.md` - Step-by-step implementation
- `database/multi-tenant-migration.sql` - Database migration script
- `fsm-react/src/store/tenantStore.ts` - Tenant state management
- `fsm-react/src/services/tenant.service.ts` - Tenant API operations

---

## ✨ Success Checklist

- [ ] Migration script executed successfully
- [ ] Tenants table created and populated
- [ ] All tables have tenant_id column
- [ ] RLS policies are active
- [ ] Default tenant exists
- [ ] Can create new tenants
- [ ] Can query tenant by slug
- [ ] Verified data isolation works

Once all items are checked, you're ready to integrate multi-tenancy into your application! 🎉

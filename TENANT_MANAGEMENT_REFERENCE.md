# 🏢 Tenant Management Quick Reference

## Quick Commands

### View All Tenants
```sql
SELECT id, name, slug, company_name, is_active, created_at 
FROM tenants 
ORDER BY created_at DESC;
```

### Get Tenant by Slug
```sql
SELECT * FROM tenants WHERE slug = 'acme';
```

### Create New Tenant
```sql
INSERT INTO tenants (name, slug, company_name, primary_color, secondary_color)
VALUES ('Acme', 'acme', 'Acme Corporation', '#FF5722', '#FFC107')
RETURNING *;
```

### Update Tenant Branding
```sql
UPDATE tenants 
SET 
  primary_color = '#3F51B5',
  secondary_color = '#00BCD4',
  logo_url = 'https://example.com/logo.png'
WHERE slug = 'acme';
```

### Activate/Deactivate Tenant
```sql
-- Deactivate
UPDATE tenants SET is_active = false WHERE slug = 'acme';

-- Activate
UPDATE tenants SET is_active = true WHERE slug = 'acme';
```

### Delete Tenant (⚠️ Careful!)
```sql
-- This will delete ALL data for this tenant due to CASCADE
DELETE FROM tenants WHERE slug = 'acme';
```

---

## User Management

### Create User for Specific Tenant
```sql
INSERT INTO users (phone, name, password, role, email, tenant_id)
VALUES (
  '+1234567890',
  'John Doe',
  'hashed_password',
  'salesman',
  'john@acme.com',
  (SELECT id FROM tenants WHERE slug = 'acme')
);
```

### Move User to Different Tenant
```sql
UPDATE users 
SET tenant_id = (SELECT id FROM tenants WHERE slug = 'techco')
WHERE phone = '+1234567890';
```

### List Users by Tenant
```sql
SELECT 
  u.name,
  u.phone,
  u.role,
  t.name as tenant_name
FROM users u
JOIN tenants t ON u.tenant_id = t.id
WHERE t.slug = 'acme'
ORDER BY u.created_at DESC;
```

---

## Data Statistics

### Count Records per Tenant
```sql
SELECT 
  t.name as tenant,
  t.slug,
  (SELECT COUNT(*) FROM users WHERE tenant_id = t.id) as users,
  (SELECT COUNT(*) FROM salesmen WHERE tenant_id = t.id) as salesmen,
  (SELECT COUNT(*) FROM customers WHERE tenant_id = t.id) as customers,
  (SELECT COUNT(*) FROM visits WHERE tenant_id = t.id) as visits,
  (SELECT COUNT(*) FROM products WHERE tenant_id = t.id) as products
FROM tenants t
ORDER BY t.created_at;
```

### Get Tenant with Most Activity
```sql
SELECT 
  t.name,
  t.slug,
  COUNT(v.id) as total_visits
FROM tenants t
LEFT JOIN visits v ON v.tenant_id = t.id
GROUP BY t.id, t.name, t.slug
ORDER BY total_visits DESC
LIMIT 5;
```

---

## Tenant Migration

### Move All Data from One Tenant to Another
```sql
-- Example: Move all customers from 'old-tenant' to 'new-tenant'
UPDATE customers 
SET tenant_id = (SELECT id FROM tenants WHERE slug = 'new-tenant')
WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'old-tenant');
```

### Clone Tenant Products
```sql
-- Copy all products from one tenant to another
INSERT INTO products (name, code, description, category, tenant_id, is_active)
SELECT 
  name, 
  code || '_copy', 
  description, 
  category, 
  (SELECT id FROM tenants WHERE slug = 'new-tenant'),
  is_active
FROM products 
WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'source-tenant');
```

---

## Common Queries

### Find Orphaned Records (No Tenant)
```sql
-- Check for users without tenant
SELECT * FROM users WHERE tenant_id IS NULL;

-- Check for customers without tenant
SELECT * FROM customers WHERE tenant_id IS NULL;
```

### Verify RLS Policies
```sql
-- List all policies on tenants table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'tenants';
```

### Check Tenant Size
```sql
-- Estimate storage per tenant
SELECT 
  t.name as tenant,
  pg_size_pretty(SUM(pg_total_relation_size(quote_ident(table_name)::text))) as total_size
FROM tenants t
CROSS JOIN information_schema.tables
WHERE table_schema = 'public'
GROUP BY t.id, t.name;
```

---

## Tenant Functions

### Get Tenant Configuration
```sql
-- Get tenant by slug
SELECT * FROM get_tenant_by_slug('acme');
```

### Create Tenant with Function
```sql
SELECT create_tenant(
  'New Company',        -- name
  'newco',             -- slug
  'New Company Inc',   -- company_name
  'info@newco.com',    -- contact_email
  '+1111111111',       -- contact_phone
  '#4CAF50',          -- primary_color
  '#FF9800'           -- secondary_color
);
```

---

## Backup & Restore

### Export Tenant Data
```sql
-- Export all customers for a tenant
COPY (
  SELECT * FROM customers 
  WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'acme')
) TO '/tmp/acme_customers.csv' CSV HEADER;
```

### Backup Tenant Configuration
```sql
-- Save tenant settings
SELECT 
  name,
  slug,
  company_name,
  logo_url,
  primary_color,
  secondary_color,
  contact_email,
  contact_phone
FROM tenants
WHERE slug = 'acme';
```

---

## Troubleshooting

### Reset Tenant Password Requirements
```sql
-- Force password reset for all users in a tenant
UPDATE users 
SET updated_at = NOW()
WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'acme');
```

### Fix Missing Tenant IDs
```sql
-- Assign default tenant to records without tenant_id
UPDATE customers 
SET tenant_id = (SELECT id FROM tenants WHERE slug = 'default')
WHERE tenant_id IS NULL;
```

### Clear Tenant Cache (if using caching)
```sql
-- Update tenant timestamp to invalidate cache
UPDATE tenants 
SET updated_at = NOW()
WHERE slug = 'acme';
```

---

## Security Checks

### Verify Data Isolation
```sql
-- Ensure no cross-tenant data leakage
SELECT 
  t1.slug as tenant1,
  t2.slug as tenant2,
  COUNT(*) as shared_customers
FROM customers c1
JOIN customers c2 ON c1.phone = c2.phone AND c1.id != c2.id
JOIN tenants t1 ON c1.tenant_id = t1.id
JOIN tenants t2 ON c2.tenant_id = t2.id
WHERE t1.id != t2.id
GROUP BY t1.slug, t2.slug;
```

### Check RLS Status
```sql
-- Verify RLS is enabled on all tables
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'tenants', 'customers', 'visits', 'products');
```

---

## Performance Optimization

### Rebuild Tenant Indexes
```sql
-- Rebuild indexes for better performance
REINDEX TABLE tenants;
REINDEX TABLE users;
REINDEX TABLE customers;
```

### Analyze Tenant Tables
```sql
-- Update statistics for query planner
ANALYZE tenants;
ANALYZE users;
ANALYZE customers;
ANALYZE visits;
ANALYZE products;
```

---

## Useful Views

### Create Tenant Summary View
```sql
CREATE OR REPLACE VIEW tenant_summary AS
SELECT 
  t.id,
  t.name,
  t.slug,
  t.company_name,
  t.is_active,
  COUNT(DISTINCT u.id) as total_users,
  COUNT(DISTINCT c.id) as total_customers,
  COUNT(DISTINCT v.id) as total_visits,
  MAX(v.created_at) as last_visit_date
FROM tenants t
LEFT JOIN users u ON u.tenant_id = t.id
LEFT JOIN customers c ON c.tenant_id = t.id
LEFT JOIN visits v ON v.tenant_id = t.id
GROUP BY t.id, t.name, t.slug, t.company_name, t.is_active;

-- Use it
SELECT * FROM tenant_summary ORDER BY total_visits DESC;
```

---

## 🎯 Quick Tips

1. **Always use slug for tenant lookup** - It's indexed and URL-friendly
2. **Never delete tenant_id** - It will break RLS
3. **Test with multiple tenants** - Ensure data isolation works
4. **Use transactions** - When creating tenant with initial data
5. **Monitor tenant size** - Set up alerts for large tenants
6. **Regular backups** - Backup tenant configurations
7. **Document customizations** - Keep track of tenant-specific changes

---

## 📞 Common API Patterns

### Fetch Tenant Config
```typescript
const { data: tenant } = await supabase
  .from('tenants')
  .select('*')
  .eq('slug', tenantSlug)
  .eq('is_active', true)
  .single();
```

### List Tenant Users
```typescript
const { data: users } = await supabase
  .from('users')
  .select('*')
  .eq('tenant_id', currentTenant.id)
  .order('created_at', { ascending: false });
```

### Create Tenant Record
```typescript
const { data, error } = await supabase
  .from('customers')
  .insert({
    name: 'John Doe',
    phone: '+1234567890',
    tenant_id: currentTenant.id  // ← Always include!
  })
  .select()
  .single();
```

---

## 🔗 Related Files

- `MULTITENANT_SETUP_GUIDE.md` - Complete setup instructions
- `MULTI_TENANT_ARCHITECTURE.md` - Architecture documentation
- `database/multi-tenant-migration.sql` - Migration script
- `setup-multitenant.html` - Interactive setup tool

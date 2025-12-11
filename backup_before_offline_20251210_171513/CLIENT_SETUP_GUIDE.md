# 🚀 Client Setup Guide - Hylite & Gazelle

## Deployment Status
**Date:** November 22, 2025  
**App URL:** https://sak-whatsapp-ai-sales-assist.wl.r.appspot.com  
**Database:** Multi-tenant enabled ✅

---

## 📋 Post-Deployment Checklist

### Step 1: Create Client Tenants in Database
Run this SQL in Supabase SQL Editor:

```sql
-- File: database/create-client-tenants.sql
-- This creates tenants for Hylite and Gazelle
```

### Step 2: Access URLs for Each Client

**Hylite:**
- URL: `https://sak-whatsapp-ai-sales-assist.wl.r.appspot.com/hylite`
- Slug: `hylite`
- Colors: Orange (#FF6B35) / Blue (#004E89)

**Gazelle:**
- URL: `https://sak-whatsapp-ai-sales-assist.wl.r.appspot.com/gazelle`
- Slug: `gazelle`
- Colors: Green (#2ECC71) / Red (#E74C3C)

**SAK Solution (Default):**
- URL: `https://sak-whatsapp-ai-sales-assist.wl.r.appspot.com/sak`
- Slug: `sak`
- Colors: Blue (#1976d2) / Pink (#dc004e)

---

## 👥 Create Users for Each Client

### For Hylite
```sql
-- Get Hylite tenant ID
SELECT id FROM tenants WHERE slug = 'hylite';

-- Create admin user for Hylite
INSERT INTO users (phone, name, password, role, email, tenant_id)
VALUES (
  '+91XXXXXXXXXX',  -- Update with actual phone
  'Hylite Admin',
  'hashed_password',  -- Update with hashed password
  'admin',
  'admin@hylite.com',
  (SELECT id FROM tenants WHERE slug = 'hylite')
);

-- Create salesman for Hylite
INSERT INTO salesmen (name, phone, email, tenant_id, is_active)
VALUES (
  'John Doe',
  '+91XXXXXXXXXX',
  'john@hylite.com',
  (SELECT id FROM tenants WHERE slug = 'hylite'),
  true
);
```

### For Gazelle
```sql
-- Get Gazelle tenant ID
SELECT id FROM tenants WHERE slug = 'gazelle';

-- Create admin user for Gazelle
INSERT INTO users (phone, name, password, role, email, tenant_id)
VALUES (
  '+91YYYYYYYYYY',  -- Update with actual phone
  'Gazelle Admin',
  'hashed_password',  -- Update with hashed password
  'admin',
  'admin@gazelle.com',
  (SELECT id FROM tenants WHERE slug = 'gazelle')
);

-- Create salesman for Gazelle
INSERT INTO salesmen (name, phone, email, tenant_id, is_active)
VALUES (
  'Jane Smith',
  '+91YYYYYYYYYY',
  'jane@gazelle.com',
  (SELECT id FROM tenants WHERE slug = 'gazelle'),
  true
);
```

---

## 🎨 Custom Branding (Optional)

### Upload Logos
```sql
-- Update Hylite logo
UPDATE tenants 
SET logo_url = 'https://your-cdn.com/hylite-logo.png'
WHERE slug = 'hylite';

-- Update Gazelle logo
UPDATE tenants 
SET logo_url = 'https://your-cdn.com/gazelle-logo.png'
WHERE slug = 'gazelle';
```

### Change Colors
```sql
-- Update Hylite colors
UPDATE tenants 
SET 
  primary_color = '#FF6B35',
  secondary_color = '#004E89'
WHERE slug = 'hylite';

-- Update Gazelle colors
UPDATE tenants 
SET 
  primary_color = '#2ECC71',
  secondary_color = '#E74C3C'
WHERE slug = 'gazelle';
```

---

## ✅ Verification Steps

### 1. Check Tenants Created
```sql
SELECT slug, company_name, is_active, created_at
FROM tenants
ORDER BY created_at;
```

Expected: 3 tenants (sak, hylite, gazelle)

### 2. Test Access
- Open: `https://sak-whatsapp-ai-sales-assist.wl.r.appspot.com/hylite`
- Should show Hylite branding
- Open: `https://sak-whatsapp-ai-sales-assist.wl.r.appspot.com/gazelle`
- Should show Gazelle branding

### 3. Test Login
- Each client's users can only see their own data
- Admin login should work with tenant-specific credentials

### 4. Verify Data Isolation
```sql
-- Check users per tenant
SELECT 
  t.slug,
  COUNT(u.id) as user_count
FROM tenants t
LEFT JOIN users u ON u.tenant_id = t.id
GROUP BY t.slug;

-- Check customers per tenant
SELECT 
  t.slug,
  COUNT(c.id) as customer_count
FROM tenants t
LEFT JOIN customers c ON c.tenant_id = t.id
GROUP BY t.slug;
```

---

## 🔒 Security Checklist

- ✅ RLS policies enabled on all tables
- ✅ Users can only access their tenant data
- ✅ Cross-tenant queries blocked at database level
- ✅ Each tenant has unique credentials

---

## 📱 Client Instructions

### For Hylite Team:
1. **Access URL:** https://sak-whatsapp-ai-sales-assist.wl.r.appspot.com/hylite
2. **Login:** Use your provided credentials
3. **Mobile App:** Download and configure with Hylite URL
4. **Support:** Contact admin for any issues

### For Gazelle Team:
1. **Access URL:** https://sak-whatsapp-ai-sales-assist.wl.r.appspot.com/gazelle
2. **Login:** Use your provided credentials
3. **Mobile App:** Download and configure with Gazelle URL
4. **Support:** Contact admin for any issues

---

## 🆘 Troubleshooting

### Issue: Can't access client URL
**Solution:** Make sure tenant is created in database

### Issue: Login fails
**Solution:** Check user has correct tenant_id assigned

### Issue: No data visible
**Solution:** Verify RLS policies are active and user has correct tenant_id

### Issue: Seeing other client's data
**Solution:** This should NOT happen - check RLS policies immediately

---

## 🎯 Go-Live Checklist

- [ ] Run `create-client-tenants.sql` in Supabase
- [ ] Create admin users for Hylite
- [ ] Create admin users for Gazelle
- [ ] Create salesmen for Hylite
- [ ] Create salesmen for Gazelle
- [ ] Test login for each client
- [ ] Verify data isolation works
- [ ] Upload custom logos (optional)
- [ ] Share access URLs with clients
- [ ] Provide login credentials to each client
- [ ] Set up monitoring and alerts

---

## 📊 Quick Stats Query

```sql
-- Get overview of all tenants
SELECT 
  t.slug as tenant,
  t.company_name,
  COUNT(DISTINCT u.id) as users,
  COUNT(DISTINCT s.id) as salesmen,
  COUNT(DISTINCT c.id) as customers,
  COUNT(DISTINCT v.id) as visits,
  t.is_active
FROM tenants t
LEFT JOIN users u ON u.tenant_id = t.id
LEFT JOIN salesmen s ON s.tenant_id = t.id
LEFT JOIN customers c ON c.tenant_id = t.id
LEFT JOIN visits v ON v.tenant_id = t.id
GROUP BY t.id, t.slug, t.company_name, t.is_active
ORDER BY t.created_at;
```

---

## 🎉 Success!

Your multi-tenant FSM app is now live with:
- ✅ **3 tenants:** SAK Solution, Hylite, Gazelle
- ✅ **Complete data isolation**
- ✅ **Custom branding per client**
- ✅ **Secure RLS policies**
- ✅ **Path-based routing**

**Go live tomorrow with confidence!** 🚀

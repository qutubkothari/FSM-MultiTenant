# Super Admin Self-Registration Guide

## Overview
This guide explains the new self-service registration flow where companies can sign up independently, create their tenant, and manage their organization.

## What Changed

### Before
- Admin manually created tenants in database
- Users were added by admin
- No self-service registration

### After
- Companies register themselves at `/register`
- Auto-creates tenant + super_admin user
- Super admins manage their tenant settings (logo, colors, language)
- Super admins can add users (salesmen, admins)

## Implementation Steps

### 1. Database Setup ✅ (COMPLETED)
Created `database/add-super-admin-support.sql` with:
- `default_language` column in `tenants` table (en, ar, hi)
- `preferred_language` column in `users` table
- `super_admin` role support
- Storage bucket for company logos
- Public registration policies (for tenant creation)

**ACTION REQUIRED:** Run this SQL in Supabase SQL Editor:
```bash
# Navigate to: https://ktvrffbccgxtaststlhw.supabase.co/project/_/sql
# Copy contents of database/add-super-admin-support.sql
# Execute the script
```

### 2. Registration Page ✅ (COMPLETED)
Created `fsm-react/src/pages/SuperAdminRegistration.tsx`:
- **Step 1:** Company Information
  - Company Name → auto-generates tenant slug
  - Checks for existing tenants
  
- **Step 2:** Super Admin Account
  - Admin Name
  - Mobile Number (10 digits)
  - Password (min 6 chars)
  - Confirms admin role and salesman creation
  
- **Step 3:** Preferences
  - Language selection (English/Arabic/Hindi)
  - Sets tenant default language
  - Sets user preferred language
  - Applies immediately after registration

### 3. Tenant Settings ✅ (COMPLETED)
Created `fsm-react/src/components/admin/TenantSettings.tsx`:
- **Company Logo Upload**
  - Accepts image files
  - Uploads to Supabase Storage
  - Public URL stored in tenant record
  
- **Brand Colors**
  - Primary Color picker
  - Secondary Color picker
  - Accent Color picker
  
- **Default Language**
  - Changes tenant-wide default
  - New users inherit this setting
  
- **Access Control:** Only super_admin role can access

### 4. Admin Dashboard Updates ✅ (COMPLETED)
Modified `fsm-react/src/pages/AdminDashboard.tsx`:
- Added "Settings" tab (visible only to super_admin)
- Imported `TenantSettings` component
- Added `SettingsIcon` to Material-UI imports
- Updated `TabType` to include 'settings'
- Conditionally renders settings menu item based on role

### 5. Login Page Updates ✅ (COMPLETED)
Modified `fsm-react/src/pages/LoginPage.tsx`:
- Changed "Register" link to "Register your company"
- Links to `/register` route instead of dialog
- Removed old registration dialog logic (kept for backward compatibility)

### 6. Route Configuration ✅ (COMPLETED)
Modified `fsm-react/src/App.tsx`:
- Added `/register` route
- Points to `SuperAdminRegistration` component
- Public route (no authentication required)

## Registration Flow

### User Journey
1. **Visit Registration Page:** `/register`
2. **Enter Company Info:** Company name (e.g., "Acme Corp" → slug: "acme-corp")
3. **Create Super Admin:** Name, phone, password
4. **Select Language:** English, Arabic, or Hindi
5. **Automatic Setup:**
   - Creates tenant record with slug
   - Creates super_admin user
   - Creates corresponding salesman record (for reports/targets)
   - Sets default language for tenant
   - Redirects to login page

### After Registration
1. **Login:** Use mobile number + password
2. **Access Settings:** Click Settings tab (super admin only)
3. **Upload Logo:** Company logo for branding
4. **Set Colors:** Customize brand colors
5. **Add Users:** Navigate to Salesmen/Customers tabs
6. **Set Targets:** Manage sales targets
7. **View Dashboard:** Filtered by tenant_id

## Technical Details

### Database Schema Changes
```sql
-- Tenants table
ALTER TABLE tenants ADD COLUMN default_language TEXT DEFAULT 'en';

-- Users table
ALTER TABLE users ADD COLUMN preferred_language TEXT DEFAULT 'en';

-- RLS Policies
CREATE POLICY "Allow public tenant registration"
  ON tenants FOR INSERT
  WITH CHECK (true);

-- Storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true);
```

### Registration API Flow
```typescript
// 1. Create Tenant
const { data: tenant } = await supabase
  .from('tenants')
  .insert({
    name: companyName,
    slug: slug,
    default_language: language,
  })
  .select()
  .single();

// 2. Create Super Admin User
const { data: user } = await supabase
  .from('users')
  .insert({
    tenant_id: tenant.id,
    phone: mobileNumber,
    password: hashedPassword,
    name: adminName,
    role: 'super_admin',
    preferred_language: language,
  })
  .select()
  .single();

// 3. Create Salesman Record (for reports)
await supabase
  .from('salesmen')
  .insert({
    tenant_id: tenant.id,
    user_id: user.id,
    name: adminName,
    phone: mobileNumber,
  });
```

### Logo Upload
```typescript
// Upload to Supabase Storage
const fileName = `${tenant.id}/${Date.now()}-${file.name}`;
const { data } = await supabase.storage
  .from('company-logos')
  .upload(fileName, file);

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('company-logos')
  .getPublicUrl(fileName);

// Update tenant
await supabase
  .from('tenants')
  .update({ logo_url: publicUrl })
  .eq('id', tenant.id);
```

## Deployment Steps

### 1. Run Database Migration
```bash
# Open Supabase SQL Editor
# Execute: database/add-super-admin-support.sql
```

### 2. Build React App
```powershell
cd fsm-react
npm run build
```

### 3. Copy Build to Deployment Directory
```powershell
# Delete old build
Remove-Item -Recurse -Force ..\dist-react\*

# Copy new build
Copy-Item -Recurse .\dist\* ..\dist-react\
```

### 4. Deploy to Google Cloud
```powershell
cd ..
gcloud app deploy --quiet
```

### 5. Verify Deployment
```bash
# Visit: https://sak-whatsapp-ai-sales-assist.wl.r.appspot.com/register
# Test registration flow
# Login with created account
# Access Settings tab
```

## Testing Checklist

- [ ] Database migration executed successfully
- [ ] `/register` route accessible
- [ ] Can complete 3-step registration
- [ ] Tenant created in database with correct slug
- [ ] Super admin user created with role
- [ ] Salesman record created
- [ ] Can login with created credentials
- [ ] Settings tab visible (super admin only)
- [ ] Can upload company logo
- [ ] Can change brand colors
- [ ] Can update default language
- [ ] Dashboard shows only tenant data
- [ ] Can add new salesmen
- [ ] Can add new customers

## Security Considerations

### Public Registration Policy
- Only allows INSERT on tenants table
- No UPDATE/DELETE/SELECT permissions
- Registration creates records but cannot read others

### Role-Based Access
- Settings tab: super_admin only
- Dashboard tabs: admin + super_admin
- Tenant data: Filtered by tenant_id (RLS)

### Password Security
- Frontend validation (min 6 chars)
- Stored as hashed value (bcrypt)
- No plain text passwords

## Multi-Language Support

### Available Languages
- **English (en):** Default
- **Arabic (ar):** RTL support
- **Hindi (hi):** LTR support

### Language Hierarchy
1. **User Preference:** Set during registration or in profile
2. **Tenant Default:** Set by super admin in Settings
3. **System Default:** English (fallback)

### Changing Language
```typescript
// Registration sets both
tenant.default_language = 'ar';
user.preferred_language = 'ar';

// User can override in profile
user.preferred_language = 'en'; // User sees English
tenant.default_language = 'ar'; // New users get Arabic
```

## Troubleshooting

### Registration Fails
- **Check:** Database migration ran successfully
- **Check:** Supabase RLS policies allow public insert
- **Check:** Storage bucket 'company-logos' exists
- **Check:** Tenant slug is unique

### Settings Tab Not Visible
- **Check:** User role is 'super_admin'
- **Check:** AdminDashboard has SettingsIcon import
- **Check:** menuItems includes settings conditionally

### Logo Upload Fails
- **Check:** Storage bucket is public
- **Check:** File size under 5MB
- **Check:** File type is image/*
- **Check:** User has super_admin role

### Dashboard Shows All Data
- **Check:** useTenantStore() is called
- **Check:** Queries have .eq('tenant_id', tenant.id)
- **Check:** RLS policies are active

## Next Steps

1. **Immediate:** Run database migration
2. **Build & Deploy:** Follow deployment steps above
3. **Test:** Complete testing checklist
4. **Production:** Create Hylite and Gazelle tenants via registration
5. **Monitor:** Check logs for any registration errors

## Support

### File Locations
- Registration Page: `fsm-react/src/pages/SuperAdminRegistration.tsx`
- Tenant Settings: `fsm-react/src/components/admin/TenantSettings.tsx`
- Admin Dashboard: `fsm-react/src/pages/AdminDashboard.tsx`
- Login Page: `fsm-react/src/pages/LoginPage.tsx`
- Database Migration: `database/add-super-admin-support.sql`

### Key Features
- Self-service registration ✅
- Multi-step wizard ✅
- Logo upload ✅
- Brand customization ✅
- Language preferences ✅
- Role-based access ✅
- Tenant isolation ✅

## Production Readiness

### Pre-Go-Live Checklist
- [ ] Database migration executed
- [ ] App rebuilt and deployed
- [ ] Registration tested end-to-end
- [ ] Settings page tested
- [ ] Logo upload tested
- [ ] Language switching tested
- [ ] Dashboard filtering verified
- [ ] RLS policies verified
- [ ] Storage permissions verified
- [ ] Mobile responsiveness checked

### Go-Live Plan (Tomorrow)
1. **Morning:** Run database migration, deploy app
2. **Test:** Complete registration for test company
3. **Verify:** All features working
4. **Create:** Hylite tenant via registration
5. **Create:** Gazelle tenant via registration
6. **Train:** Super admins on Settings page
7. **Monitor:** Check for errors/issues
8. **Support:** Be available for troubleshooting

---

**Status:** ✅ Code Complete - Ready for Database Migration & Deployment
**Last Updated:** 2024-11-22
**Deployment URL:** https://sak-whatsapp-ai-sales-assist.wl.r.appspot.com

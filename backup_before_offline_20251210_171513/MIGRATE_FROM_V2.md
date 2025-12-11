# Migration Plan: Add Multi-Tenant to Original FSM Project

## 🎯 Goal
Add multi-tenant features from FSM-MultiTenant-V2 to the original working FSM-MultiTenant project.

## 📊 Project Info
- **Original Project**: sak-fsm (339852309099)
- **Original URL**: https://sak-fsm.el.r.appspot.com
- **Original Supabase**: https://ktvrffbccgxtaststlhw.supabase.co
- **Original API Key**: sb_publishable_sNhpQ5W6i_KuIPcT6bjjnw_BcJwPljV

---

## ✅ Step 1: Database Setup (15 minutes)

### 1.1 Create Tenants Table
Go to Supabase SQL Editor and run:

```sql
-- Create tenants table
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#1976d2',
  secondary_color TEXT DEFAULT '#dc004e',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  CONSTRAINT tenants_pkey PRIMARY KEY (id)
);

-- Create default tenant
INSERT INTO public.tenants (id, name, slug, company_name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Company', 'default', 'Default Company')
ON CONFLICT DO NOTHING;
```

### 1.2 Phase 1: Add tenant_id Columns
```sql
-- Add tenant_id to salesmen
ALTER TABLE public.salesmen 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- Add tenant_id to visits
ALTER TABLE public.visits 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- Add tenant_id to products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- Add tenant_id to salesman_targets (if table exists)
ALTER TABLE public.salesman_targets 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
```

### 1.3 Phase 2: Migrate Existing Data
```sql
-- Migrate existing salesmen
UPDATE public.salesmen 
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

-- Migrate existing visits
UPDATE public.visits 
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

-- Migrate existing products
UPDATE public.products 
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

-- Migrate existing targets
UPDATE public.salesman_targets 
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;
```

### 1.4 Make tenant_id NOT NULL
```sql
ALTER TABLE public.salesmen ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.visits ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.products ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.salesman_targets ALTER COLUMN tenant_id SET NOT NULL;
```

### 1.5 Fresh Targets Table (OPTIONAL - only if target creation fails)
```sql
-- Run this ONLY if you have issues with salesman_targets
DROP TABLE IF EXISTS public.salesman_targets CASCADE;

CREATE TABLE public.salesman_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  salesman_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  visits_per_month INTEGER NULL DEFAULT 0,
  visits_per_day NUMERIC(5, 2) NULL DEFAULT 0,
  new_visits_per_month INTEGER NULL DEFAULT 0,
  repeat_visits_per_month INTEGER NULL DEFAULT 0,
  orders_per_month INTEGER NULL DEFAULT 0,
  order_value_per_month NUMERIC(12, 2) NULL DEFAULT 0,
  product_targets JSONB NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NULL DEFAULT now(),
  created_by UUID NULL,
  CONSTRAINT salesman_targets_pkey PRIMARY KEY (id),
  CONSTRAINT salesman_targets_salesman_id_month_year_tenant_key UNIQUE (salesman_id, month, year, tenant_id),
  CONSTRAINT salesman_targets_salesman_id_fkey FOREIGN KEY (salesman_id) REFERENCES salesmen (id) ON DELETE CASCADE
);

CREATE INDEX idx_targets_salesman ON public.salesman_targets (salesman_id);
CREATE INDEX idx_targets_tenant ON public.salesman_targets (tenant_id);
CREATE INDEX idx_targets_period ON public.salesman_targets (year, month);
```

---

## ✅ Step 2: Copy Code from V2 (10 minutes)

### Files to Copy from FSM-MultiTenant-V2 to FSM-MultiTenant:

1. **fsm-react/src/store/tenantStore.ts** (NEW FILE)
2. **fsm-react/src/store/authStore.ts** (OVERWRITE)
3. **fsm-react/src/services/supabase.ts** (OVERWRITE - then update credentials)
4. **fsm-react/vite.config.ts** (OVERWRITE - has timestamp fix)
5. **fsm-react/src/components/FastDashboard.tsx** (OVERWRITE)
6. **fsm-react/src/components/TargetsManagement.tsx** (OVERWRITE)
7. **fsm-react/src/components/SalesmenManagement.tsx** (OVERWRITE)
8. **fsm-react/src/components/ProductsManagement.tsx** (OVERWRITE)
9. **fsm-react/src/components/ReportsManagement.tsx** (OVERWRITE)
10. **fsm-react/src/components/NewVisitForm.tsx** (OVERWRITE)
11. **fsm-react/src/components/LoginPage.tsx** (OVERWRITE)
12. **.gcloudignore** (OVERWRITE - fixes node_modules upload issue)

---

## ✅ Step 3: Update Configuration (5 minutes)

### 3.1 Update fsm-react/.env
```env
VITE_SUPABASE_URL=https://ktvrffbccgxtaststlhw.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_sNhpQ5W6i_KuIPcT6bjjnw_BcJwPljV
```

### 3.2 Update fsm-react/src/services/supabase.ts
Change lines 4-6 to:
```typescript
// V2 Supabase Configuration - Cache Bust Build v2.1
export const CACHE_VERSION = 'v2.1.20251122'; 
const supabaseUrl = 'https://ktvrffbccgxtaststlhw.supabase.co';
const supabaseKey = 'sb_publishable_sNhpQ5W6i_KuIPcT6bjjnw_BcJwPljV';
```

---

## ✅ Step 4: Build & Deploy (5 minutes)

### 4.1 Build
```powershell
cd C:\Users\musta\OneDrive\Documents\GitHub\FSM-MultiTenant\fsm-react
npm install
npm run build
```

### 4.2 Copy to dist-react
```powershell
cd ..
if (Test-Path dist-react) { Remove-Item -Recurse -Force dist-react }
New-Item -ItemType Directory -Path dist-react
Copy-Item -Recurse -Force .\fsm-react\dist\* .\dist-react\
```

### 4.3 Deploy to sak-fsm
```powershell
gcloud config set project sak-fsm
gcloud app deploy --quiet
```

---

## ✅ Step 5: Test (5 minutes)

1. Open https://sak-fsm.el.r.appspot.com in incognito
2. Login with existing credentials
3. Check dashboard loads
4. Try creating a target
5. Verify no 401 errors

---

## 🎉 What You'll Have

After completing these steps:
- ✅ Multi-tenant database structure
- ✅ Automatic tenant selection on login
- ✅ Tenant isolation on all queries
- ✅ Target creation with tenant_id
- ✅ No cache issues (new domain, new filenames)
- ✅ All existing data preserved in default tenant

---

## 📞 Commands Reference

```powershell
# Switch to original project
cd C:\Users\musta\OneDrive\Documents\GitHub\FSM-MultiTenant

# Set gcloud project
gcloud config set project sak-fsm

# Build
cd fsm-react
npm run build

# Deploy
cd ..
gcloud app deploy --quiet

# Check deployment
gcloud app versions list
```

---

## 🆘 If Something Goes Wrong

1. **401 Errors**: Check supabase.ts has correct credentials hardcoded
2. **Target Creation Fails**: Run the fresh targets table SQL (Step 1.5)
3. **Build Fails**: Delete node_modules and run `npm install` again
4. **Deploy Fails**: Check you're in FSM-MultiTenant folder (not V2)

---

Generated: 2025-11-23

# FSM Multi-Tenant V2 Setup Guide

## Current Demo Version (DO NOT TOUCH)
- **Deployment**: https://sak-whatsapp-ai-sales-assist.wl.r.appspot.com
- **Project**: sak-whatsapp-ai-sales-assist
- **Database**: https://ktvrffbccgxtaststlhw.supabase.co
- **Directory**: FSM-MultiTenant
- **Status**: ✅ Working - Keep for demo

## New Development Version (V2)
- **Deployment**: https://sak-fsm.wl.r.appspot.com (after setup)
- **Project**: sak-fsm
- **Database**: NEW Supabase project (to be created)
- **Directory**: FSM-MultiTenant-V2
- **Purpose**: Multi-tenant with proper RLS and tenant isolation

---

## Setup Steps

### 1. Run Setup Script
```bash
cd C:\Users\musta\OneDrive\Documents\GitHub
setup-fsm-v2.bat
```

This will:
- Copy entire FSM-MultiTenant to FSM-MultiTenant-V2
- Switch gcloud project to sak-fsm

### 2. Create New Supabase Project
1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Name: `FSM-MultiTenant-V2`
4. Database Password: (save this securely)
5. Region: Choose closest to your users
6. Wait for project creation (~2 minutes)

### 3. Get Supabase Credentials
From your new Supabase project:
1. Go to Settings → API
2. Copy **Project URL** (e.g., https://xxxxx.supabase.co)
3. Copy **anon public key**

### 4. Update V2 Configuration

#### Update `.env` file:
```bash
cd FSM-MultiTenant-V2\fsm-react
notepad .env
```

Replace with:
```
VITE_SUPABASE_URL=https://YOUR_NEW_PROJECT_URL.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_NEW_ANON_KEY
```

#### Update `supabase.ts`:
```bash
notepad src\services\supabase.ts
```

Change line 3:
```typescript
const supabaseUrl = 'https://YOUR_NEW_PROJECT_URL.supabase.co';
```

### 5. Setup New Database Schema
1. Go to your new Supabase project → SQL Editor
2. Run these SQL files in order:

```sql
-- 1. Create tables
-- Copy content from: database/schema.sql

-- 2. Add multi-tenant support
-- Copy content from: database/multi-tenant-migration.sql

-- 3. Disable RLS (for now)
-- Copy content from: database/disable-all-rls.sql

-- 4. Add super admin support
-- Copy content from: database/add-super-admin-support.sql
```

### 6. Build and Deploy V2
```bash
cd C:\Users\musta\OneDrive\Documents\GitHub\FSM-MultiTenant-V2

# Build React app
cd fsm-react
npm install
npm run build

# Copy to dist-react
cd ..
Remove-Item -Path dist-react\* -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item -Path fsm-react\dist\* -Destination dist-react\ -Recurse -Force

# Deploy to sak-fsm
gcloud app deploy --quiet
```

### 7. Access V2
After deployment completes:
- URL will be: https://sak-fsm.wl.r.appspot.com
- Register as super admin
- Test multi-tenant features

---

## Development Workflow

### Working on V2:
```bash
cd C:\Users\musta\OneDrive\Documents\GitHub\FSM-MultiTenant-V2
# Make changes
# Test locally
# Deploy to sak-fsm
```

### Demo Version (V1):
```bash
cd C:\Users\musta\OneDrive\Documents\GitHub\FSM-MultiTenant
# Only touch for emergency fixes during demo
# Deploys to sak-whatsapp-ai-sales-assist
```

---

## Post-Demo Migration Plan

Once V2 is stable with proper tenant isolation:

1. **Copy V2 database** to production
2. **Switch DNS** (fsm.saksolution.com) to point to V2
3. **Migrate users** from V1 to V2
4. **Decommission V1** after confirming V2 works

---

## Key Differences V1 vs V2

| Feature | V1 (Demo) | V2 (Production) |
|---------|-----------|-----------------|
| Tenant Filtering | ❌ Removed (all data visible) | ✅ Proper tenant_id filtering |
| RLS | ❌ Disabled | ✅ Configured properly |
| Database | Old Supabase | Fresh Supabase |
| Purpose | Demo only | Production ready |
| URL | sak-whatsapp-ai-sales-assist | sak-fsm |

---

## Troubleshooting

### Build fails in V2:
```bash
cd FSM-MultiTenant-V2\fsm-react
npm install
npm run build
```

### Deploy fails:
```bash
gcloud config set project sak-fsm
gcloud app deploy --quiet
```

### Database connection issues:
- Verify Supabase URL and key in `.env` and `supabase.ts`
- Check Supabase project is running
- Verify RLS is disabled (for testing)

---

## Notes
- Keep V1 running until demo is complete
- Work only in V2 for development
- Don't mix up the two projects!
- V2 database is completely separate from V1

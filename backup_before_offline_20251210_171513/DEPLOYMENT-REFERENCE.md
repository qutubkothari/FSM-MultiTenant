# FSM Deployment Reference Guide

## 🎯 Project Structure

### **PRODUCTION** (Live - Customer Facing)
- **Project ID**: `sak-fsm`
- **URL**: https://fsm.saksolution.com (Custom Domain)
- **Alt URL**: https://sak-fsm.el.r.appspot.com
- **Database**: Supabase `ktvrffbccgxtaststlhw`
- **Database URL**: https://ktvrffbccgxtaststlhw.supabase.co
- **Deploy Script**: `deploy.bat` (LOCKED to sak-fsm)
- **Status**: No tenant filtering (demo mode)
- **Latest Version**: 20251122t130706

### **V2 DEVELOPMENT** (Testing - Multi-tenant)
- **Project ID**: `sak-fsm-v2`
- **URL**: https://sak-fsm-v2.el.r.appspot.com
- **Database**: Supabase `pjnfkgxxlesfmpwsntto`
- **Database URL**: https://pjnfkgxxlesfmpwsntto.supabase.co
- **Deploy Script**: `deploy-v2.bat` (LOCKED to sak-fsm-v2)
- **Status**: Ready to deploy with proper multi-tenant
- **Code Location**: C:\Users\musta\OneDrive\Documents\GitHub\FSM-MultiTenant-V2

### **WRONG PROJECT** (⚠️ DO NOT USE)
- **Project ID**: `sak-whatsapp-ai-sales-assist`
- **URL**: https://sak-whatsapp-ai-sales-assist.wl.r.appspot.com
- **Note**: This was used by mistake earlier - AVOID

---

## 🚀 Deployment Commands

### Deploy to PRODUCTION (sak-fsm)
```powershell
cd C:\Users\musta\OneDrive\Documents\GitHub\FSM-MultiTenant
.\deploy.bat
```
- Script is **LOCKED** to `sak-fsm`
- Will show project list and require "YES" confirmation
- Automatically builds and deploys
- Cannot deploy to wrong project

### Deploy to V2 DEVELOPMENT (sak-fsm-v2)
```powershell
cd C:\Users\musta\OneDrive\Documents\GitHub\FSM-MultiTenant-V2
.\deploy-v2.bat
```
- Script is **LOCKED** to `sak-fsm-v2`
- Will verify project before deploying
- Has extensive safety checks

### Manual Build + Deploy (if needed)
```powershell
# 1. Build
cd C:\Users\musta\OneDrive\Documents\GitHub\FSM-MultiTenant\fsm-react
npm run build

# 2. Copy files
cd ..
Remove-Item -Path dist-react\* -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item -Path fsm-react\dist\* -Destination dist-react\ -Recurse -Force

# 3. Deploy to PRODUCTION
gcloud config set project sak-fsm
gcloud app deploy --quiet --project=sak-fsm
```

---

## 🗄️ Database Access

### Production Database (ktvrffbccgxtaststlhw)
- **SQL Editor**: https://supabase.com/dashboard/project/ktvrffbccgxtaststlhw/sql
- **Table Editor**: https://supabase.com/dashboard/project/ktvrffbccgxtaststlhw/editor
- **Configuration**: fsm-react/src/services/supabase.ts

### V2 Database (pjnfkgxxlesfmpwsntto)
- **SQL Editor**: https://supabase.com/dashboard/project/pjnfkgxxlesfmpwsntto/sql
- **Table Editor**: https://supabase.com/dashboard/project/pjnfkgxxlesfmpwsntto/editor
- **Configuration**: FSM-MultiTenant-V2/fsm-react/src/services/supabase.ts

---

## ⚡ Quick Reference

### Check Current GCP Project
```powershell
gcloud config get-value project
```

### Switch to Production Project
```powershell
gcloud config set project sak-fsm
```

### Switch to V2 Project
```powershell
gcloud config set project sak-fsm-v2
```

### View Deployed Versions
```powershell
gcloud app versions list --project=sak-fsm
```

### View App URL
```powershell
gcloud app browse --no-launch-browser --project=sak-fsm
```

---

## 📋 Current Status (Nov 22, 2025)

### Production (sak-fsm)
- ✅ Deployed version 20251122t130706
- ✅ Dashboard working
- ✅ Salesmen management working (4 salesmen)
- ✅ Products management working
- ✅ Customers management working
- ⚠️ Targets tab - requires `salesman_targets` table (SQL fix ready)
- ✅ No tenant filtering (shows all data for demo)

### V2 Development (sak-fsm-v2)
- ✅ GCP project created
- ✅ App Engine initialized
- ✅ Supabase database created
- ✅ Code copied and configured
- ⏳ Database schema not yet initialized
- ⏳ Not yet deployed

---

## 🔧 Emergency Fixes

### Missing salesman_targets Table
**File**: `database/EMERGENCY-CREATE-TARGETS-TABLE.sql`
**Run in**: https://supabase.com/dashboard/project/ktvrffbccgxtaststlhw/sql

### Fix RLS Issues
**File**: `database/FIX-TARGETS-RLS-FINAL.sql`
**Run in**: Production Supabase after table exists

### Complete V2 Schema
**File**: `database/V2-FULL-PRODUCTION-SCHEMA.sql`
**Run in**: https://supabase.com/dashboard/project/pjnfkgxxlesfmpwsntto/sql

---

## 🎯 Next Steps

1. **Immediate** (Before Demo):
   - Run `EMERGENCY-CREATE-TARGETS-TABLE.sql` in production
   - Test Targets tab at fsm.saksolution.com
   - Verify all management tabs working

2. **After Demo**:
   - Initialize V2 database (run V2-FULL-PRODUCTION-SCHEMA.sql)
   - Deploy V2 project with multi-tenant
   - Test tenant isolation in V2
   - Migrate production to multi-tenant when stable

---

## ⚠️ Important Notes

1. **Always verify the active project** before deploying:
   ```powershell
   gcloud config get-value project
   ```

2. **Use the locked deployment scripts**:
   - `deploy.bat` → Always goes to `sak-fsm` (production)
   - `deploy-v2.bat` → Always goes to `sak-fsm-v2` (development)

3. **Never manually type project names** - use the scripts to avoid typos

4. **Production is demo mode** - no tenant filtering, shows all data

5. **V2 will have proper tenant isolation** - for future production use

---

## 📞 Support

- Demo Clients: Hylite Industries, Gazelle Corporation
- Demo Date: November 23, 2025
- Production URL: https://fsm.saksolution.com

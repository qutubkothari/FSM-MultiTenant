# Multi-Tenant FSM - Google Cloud Deployment Guide

## 🚀 Quick Deployment Steps

### Prerequisites
- ✅ Git initialized and committed
- ✅ GitHub repository ready (see GITHUB_SETUP.md)
- ✅ Google Cloud SDK installed (`gcloud` command available)
- ⚠️ Supabase database migration pending (see below)

### Step 1: Push to GitHub

```bash
# Navigate to project
cd C:\Users\musta\OneDrive\Documents\GitHub\FSM-MultiTenant

# Create GitHub repo at: https://github.com/new
# Repository name: FSM-MultiTenant
# Then push:
git push -u origin main
```

### Step 2: Run Database Migration

**CRITICAL: Run this in Supabase SQL Editor FIRST**

```bash
# Open: https://supabase.com/dashboard/project/ktvrffbccgxtaststlhw/sql
# Copy and execute: database/multi-tenant-migration.sql
```

This will:
- Create `tenants` table
- Add `tenant_id` to all existing tables  
- Set up Row Level Security (RLS)
- Create default tenant
- Backfill existing data

### Step 3: Build React App

```bash
cd fsm-react
npm install
npm run build
```

### Step 4: Deploy to Google Cloud

```bash
cd ..

# Copy build to dist-react
Remove-Item -Recurse -Force dist-react -ErrorAction SilentlyContinue
Copy-Item -Recurse fsm-react\dist dist-react

# Deploy with multi-tenant config
gcloud app deploy app-react-multitenant.yaml --quiet --project sak-fsm
```

### Step 5: Verify Deployment

Visit: https://sak-fsm.el.r.appspot.com

You should see the tenant selection page!

---

## 🔧 Detailed Deployment Commands

### Option A: Quick Deployment (All in One)

```powershell
# Full deployment script
cd C:\Users\musta\OneDrive\Documents\GitHub\FSM-MultiTenant

# Build
cd fsm-react
npm install
npm run build
cd ..

# Deploy
Remove-Item -Recurse -Force dist-react -ErrorAction SilentlyContinue
Copy-Item -Recurse fsm-react\dist dist-react
gcloud app deploy app-react-multitenant.yaml --quiet --project sak-fsm

Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host "🌐 Visit: https://sak-fsm.el.r.appspot.com" -ForegroundColor Cyan
```

### Option B: Step-by-Step Deployment

```powershell
# Step 1: Install dependencies
cd fsm-react
npm install

# Step 2: Build React app
npm run build

# Step 3: Verify build
Get-ChildItem dist

# Step 4: Copy to deployment folder
cd ..
Remove-Item -Recurse -Force dist-react -ErrorAction SilentlyContinue
Copy-Item -Recurse fsm-react\dist dist-react

# Step 5: Verify dist-react
Get-ChildItem dist-react

# Step 6: Deploy to App Engine
gcloud app deploy app-react-multitenant.yaml --project sak-fsm

# Step 7: Open in browser
Start-Process "https://sak-fsm.el.r.appspot.com"
```

---

## 📦 What Gets Deployed

```
FSM-MultiTenant/
├── dist-react/              ← Deployed to App Engine
│   ├── index.html
│   ├── assets/
│   │   ├── index-[hash].js  ← React app bundle
│   │   ├── mui-vendor-[hash].js
│   │   └── react-vendor-[hash].js
│   ├── manifest.webmanifest
│   └── registerSW.js
└── app-react-multitenant.yaml  ← Deployment config
```

---

## 🌐 Deployment Configuration

### Current Setup
- **Project**: sak-fsm
- **Service**: default
- **URL**: https://sak-fsm.el.r.appspot.com
- **Runtime**: Python 3.12
- **Mode**: Path-based routing (`/tenant-slug/...`)

### Environment Variables
```yaml
VITE_SUPABASE_URL: https://ktvrffbccgxtaststlhw.supabase.co
VITE_SUPABASE_ANON_KEY: [your-anon-key]
VITE_MULTI_TENANT_MODE: path
VITE_BASE_DOMAIN: sak-fsm.el.r.appspot.com
```

---

## 🔍 Post-Deployment Verification

### 1. Check Deployment Status
```bash
gcloud app versions list --project sak-fsm
```

### 2. View Logs
```bash
gcloud app logs tail --project sak-fsm
```

### 3. Test Tenant Routes
- Main app: https://sak-fsm.el.r.appspot.com
- Tenant selection: https://sak-fsm.el.r.appspot.com/select-tenant
- Create tenant: https://sak-fsm.el.r.appspot.com/create-tenant
- Example tenant: https://sak-fsm.el.r.appspot.com/acme/login

### 4. Test Features
- [ ] Create new tenant
- [ ] Upload tenant logo
- [ ] Change tenant colors
- [ ] Register admin user
- [ ] Register salesman
- [ ] Create visit
- [ ] Verify data isolation

---

## 🚨 Troubleshooting

### Build Fails
```bash
# Clear node_modules and rebuild
cd fsm-react
Remove-Item -Recurse -Force node_modules
npm install
npm run build
```

### Deployment Fails
```bash
# Check gcloud authentication
gcloud auth list

# Re-authenticate if needed
gcloud auth login

# Check project
gcloud config get-value project

# Set project
gcloud config set project sak-fsm
```

### App Not Loading
1. Check browser console for errors
2. Verify Supabase credentials in app-react-multitenant.yaml
3. Check App Engine logs: `gcloud app logs tail`

### Database Errors
1. Verify migration was run in Supabase
2. Check RLS policies are enabled
3. Verify tenant_id columns exist

---

## 🔄 Updating Deployment

### Update Code
```bash
# Make changes to code
cd fsm-react
# ... edit files ...

# Rebuild and redeploy
npm run build
cd ..
Remove-Item -Recurse -Force dist-react
Copy-Item -Recurse fsm-react\dist dist-react
gcloud app deploy app-react-multitenant.yaml --quiet --project sak-fsm
```

---

**Last Updated**: November 22, 2025  
**Version**: 1.0.0  
**Status**: Ready for deployment ✅

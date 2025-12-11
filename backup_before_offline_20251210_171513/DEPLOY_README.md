# FSM Mobile App - Deployment Guide

## 🚀 Automated Deployment Scripts Created

### ✅ **deploy.bat** (Windows)
- Safe deployment with project verification
- Lists all your Google Cloud projects
- Asks you to select the correct project
- **Verifies before deploying** to prevent overwriting other projects
- Shows final project confirmation

### ✅ **deploy.sh** (Linux/Mac)
- Same features as deploy.bat for Unix systems

### ✅ **build-apk.bat** (Windows)
- Automated Android APK build
- Installs EAS CLI if needed
- Handles Expo login
- Builds production APK

## 📝 How to Use Deployment Scripts

### Step 1: Install Google Cloud SDK

**Windows:**
1. Download from: https://cloud.google.com/sdk/docs/install
2. Run the installer
3. Open new PowerShell window
4. Verify: `gcloud --version`

**Linux/Mac:**
```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
gcloud init
```

### Step 2: Setup Google Cloud Project

```powershell
# List your projects
gcloud projects list

# Note down your FSM project ID
```

### Step 3: Deploy Admin Dashboard

**Windows:**
```powershell
cd C:\Users\musta\OneDrive\Documents\GitHub\FSM
.\deploy.bat
```

**What the script does:**
1. ✅ Checks if gcloud is installed
2. ✅ Shows current project
3. ✅ Lists ALL your projects
4. ✅ Asks you to enter FSM project ID
5. ✅ Sets the project
6. ✅ Asks for confirmation
7. ✅ Deploys ONLY to confirmed project
8. ✅ Verifies project after deployment
9. ✅ Shows deployed URL

**Safety Features:**
- Never deploys without confirmation
- Shows project before and after deployment
- Lists all projects so you can choose correctly
- Clear error messages
- Color-coded output (green=success, red=error, yellow=warning)

### Step 4: Build Android APK

```powershell
.\build-apk.bat
```

This will:
1. Install EAS CLI if needed
2. Login to Expo
3. Build production APK
4. Provide download link

## 🔧 Manual Deployment (If Scripts Don't Work)

### Admin Dashboard to Google Cloud

```powershell
# 1. Check current project
gcloud config get-value project

# 2. List all projects
gcloud projects list

# 3. Set correct project
gcloud config set project YOUR-FSM-PROJECT-ID

# 4. Verify
gcloud config get-value project

# 5. Deploy
gcloud app deploy

# 6. View
gcloud app browse /admin
```

### Build APK Manually

```powershell
# 1. Install EAS CLI
npm install -g eas-cli

# 2. Login
eas login

# 3. Configure (first time only)
eas build:configure

# 4. Build
eas build --platform android --profile production

# 5. Download from Expo dashboard
# Visit: https://expo.dev
```

## ⚙️ Configuration Files

### app.yaml (Google Cloud App Engine)
- Runtime: Node.js 18
- Auto-scaling: 1-10 instances
- Serves admin dashboard at /admin
- Static file hosting configured

### eas.json (APK Build)
- Development, preview, and production profiles
- Configured for APK output (not AAB)
- Ready for distribution

## 🗂️ Database Setup

### Option 1: Supabase (Recommended - No Postgres Needed!)

1. Go to https://supabase.com/dashboard
2. Your project: `ktvrffbccgxtaststlhw`
3. Click "SQL Editor"
4. Run `database/schema.sql`
5. Done! (Uses REST API, no direct Postgres connection needed)

### Verification

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check sample products
SELECT * FROM products;

-- Check views
SELECT * FROM salesman_performance;
```

## 📱 Mobile App Development

### Start Development Server

```powershell
npm start
```

Then:
- Press `a` for Android
- Press `i` for iOS
- Press `w` for web
- Scan QR with Expo Go app on phone

### Test on Physical Device

1. Install "Expo Go" from Play Store/App Store
2. Run `npm start`
3. Scan QR code
4. App loads in Expo Go

## 🐛 Troubleshooting

### "gcloud command not found"
- Install Google Cloud SDK
- Restart terminal
- Run `gcloud init`

### "Project not found"
- Run `gcloud projects list`
- Use exact project ID
- Check you have access to the project

### "Build failed"
- Check internet connection
- Verify Expo account
- Run `eas login` again
- Try `eas build:configure` first

### "Dependencies error"
- Delete `node_modules` folder
- Delete `package-lock.json`
- Run `npm install` again

### "Supabase connection error"
- Check credentials in `App.tsx`
- Check credentials in `admin/index.html`
- Verify Supabase project is active
- Check RLS policies are set up

## 📊 Monitoring

### View App Logs (Google Cloud)
```powershell
gcloud app logs tail -s default
```

### View Admin Dashboard
```
https://YOUR-PROJECT-ID.appspot.com/admin
```

### Check Build Status
```
https://expo.dev/accounts/[your-account]/projects/fsm-mobile-app/builds
```

## 🔄 Updates & Maintenance

### Update Admin Dashboard
1. Edit `admin/index.html`
2. Run `.\deploy.bat`
3. Confirm deployment
4. Changes live immediately

### Update Mobile App
1. Make changes to source code
2. Test with `npm start`
3. Build new APK: `.\build-apk.bat`
4. Distribute new APK to users

### Update Database
1. Write migration SQL
2. Test on staging first
3. Run in Supabase SQL Editor
4. Verify with test queries

## 🎯 Project ID Safety Checklist

Before deployment:
- [ ] Ran `gcloud projects list`
- [ ] Identified correct FSM project ID
- [ ] Verified current project with `gcloud config get-value project`
- [ ] Confirmed deployment target
- [ ] Checked project after deployment

## 📞 Support Commands

```powershell
# Check gcloud version
gcloud --version

# Check current project
gcloud config get-value project

# List all configurations
gcloud config list

# Check app engine services
gcloud app services list

# View project details
gcloud projects describe PROJECT-ID

# Check npm version
npm --version

# Check node version
node --version

# Check Expo CLI
npx expo --version
```

## ✨ Quick Reference

| Task | Command |
|------|---------|
| Deploy Admin | `.\deploy.bat` |
| Build APK | `.\build-apk.bat` |
| Start Dev | `npm start` |
| Check Project | `gcloud config get-value project` |
| List Projects | `gcloud projects list` |
| View Logs | `gcloud app logs tail` |

---

**All deployment scripts include safety checks to prevent accidentally overwriting other projects!**

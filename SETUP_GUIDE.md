# FSM Mobile App - Setup Guide

## Quick Start Guide

### For Developers

#### 1. Initial Setup (5 minutes)
```bash
# Install dependencies
npm install

# Copy environment template
copy .env.example .env

# Edit .env with your credentials
notepad .env
```

#### 2. Database Setup (10 minutes)
1. Go to https://supabase.com
2. Create new project
3. Go to SQL Editor
4. Copy contents of `database/schema.sql`
5. Execute the SQL
6. Go to Settings → API
7. Copy URL and anon key to `.env`

#### 3. Run the App (2 minutes)
```bash
npm start
```
- Press `a` for Android emulator
- Press `i` for iOS simulator  
- Scan QR code with Expo Go app on your phone

### For End Users (Salesmen)

#### Installing the App

**Option 1: Direct APK Install (Recommended)**
1. Download FSM_App.apk from the shared link
2. Open the file on your Android phone
3. Allow "Install from unknown sources" if prompted
4. Complete installation

**Option 2: Expo Go (For Testing)**
1. Install "Expo Go" from Play Store
2. Scan QR code provided by admin
3. App will load in Expo Go

#### First Time Login
1. Open FSM Mobile App
2. Enter your mobile number (e.g., 9876543210)
3. Enter your name (first time only)
4. Tap "Login"

#### Recording Your First Visit
1. Tap the big "New Visit" button
2. Fill in customer details:
   - Customer name (start typing, suggestions will appear)
   - Contact person (optional)
   - Tick meeting type(s)
   - Select products discussed
   - Choose potential level
   - Add any notes
3. Tap "Submit Visit"
4. Done! Visit recorded with GPS location

#### Offline Mode
- App works without internet
- Visits are saved locally
- Auto-syncs when you have internet
- Check "Pending Sync" count on home screen

## Admin Dashboard Setup

### Accessing the Dashboard

**Development:**
Open `admin/index.html` in Chrome/Firefox

**Production (Google Cloud):**
1. Visit: https://your-project.appspot.com/admin
2. View all visits
3. Filter by date/salesman
4. Export to Excel

### Exporting Reports

1. Select date range
2. Choose salesman (optional)
3. Click "Filter"
4. Click "Export to Excel"
5. Excel file downloads automatically

### Report Columns
- Date, Salesman, Customer, Meeting Type
- Products, Next Action, Potential
- Competitor, Remarks, GPS, Time In/Out

## Troubleshooting

### Mobile App Issues

**"Cannot connect to server"**
- Check internet connection
- Verify Supabase URL in App.tsx
- App works offline - visits will sync later

**"GPS location not available"**
- Enable Location Services
- Grant location permission to app
- Go outdoors for better GPS signal

**"Login failed"**
- Check internet connection
- Verify phone number format
- Provide name on first login

**"Visit not syncing"**
- Check internet connection
- Tap "Sync" button manually
- Check pending count - it will auto-sync

### Admin Dashboard Issues

**"No visits showing"**
- Check date range filter
- Verify Supabase credentials in index.html
- Check browser console for errors

**"Excel export not working"**
- Use modern browser (Chrome, Firefox, Edge)
- Disable popup blocker
- Check if visits are loaded

### Database Issues

**"Cannot connect to database"**
- Verify Supabase project is active
- Check API keys are correct
- Ensure RLS policies are set up

## Configuration

### Update Supabase Credentials

**Mobile App (`App.tsx`):**
```typescript
initializeEnv({
  SUPABASE_URL: 'https://xxxx.supabase.co',
  SUPABASE_ANON_KEY: 'your-key-here',
});
```

**Admin Dashboard (`admin/index.html`):**
```javascript
const SUPABASE_URL = 'https://xxxx.supabase.co';
const SUPABASE_KEY = 'your-key-here';
```

### Add Products

1. Login to Supabase dashboard
2. Go to Table Editor → products
3. Click "Insert row"
4. Fill: name, code, category
5. Set is_active = true
6. Save

Products appear immediately in mobile app!

### Add Salesman

Option 1: First login creates account automatically
Option 2: Manual add in Supabase:
1. Table Editor → salesmen
2. Insert: name, phone, is_active=true

## Building Production APK

### Prerequisites
```bash
npm install -g eas-cli
eas login
```

### Build Steps
```bash
# Configure (first time only)
eas build:configure

# Build APK
eas build --platform android --profile production

# Wait 10-15 minutes
# Download APK from expo.dev
```

### Distribution
1. Download APK from Expo dashboard
2. Upload to Google Drive / Dropbox
3. Share link with team
4. Or host on internal server

## Deployment

### Google Cloud App Engine

```bash
# Install Google Cloud SDK
# https://cloud.google.com/sdk/docs/install

# Login
gcloud auth login

# Deploy
gcloud app deploy

# View
gcloud app browse /admin
```

### AWS VPS (Future)

See `DEPLOYMENT.md` for:
- Docker setup
- Nginx configuration
- PostgreSQL migration
- SSL setup

## Support Checklist

Before contacting support:
- [ ] Checked internet connection
- [ ] Verified credentials in config files
- [ ] Reviewed this troubleshooting guide
- [ ] Checked browser/app console for errors
- [ ] Tried on different device/browser

## Contact

For technical support:
- Email: support@yourcompany.com
- Phone: +91-XXXXXXXXXX
- Check README.md for detailed docs

## Quick Reference

### Common Commands
```bash
# Install
npm install

# Run dev
npm start

# Build APK
eas build -p android

# Deploy admin
gcloud app deploy

# View logs
gcloud app logs tail
```

### Important Files
- `App.tsx` - Update Supabase keys
- `admin/index.html` - Update Supabase keys
- `database/schema.sql` - Database structure
- `.env.example` - Environment template

### Default Passwords
- Database: Set in Supabase dashboard
- Admin panel: No login (uses Supabase RLS)
- Salesman: Phone number only

## Updates & Maintenance

### Updating the Mobile App
1. Make changes to code
2. Build new APK: `eas build -p android`
3. Distribute new APK to users
4. Users reinstall app

### Updating Admin Dashboard
1. Edit `admin/index.html`
2. Deploy: `gcloud app deploy`
3. Changes live immediately

### Database Updates
1. Backup: `pg_dump ...`
2. Run migration SQL
3. Test on staging first
4. Apply to production

### Adding New Features
1. Update mobile code
2. Update database schema if needed
3. Update admin dashboard if needed
4. Build and test
5. Deploy all components

# Multi-Timezone Deployment Guide

## Problem
Different companies need summaries at 6 PM in their local timezone:
- **Gazelle companies**: 6 PM Egypt Time (Africa/Cairo) - Weekend: Friday-Saturday
- **Hylite**: 6 PM India Time (Asia/Kolkata) - Weekend: Saturday-Sunday
- **Crescent**: 6 PM India Time (Asia/Kolkata) - Weekend: Saturday-Sunday

## Solution
Create **2 Cloud Scheduler jobs** (one per timezone):

### Step 1: Update Database with Timezone Config
```bash
# Run this SQL in Supabase
database/add-timezone-config.sql
```

### Step 2: Deploy Updated Server
```powershell
# Backup current server
Copy-Item cron-server.js cron-server-v1-backup.js

# Use new version
Copy-Item cron-server-v2.js cron-server.js

# Deploy to App Engine
gcloud app deploy app-whatsapp-cron.yaml --quiet
```

### Step 3: Create Timezone-Specific Cron Jobs

**Job 1: Egypt Time (3:30 PM UTC = 6:00 PM Egypt)**
```powershell
gcloud scheduler jobs create app-engine egypt-daily-summary `
  --schedule="30 15 * * *" `
  --time-zone="Africa/Cairo" `
  --service="whatsapp-cron" `
  --http-method="GET" `
  --relative-url="/cron/send-daily-summaries" `
  --description="Egypt companies at 6 PM Cairo time"
```

**Job 2: India Time (12:30 PM UTC = 6:00 PM IST)**
```powershell
gcloud scheduler jobs create app-engine india-daily-summary `
  --schedule="30 12 * * *" `
  --time-zone="Asia/Kolkata" `
  --service="whatsapp-cron" `
  --http-method="GET" `
  --relative-url="/cron/send-daily-summaries" `
  --description="India companies at 6 PM IST"
```

### Step 4: Delete Old Job
```powershell
gcloud scheduler jobs delete daily-whatsapp-summary
```

## How It Works

1. **Egypt job runs at 6 PM Cairo time**:
   - Processes all tenants
   - Skips Egypt companies if today is Friday or Saturday (weekend)
   - Skips if no visits recorded
   - Sends messages to Gazelle companies

2. **India job runs at 6 PM IST**:
   - Processes all tenants
   - Skips India companies if today is Saturday or Sunday (weekend)
   - Skips if no visits recorded
   - Sends messages to Hylite & Crescent

3. **Weekend Logic** (automatic per tenant):
   - Gazelle: Fri-Sat off (days 5,6)
   - Hylite/Crescent: Sat-Sun off (days 0,6)

4. **Visit Check** (automatic):
   - Only sends if tenant has ANY visits that day
   - Prevents empty messages

## Testing

Test the new logic locally:
```powershell
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

(async () => {
  const { data: tenants } = await supabase
    .from('tenants')
    .select('company_name, timezone, weekend_days')
    .order('company_name');
  
  console.log('Timezone Configuration:');
  tenants.forEach(t => {
    const weekend = t.weekend_days.includes(5) ? 'Fri-Sat' : 'Sat-Sun';
    console.log(\`  \${t.company_name}: \${t.timezone} (Weekend: \${weekend})\`);
  });
})();
"
```

## Monitoring

View which tenants were processed:
```powershell
gcloud app logs read --service=whatsapp-cron --limit=100 | Select-String "Processing:|SKIPPED:"
```

## Rollback

If needed, restore old version:
```powershell
Copy-Item cron-server-v1-backup.js cron-server.js
gcloud app deploy app-whatsapp-cron.yaml --quiet
```

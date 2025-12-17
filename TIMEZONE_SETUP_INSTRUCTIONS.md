# ⚠️ CRITICAL TIMEZONE SETUP - ACTION REQUIRED

## Current Status
✅ New timezone-aware code deployed to App Engine
⏳ Database timezone columns need to be added
⏳ Cloud Scheduler jobs need to be recreated

## 🎯 What You Need to Do

### Step 1: Add Timezone Columns to Database (5 minutes)

1. Open **Supabase SQL Editor**: https://supabase.com/dashboard/project/ktvrffbccgxtaststlhw/sql
2. Copy and paste the entire content of `database/add-timezone-config.sql`
3. Click **Run**

This will:
- Add `timezone`, `weekend_days`, `notification_time` columns
- Set **Gazelle → Africa/Cairo, Weekend: Friday-Saturday**
- Set **Hylite → Asia/Kolkata, Weekend: Saturday-Sunday**
- Set **Crescent → Asia/Kolkata, Weekend: Saturday-Sunday**

### Step 2: Create Timezone-Specific Cron Jobs

Run these commands in PowerShell:

**Delete old job:**
```powershell
gcloud scheduler jobs delete daily-whatsapp-summary
```

**Create Egypt time job (6 PM Cairo = 3:30 PM UTC):**
```powershell
gcloud scheduler jobs create app-engine egypt-daily-summary --schedule="30 15 * * *" --time-zone="Africa/Cairo" --service="whatsapp-cron" --http-method="GET" --relative-url="/cron/send-daily-summaries" --description="Egypt companies at 6 PM Cairo time"
```

**Create India time job (6 PM IST = 12:30 PM UTC):**
```powershell
gcloud scheduler jobs create app-engine india-daily-summary --schedule="30 12 * * *" --time-zone="Asia/Kolkata" --service="whatsapp-cron" --http-method="GET" --relative-url="/cron/send-daily-summaries" --description="India companies at 6 PM IST"
```

## How The New System Works

### Intelligent Filtering

**Egypt Job (Runs at 6 PM Cairo time daily):**
1. Checks all tenants
2. **Skips Gazelle** if today is Friday or Saturday (their weekend)
3. **Skips** if no visits recorded that day
4. Sends messages only if conditions met

**India Job (Runs at 6 PM IST daily):**
1. Checks all tenants
2. **Skips Hylite/Crescent** if today is Saturday or Sunday (their weekend)
3. **Skips** if no visits recorded that day
4. Sends messages only if conditions met

### Weekend Detection (Automatic)
- **Gazelle companies**: Days 5,6 = Friday, Saturday (Egypt weekend)
- **Hylite/Crescent**: Days 0,6 = Saturday, Sunday (India weekend)
- System automatically checks `new Date().getDay()` against tenant's `weekend_days`

### Visit Checking (Automatic)
- Before sending any messages, checks if tenant has ANY visits that day
- Query: `SELECT COUNT(*) FROM visits WHERE tenant_id = ? AND date = today`
- If zero visits → Skip sending messages
- **Benefit**: No annoying "0 visits" messages on quiet days

## Example Scenarios

**Scenario 1: Friday in Egypt**
- Egypt job runs at 6 PM Cairo time
- Checks Gazelle companies
- Detects today is Friday (day 5)
- **SKIPS** Gazelle (weekend)
- Checks Hylite/Crescent
- Hylite is NOT weekend (Friday is working day in India)
- If Hylite has visits → Sends messages
- If no visits → Skips

**Scenario 2: Saturday globally**
- Egypt job: Skips Gazelle (Saturday is weekend)
- India job: Skips Hylite/Crescent (Saturday is weekend)
- **No messages sent to anyone**

**Scenario 3: Tuesday, but no activity**
- Both jobs run
- Gazelle has 0 visits → Skipped
- Hylite has 5 visits → Messages sent
- Crescent has 0 visits → Skipped

## Verification

After setup, verify timezone configuration:
```powershell
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
(async () => {
  const { data } = await supabase.from('tenants').select('company_name, timezone, weekend_days, notification_time').order('company_name');
  console.log('\nTimezone Configuration:\n');
  data.forEach(t => {
    const weekend = t.weekend_days.includes(5) ? 'Fri-Sat' : 'Sat-Sun';
    console.log(\`\${t.company_name}:\`);
    console.log(\`  Timezone: \${t.timezone}\`);
    console.log(\`  Weekend: \${weekend}\`);
    console.log(\`  Notification Time: \${t.notification_time}\n\`);
  });
})();
"
```

## Test The New Logic

Test without sending real messages:
```powershell
node -e "
const today = new Date();
const day = today.getDay();
const dayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][day];

console.log('Today is:', dayName, '(day', day + ')');
console.log('\nWould messages be sent?\n');

// Gazelle (Egypt) - Weekend: Fri(5), Sat(6)
const gazelleWeekend = [5,6].includes(day);
console.log('Gazelle (Egypt):', gazelleWeekend ? '❌ SKIPPED (weekend)' : '✅ Would send (if visits exist)');

// Hylite/Crescent (India) - Weekend: Sat(6), Sun(0)
const indiaWeekend = [0,6].includes(day);
console.log('Hylite/Crescent (India):', indiaWeekend ? '❌ SKIPPED (weekend)' : '✅ Would send (if visits exist)');
"
```

## Currency Display

Messages now show correct currency:
- **Egypt companies**: EGP (Egyptian Pound)
- **India companies**: ₹ (Indian Rupee)

## What Changed in Code

### cron-server-v2.js (New Version)
- ✅ `isWeekend(weekendDays)` - Checks if today is weekend for tenant
- ✅ `hasVisitsToday(tenantId, date)` - Checks if any visits recorded
- ✅ `formatCurrency(amount, timezone)` - Shows EGP or ₹ based on country
- ✅ `processTenant()` - Skips if weekend OR no visits

### Database Changes
- ✅ `tenants.timezone` - IANA timezone (Africa/Cairo, Asia/Kolkata)
- ✅ `tenants.weekend_days` - Array of day numbers (0=Sun, 6=Sat)
- ✅ `tenants.notification_time` - Local time to send (18:00:00)

## Summary

**Old System:**
- Single cron job at one time
- Sent messages every day regardless
- Sent even if 0 visits
- No timezone awareness

**New System:**
- 2 cron jobs (one per timezone)
- Respects weekends per country
- Only sends if visits exist
- Currency per country
- Fully timezone-aware

**Result:**
- Gazelle gets messages at 6 PM Egypt time (not 6 PM India time)
- No messages on weekends
- No annoying "0 visits" messages
- Correct currency symbols

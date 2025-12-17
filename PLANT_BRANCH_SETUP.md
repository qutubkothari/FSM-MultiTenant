# Add Plant/Branch Information to WhatsApp Messages

## What Changed
Management messages will now show which branch/plant each salesman belongs to in the Top Performers section.

Example:
```
🏆 Top Performers
🥇 Alok [Hylite Galvanisers Pimpri] - 45 (🚶2 + 📞43), ₹14,60,000
🥈 Fatema [Hylite Electroplaters] - 10 (🚶0 + 📞10), ₹1,55,330
```

## Steps to Implement

### Step 1: Update SQL Function
1. Open Supabase Dashboard (https://supabase.com/dashboard)
2. Go to SQL Editor
3. Copy the contents of `database/RUN_THIS_add-plant-to-admin-summary.sql`
4. Paste and run the SQL
5. Verify: You should see "Success. No rows returned"

### Step 2: Deploy Updated Code
The cron-server.js has been updated to show plant names. Deploy to App Engine:

```powershell
gcloud app deploy app-whatsapp-cron.yaml
```

### Step 3: Test
Run this to test the updated format:

```powershell
node send-test-yourself.js
```

Check your WhatsApp to see the plant names in brackets after each salesman's name.

## How It Works
- If salesman has a plant assigned: Shows plant name from plants table
- If no plant assigned: Shows "HQ" 
- Works for both Hylite (multiple plants) and Gazelle (branches)

## File Changes
- ✅ `cron-server.js` - Updated formatAdminMessage() to show plant
- ✅ `database/RUN_THIS_add-plant-to-admin-summary.sql` - SQL function update

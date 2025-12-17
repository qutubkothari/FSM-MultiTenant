# WhatsApp Daily Summary - Google Cloud Deployment ✅

## ✅ DEPLOYMENT SUCCESSFUL

### Service Details
- **Service URL**: https://whatsapp-cron-dot-care-and-cure-dispatch.uc.r.appspot.com/
- **Service Name**: whatsapp-cron
- **Version**: 20251216t081006
- **Status**: SERVING ✅
- **Health Check**: https://whatsapp-cron-dot-care-and-cure-dispatch.uc.r.appspot.com/ (returns {"status":"ok"})

### Cloud Scheduler
- **Job Name**: daily-whatsapp-summary
- **Schedule**: 0 18 * * * (Daily at 6:00 PM IST)
- **Timezone**: Asia/Kolkata
- **Target**: /cron/send-daily-summaries
- **Status**: ENABLED ✅
- **Next Run**: Check with `gcloud scheduler jobs describe daily-whatsapp-summary`

## How It Works

1. **Cloud Scheduler** triggers at 6:00 PM IST every day
2. Calls `/cron/send-daily-summaries` on the `whatsapp-cron` service
3. Server fetches all tenants from Supabase
4. For each tenant:
   - Gets all salesmen (is_admin=false)
   - Gets all admins (is_admin=true)
   - Calls SQL functions for summary data
   - Sends WhatsApp messages via SAK API
5. Returns success/failure count

## Files Deployed

1. **cron-server.js** - Express.js server that exposes the cron endpoint
2. **app-whatsapp-cron.yaml** - App Engine configuration
3. **package.json** - Dependencies (Express, Supabase client)
4. **package-lock.json** - Locked dependencies

## Monitoring Commands

### View Live Logs
```powershell
gcloud app logs tail --service=whatsapp-cron
```

### View Recent Logs
```powershell
gcloud app logs read --service=whatsapp-cron --limit=50
```

### Check Service Status
```powershell
gcloud app services describe whatsapp-cron
```

### List Deployed Versions
```powershell
gcloud app versions list --service=whatsapp-cron
```

### Check Cron Job
```powershell
gcloud scheduler jobs describe daily-whatsapp-summary
```

### List All Cron Jobs
```powershell
gcloud scheduler jobs list
```

## Manual Testing

### Trigger the cron job manually
```powershell
gcloud scheduler jobs run daily-whatsapp-summary
```

### Test health endpoint
```powershell
Invoke-WebRequest -Uri "https://whatsapp-cron-dot-care-and-cure-dispatch.uc.r.appspot.com/" -UseBasicParsing
```

## Cost Estimate

- **App Engine F1 instance**: Free tier (28 instance hours/day)
- **Cloud Scheduler**: $0.10/job/month
- **Expected cost**: $0.10/month (within free tier)

## Scaling Configuration

- **Minimum instances**: 0 (scales to zero when not in use)
- **Maximum instances**: 1 (only one instance needed)
- **Instance class**: F1 (minimal resources)
- **Target CPU**: 65%

## Security

- Endpoint requires App Engine admin authentication
- Only Cloud Scheduler can trigger the cron endpoint
- All API keys stored securely in App Engine environment variables:
  - SUPABASE_URL
  - SUPABASE_ANON_KEY
  - SAK_BASE_URL
  - SAK_API_KEY
  - SAK_SESSION_ID

## Rollback

If needed, rollback to a previous version:

```powershell
# List versions
gcloud app versions list --service=whatsapp-cron

# Switch traffic to a previous version
gcloud app services set-traffic whatsapp-cron --splits=VERSION_ID=1
```

## Update Deployment

To update the code:

1. Make changes to `cron-server.js`
2. Deploy with:
```powershell
gcloud app deploy app-whatsapp-cron.yaml --quiet
```

## Local Testing

Test locally before deploying:
```powershell
npm run cron:local
```

This runs the original `send-daily-summaries.js` script.

## Troubleshooting

### Service shows 503 error
- Check logs: `gcloud app logs read --service=whatsapp-cron --limit=50`
- Verify files are uploaded correctly
- Check .gcloudignore isn't excluding necessary files

### Cron job not running
- Verify job is enabled: `gcloud scheduler jobs describe daily-whatsapp-summary`
- Check schedule syntax is correct
- View cron execution logs in App Engine logs

### Missing dependencies
- App Engine automatically runs `npm install` on deployment
- Check package.json has all required dependencies

## Message Statistics

From last test run (December 16, 2025):
- **Total messages**: 26 across 5 tenants
- **Tenants processed**: Crescent, Demo, GAZELLE, Gazelle Envelopes, Hylite
- **Salesmen**: 21 messages
- **Admins**: 5 messages
- **Success rate**: 96% (1 failed due to invalid phone number)

## Support

For issues:
1. Check App Engine logs
2. Verify environment variables are set correctly
3. Test WhatsApp API manually
4. Check Supabase connection
5. Verify SQL functions are working

## Notes

- Service will sleep when not in use (scales to zero)
- First request after sleeping may take ~10 seconds (cold start)
- Cron jobs don't suffer from cold starts (App Engine keeps them warm)
- All messages use WhatsApp markdown formatting with emojis
- Admins are excluded from visit statistics (is_admin=false filter in SQL)

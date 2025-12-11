# Custom Domain Setup: fsm.saksolution.com

## Step 1: Add Custom Domain in Google Cloud

1. Go to Google Cloud Console: https://console.cloud.google.com
2. Select project: **sak-fsm**
3. Navigate to: **App Engine** → **Settings** → **Custom domains**
4. Click **"Add a custom domain"**
5. Select or verify domain: **saksolution.com**
6. Add subdomain: **fsm.saksolution.com**

## Step 2: Configure DNS Records

You need to add these DNS records in your domain registrar (GoDaddy, Namecheap, etc.):

### DNS Records to Add:

**For subdomain fsm.saksolution.com:**

```
Type: CNAME
Name: fsm
Value: ghs.googlehosted.com
TTL: 3600 (or automatic)
```

**Alternative (if CNAME doesn't work):**

Google will provide specific A and AAAA records. Typically:

```
Type: A
Name: fsm
Value: 216.239.32.21
Value: 216.239.34.21
Value: 216.239.36.21
Value: 216.239.38.21

Type: AAAA
Name: fsm
Value: 2001:4860:4802:32::15
Value: 2001:4860:4802:34::15
Value: 2001:4860:4802:36::15
Value: 2001:4860:4802:38::15
```

## Step 3: Complete Setup in Google Cloud

1. Wait for DNS propagation (5 minutes to 48 hours)
2. Google Cloud will automatically verify the domain
3. SSL certificate will be automatically provisioned (may take 15-30 minutes)

## Step 4: Update App Configuration

No code changes needed! Google App Engine will automatically handle routing.

## Step 5: Test

Once DNS propagates, test:
- http://fsm.saksolution.com (should redirect to HTTPS)
- https://fsm.saksolution.com (should work with SSL)

## Verification Commands

Check DNS propagation:
```bash
nslookup fsm.saksolution.com
```

Check SSL:
```bash
curl -I https://fsm.saksolution.com
```

## Troubleshooting

**Issue**: Domain not working after 24 hours
- Check DNS records are correct
- Verify domain ownership in Google Search Console
- Check Google Cloud logs

**Issue**: SSL certificate not provisioning
- Wait 30 minutes after DNS propagation
- Ensure HTTP traffic is not blocked
- Try accessing via HTTP first

**Issue**: 404 Error
- Verify app is deployed: `gcloud app browse --project=sak-fsm`
- Check dispatch rules if using multiple services

## Current Deployment

- Project: sak-fsm
- Current URL: https://sak-fsm.el.r.appspot.com
- Custom Domain: fsm.saksolution.com (to be configured)
- Version: 20251115t125408

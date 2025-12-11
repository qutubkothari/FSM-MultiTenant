# 🚨 DEPLOYMENT PROTOCOL - READ BEFORE ANY DEPLOYMENT

## ⚠️ GOLDEN RULE: NEVER DEPLOY DIRECTLY TO LIVE

### Current Live Version
**Check this before any deployment:**
```powershell
gcloud app versions list --service=default --format="table(id,traffic_split)"
```

---

## 📋 MANDATORY CHECKLIST BEFORE DEPLOY

### Step 1: Build & Test Locally
```powershell
cd fsm-react
npm run build
# CHECK: No TypeScript errors
# CHECK: Build completes successfully
```

### Step 2: Deploy to TEST VERSION (No Traffic)
```powershell
.\deploy-safe.bat
```
**This creates a NEW version that gets ZERO traffic.**

### Step 3: Get Test URL
```powershell
gcloud app versions list --service=default --limit=1
```
Test URL format: `https://[VERSION-ID]-dot-sak-fsm.el.r.appspot.com`

### Step 4: Manual Testing (MANDATORY)
- [ ] Login works
- [ ] Dashboard loads
- [ ] Filters work (company, salesman)
- [ ] Arabic translations display correctly
- [ ] No console errors
- [ ] Test on mobile view
- [ ] Test all critical features

### Step 5: Gradual Rollout (OPTIONAL - for safety)
```powershell
# Send 5% traffic to new version
gcloud app services set-traffic default --splits=[NEW_VERSION]=0.05,[OLD_VERSION]=0.95

# Monitor for 1 hour
# If no errors, increase to 50%
gcloud app services set-traffic default --splits=[NEW_VERSION]=0.5,[OLD_VERSION]=0.5

# If still good, go to 100%
gcloud app services set-traffic default --migrate
```

### Step 6: Full Deployment (if confident)
```powershell
gcloud app services set-traffic default --migrate
```

---

## 🆘 EMERGENCY ROLLBACK

**If ANYTHING goes wrong:**
```powershell
.\rollback-quick.bat
```
**This takes 30 seconds and restores the old version.**

---

## 🔴 BANNED COMMANDS (Never Use These)

❌ `gcloud app deploy --quiet` (goes live immediately)  
❌ `.\deploy.bat` (old script - goes live immediately)  
❌ `.\deploy-react.bat` (goes live immediately)  

## ✅ APPROVED COMMANDS ONLY

✅ `.\deploy-safe.bat` (creates test version)  
✅ `.\rollback-quick.bat` (emergency recovery)  

---

## 📞 COMMUNICATION PROTOCOL

**When working with AI assistant:**
1. AI suggests changes
2. YOU review the code changes
3. AI deploys to TEST version only
4. YOU test the test URL manually
5. YOU decide to go live or rollback
6. AI NEVER deploys directly to live

---

## 📊 Version Tracking

Keep a log of what's in each version:

| Date | Version ID | Changes | Status |
|------|-----------|---------|--------|
| 2025-11-25 | 20251125t160410 | Fixed company filter | LIVE ✅ |
| | | | |

---

## 🎯 Summary

**AI Role:** Build features, create test versions  
**Your Role:** Test, approve, deploy to live  
**Safety:** Always have rollback ready  

**REMEMBER: Better to test for 10 minutes than break production for 10 hours!**

# 🧪 OFFLINE SYNC - LOCAL TESTING CHECKLIST

## ✅ STEP-BY-STEP TESTING GUIDE

### 🚀 Server is Running
**URL**: http://localhost:4173/

---

## TEST 1: Basic Offline Visit

### Steps:
1. **Open Browser**
   - Navigate to http://localhost:4173/
   - Press F12 (Open DevTools)

2. **Go Offline**
   - DevTools → Network tab
   - Select **"Offline"** from dropdown
   
3. **Login**
   - Login as salesman: `9890777102`
   - You should see the dashboard

4. **Create Offline Visit**
   - Click "New Visit"
   - Fill form:
     - Customer Name: Test Customer
     - Plant: Any
     - Meeting Type: Check one
     - Visit Type: Personal
     - Take Photo (use camera or upload)
     - GPS location should capture
   - Click Submit

5. **Expected Result**
   - ✅ "Visit added successfully" message
   - ✅ Orange chip appears: "1 visit pending sync"
   - ✅ "Offline" chip visible

6. **Verify in IndexedDB**
   - DevTools → Application tab
   - Storage → IndexedDB → FSM_OfflineDB
   - Click "offline_visits"
   - ✅ Should see 1 visit with syncStatus: "pending"

7. **Go Online & Sync**
   - DevTools → Network tab → Select **"Online"**
   - ✅ Within 5-30 seconds: "Synced 1 visit successfully" notification
   - ✅ Orange chip disappears
   - ✅ Visit appears in Visit History

---

## TEST 2: Multiple Offline Visits

### Steps:
1. Go Offline (Network → Offline)
2. Create 3 visits with different customers
3. Check chip shows: "3 visits pending sync"
4. Go Online
5. ✅ All 3 sync automatically
6. ✅ All appear in dashboard

---

## TEST 3: Manual Sync Button

### Steps:
1. Go Offline
2. Create 1 visit
3. Go Online
4. **Click the circular Refresh button** next to pending count
5. ✅ Immediate sync triggered
6. ✅ Success notification

---

## TEST 4: Sync Manager Console Logs

### Check Console for:
```
🚀 User logged in, initializing sync manager...
🔄 Initializing Sync Manager...
✅ IndexedDB initialized successfully
📦 Created offline_visits store
📡 Offline - saving visit to local storage
💾 Visit saved offline: offline_1733840000_abc123
🌐 Connection restored - starting sync...
🔄 Syncing 1 pending visits...
✅ Successfully synced visit offline_xxx -> [real-id]
✅ Sync complete: 1 success, 0 failed
```

---

## TEST 5: Image Upload

### Steps:
1. Go Offline
2. Create visit with photo
3. Check IndexedDB → offline_visits → imageFile field
4. ✅ Should contain blob URL (blob:http://...)
5. Go Online
6. Wait for sync
7. Check Supabase Storage → visit-images bucket
8. ✅ Image should be uploaded

---

## 🐛 Common Issues & Fixes

### Issue: "Sync not happening"
**Check**:
- Console for errors
- Network tab is set to "Online"
- User is logged in
- Tenant ID exists

### Issue: "Image not uploading"
**Check**:
- Supabase Storage "visit-images" bucket exists
- Storage policies allow uploads
- Image size < 5MB

### Issue: "Pending count stuck"
**Fix**:
```javascript
// In browser console:
await offlineStorage.clearAll();
```

---

## 📊 Debug Commands

### In Browser Console:

```javascript
// Check sync status
const status = await syncManager.getSyncStatus();
console.log(status);

// View all offline visits
const visits = await offlineStorage.getAllOfflineVisits();
console.table(visits);

// Force sync now
await syncManager.forceSyncNow();

// Clear all offline data
await offlineStorage.clearAll();

// Check pending count
const count = await offlineStorage.getPendingCount();
console.log('Pending:', count);
```

---

## ✅ Success Criteria

Before deploying to production, verify:

- [x] Build compiles without errors ✅
- [ ] Offline visit creation works
- [ ] Auto-sync triggers when online
- [ ] Manual sync button works
- [ ] Multiple visits sync correctly
- [ ] Images upload successfully
- [ ] IndexedDB clears after sync
- [ ] UI indicators display correctly
- [ ] No console errors
- [ ] Visit appears in dashboard after sync

---

## 🚀 Next Steps

### If All Tests Pass:
```powershell
# Deploy to production
cd ..
Copy-Item -Path "fsm-react\dist\*" -Destination "dist-react\" -Recurse -Force
gcloud app deploy app-react.yaml --project=sak-fsm --quiet
```

### If Issues Found:
1. Fix the issue
2. Rebuild: `npm run build`
3. Restart preview: `npm run preview`
4. Retest

---

## 📞 Test Results Template

Copy and fill after testing:

```
DATE: _______________
TESTER: _______________

TEST 1 - Basic Offline Visit:      [ ] PASS  [ ] FAIL
TEST 2 - Multiple Visits:           [ ] PASS  [ ] FAIL
TEST 3 - Manual Sync:               [ ] PASS  [ ] FAIL
TEST 4 - Console Logs:              [ ] PASS  [ ] FAIL
TEST 5 - Image Upload:              [ ] PASS  [ ] FAIL

ISSUES FOUND:
_________________________________
_________________________________
_________________________________

READY FOR PRODUCTION?  [ ] YES  [ ] NO
```

---

**Testing Server**: http://localhost:4173/
**Kill Server**: Press Ctrl+C in terminal
**Restart Server**: `cd fsm-react && npm run preview`

# 📡 OFFLINE SYNC IMPLEMENTATION GUIDE

## ✅ What Was Implemented

### 1. **Offline Storage (IndexedDB)**
- `offlineStorage.ts`: Manages local database for storing visits offline
- Stores complete visit data including images
- Tracks sync status: pending, syncing, failed, synced
- Retry mechanism with failure tracking

### 2. **Sync Manager**
- `syncManager.ts`: Handles automatic synchronization
- **Auto-sync triggers**:
  - When internet connection is restored
  - Every 30 seconds (if online)
  - Manual sync button click
- **Features**:
  - Exponential backoff for failed syncs
  - Prevents duplicate syncing
  - Image upload handling
  - Error tracking and retry limits (max 5 attempts)

### 3. **UI Components**
- `OfflineIndicator.tsx`: Visual feedback component
  - Shows "Offline" chip when no connection
  - Displays pending visit count
  - Manual sync button
  - Syncing progress indicator
  - Success notifications

### 4. **Integration**
- App.tsx: Initializes sync manager on user login
- NewVisitForm.tsx: Detects offline mode and saves to IndexedDB

---

## 🚀 How It Works

### Offline Visit Creation
```
1. Salesman fills visit form (no internet)
2. Clicks "Submit"
3. System detects: navigator.onLine = false
4. Visit saved to IndexedDB with status='pending'
5. Success message shown
6. Orange chip appears: "1 visit pending sync"
```

### Automatic Sync
```
1. Internet connection restored
2. Event listener triggers syncManager
3. Fetches all pending visits from IndexedDB
4. For each visit:
   - Upload image to Supabase Storage
   - Create salesman record (if needed)
   - Insert visit to database
   - Mark as synced & delete from IndexedDB
5. Success notification shown
```

---

## 🧪 Testing Locally

### 1. **Start Development Server**
```powershell
cd fsm-react
npm run dev
```

### 2. **Test Offline Mode**

**Step A: Create Offline Visit**
1. Open Chrome DevTools (F12)
2. Go to Network tab
3. Select "Offline" from dropdown
4. Login as salesman
5. Create a new visit with photo
6. Submit → Should see "1 visit pending sync" chip

**Step B: Check IndexedDB**
1. DevTools → Application tab
2. Storage → IndexedDB → FSM_OfflineDB
3. Click "offline_visits" → Should see your visit

**Step C: Sync When Online**
1. DevTools → Network tab → Select "Online"
2. Wait 5-10 seconds OR click sync button
3. Watch console for sync logs
4. Visit should appear in dashboard
5. IndexedDB should be empty

### 3. **Test Multiple Offline Visits**
```
1. Go offline (DevTools Network)
2. Create 3 visits
3. See "3 visits pending sync"
4. Go online
5. All 3 should sync automatically
```

### 4. **Test Failed Sync**
```
1. Create visit offline
2. Go online BUT logout (to break tenant context)
3. Visit will fail to sync
4. Retry counter increases
5. After 5 retries, marked as permanently failed
```

---

## 🎯 User Experience

### For Salesmen:
- **Seamless**: Works exactly the same online or offline
- **Visual Feedback**: Clear indication of offline mode
- **Trust**: Visits are never lost
- **Control**: Manual sync button available

### For Admins:
- **Visibility**: Can see pending syncs across team
- **Reliability**: Background sync ensures data integrity
- **No Action Needed**: Fully automatic

---

## 📦 Build & Deploy

### Local Testing
```powershell
cd fsm-react
npm run build
npm run preview
```

### Deploy to Production
```powershell
# Build React app
cd fsm-react
npm run build

# Copy to dist-react
cd ..
Copy-Item -Path "fsm-react\dist\*" -Destination "dist-react\" -Recurse -Force

# Deploy to App Engine
gcloud app deploy app-react.yaml --project=sak-fsm --quiet
```

---

## 🔧 Configuration

### Sync Interval
Edit `syncManager.ts` line 61:
```typescript
30000  // 30 seconds (default)
60000  // 1 minute
120000 // 2 minutes
```

### Max Retry Attempts
Edit `syncManager.ts` line 122:
```typescript
if (visit.retryCount >= 5) {  // Change 5 to desired max
```

### Storage Quota
IndexedDB has ~50MB-100MB quota per domain (browser-dependent)
Estimate: ~500-1000 visits with images

---

## 🐛 Troubleshooting

### Issue: "Visits not syncing"
**Solution**:
1. Open Console (F12)
2. Check for sync errors
3. Look at IndexedDB → offline_visits → syncStatus
4. If status='failed', check lastError field

### Issue: "Image upload fails"
**Solution**:
- Check Supabase Storage policies
- Verify visit-images bucket exists
- Check image size (max 5MB recommended)

### Issue: "Duplicate visits created"
**Solution**:
- Clear IndexedDB: Application → IndexedDB → Delete
- Logout and login again

### Issue: "Pending count stuck"
**Solution**:
```javascript
// In browser console:
const db = await indexedDB.open('FSM_OfflineDB', 1);
// Check sync status of stuck visits
```

---

## 📊 Monitoring

### Check Sync Status (Console)
```javascript
// Get current status
const status = await syncManager.getSyncStatus();
console.log(status);
// {pendingCount: 2, isSyncing: false, isOnline: true}
```

### View All Offline Visits
```javascript
const visits = await offlineStorage.getAllOfflineVisits();
console.table(visits);
```

### Force Sync Now
```javascript
await syncManager.forceSyncNow();
```

---

## 🔐 Security Considerations

1. **Data Encryption**: IndexedDB data is NOT encrypted by default
   - Sensitive data only stored temporarily
   - Cleared after successful sync

2. **Image Storage**: Images stored as blob URLs
   - Only accessible within same domain
   - Deleted after upload to Supabase

3. **Tenant Isolation**: Sync respects tenant_id
   - No cross-tenant data leakage

---

## 🚨 Rollback Plan

If issues occur in production:

### Quick Rollback
```powershell
# Restore from backup
Copy-Item -Path "BACKUP_SOURCE_20251210_172248\fsm-react-src\*" -Destination "fsm-react\src\" -Recurse -Force

# Rebuild and deploy
cd fsm-react
npm run build
cd ..
Copy-Item -Path "fsm-react\dist\*" -Destination "dist-react\" -Recurse -Force
gcloud app deploy app-react.yaml --project=sak-fsm --quiet
```

### Disable Offline Mode
Edit `NewVisitForm.tsx` line ~448:
```typescript
const isOnline = true; // Force online mode
// const isOnline = navigator.onLine; // Original line
```

---

## 📝 Future Enhancements

1. **Sync Conflict Resolution**: Handle same visit edited online and offline
2. **Partial Sync**: Resume interrupted syncs
3. **Compression**: Compress images before storage
4. **Background Sync API**: Use service worker for true background sync
5. **Offline Dashboard**: Show cached visits in dashboard while offline

---

## ✅ Testing Checklist

Before going live, test:
- [ ] Create visit offline
- [ ] Auto-sync when online
- [ ] Manual sync button
- [ ] Multiple offline visits
- [ ] Failed sync retry
- [ ] Image upload
- [ ] Logout while pending syncs
- [ ] Low storage scenario
- [ ] Slow network sync
- [ ] Admin dashboard shows synced visits

---

## 📞 Support

**Created**: December 10, 2025
**Version**: 1.0.0
**Status**: ✅ Ready for Local Testing

**Next Steps**:
1. Test locally following guide above
2. Fix any issues found
3. Deploy to production
4. Monitor for 1 week
5. Gather user feedback

**Backup Location**: `BACKUP_SOURCE_20251210_172248.zip`

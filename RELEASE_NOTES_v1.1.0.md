# FSM Mobile App - Release v1.1.0

**Release Date:** December 16, 2025

## 🎯 Major Feature: Offline Visit Sync

### What's New

This release adds **robust offline support** for Gazelle and all field teams working in areas with poor or no internet connectivity.

### Key Improvements

✅ **Visits Never Lost**
- When internet is unavailable, visits are automatically saved to local device storage
- All visit data (customer, GPS, products, remarks, images) is preserved offline
- App shows "Pending Sync" counter so you know exactly how many visits are waiting

✅ **Auto-Sync When Online**
- App automatically syncs pending visits every 5 minutes when internet is available
- Manual "Sync Now" button for immediate sync
- Smart retry logic ensures failed syncs are retried

✅ **Reliable Recovery**
- Visits persist even if app is force-closed or device restarts
- Only successfully synced visits are removed from queue
- No data loss even during spotty connectivity

### Technical Details

**Fixed Issues:**
- `SupabaseService.createVisit()` now properly throws errors instead of returning null
- `syncPendingVisits()` only removes visits that actually synced (prevents data loss)
- Home screen now shows accurate pending count on app launch
- Pending count updates immediately after saving offline visit

**For Gazelle Team:**
This release is critical for areas with limited internet connectivity. Salesmen can now record visits with confidence that data will sync once connection is restored.

### Testing Checklist (for field verification)

Before deploying to all users, test in no-internet areas:

1. **Offline Visit Creation**
   - Put phone in Airplane Mode (GPS on)
   - Create 3 test visits with different customers
   - Verify "Pending Sync" shows 3

2. **App Restart Test**
   - Force close app completely
   - Reopen app
   - Verify "Pending Sync" still shows 3

3. **Sync Test**
   - Turn internet back on (Wi-Fi or mobile data)
   - Wait 5 minutes OR tap "Sync Now"
   - Verify "Pending Sync" goes to 0
   - Check admin dashboard to confirm visits appear

4. **Spotty Connection Test**
   - Create visits in area with weak signal
   - Verify visits save locally if upload fails
   - Move to area with good signal
   - Verify auto-sync completes

### Installation

**APK File:** `FSM-Salesman-Latest.apk`

**Installation Steps:**
1. Download APK to Android device
2. Enable "Install from unknown sources" if prompted
3. Install and replace existing version
4. Open app and login
5. Verify version shows 1.1.0 in settings

### Rollback Plan

If issues occur:
- Previous version APK available: `FSM-Salesman-v1.0.0.apk` (if saved)
- No database changes required - this is app-only update
- Downgrade by installing previous APK

---

**Build Info:**
- Version: 1.1.0
- Build Date: December 16, 2025
- Platform: Android (Capacitor + Gradle)
- Min SDK: 22 (Android 5.1+)

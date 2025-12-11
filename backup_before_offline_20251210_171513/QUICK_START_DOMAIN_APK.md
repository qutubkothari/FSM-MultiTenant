# 🚀 Quick Start Guide: Custom Domain & APK

## ✅ COMPLETED SETUP

### 1. Capacitor Android Project
- ✅ Capacitor installed
- ✅ Android platform added
- ✅ Web assets built and synced
- ✅ Configuration file created

## 📱 BUILD APK NOW

### Option 1: Using Android Studio (Recommended for Production)

1. **Install Android Studio** (if not already installed)
   - Download: https://developer.android.com/studio
   - Install with default settings

2. **Open Project**
   ```bash
   cd C:\Users\musta\OneDrive\Documents\GitHub\FSM\fsm-react
   npx cap open android
   ```

3. **Wait for Gradle Sync** (first time takes 5-10 minutes)

4. **Build APK**
   - Go to: **Build** → **Generate Signed Bundle / APK**
   - Select: **APK**
   - Click **Next**
   
5. **Create/Select Keystore**
   - **First Time**: Click **Create new...**
     - Key store path: `C:\Users\musta\fsm-release-key.jks`
     - Password: (create strong password, SAVE IT!)
     - Alias: `fsm-key`
     - Fill in certificate details
   - **Existing**: Browse to your keystore file

6. **Build Release**
   - Select **release** build variant
   - Click **Finish**
   - APK will be at: `fsm-react\android\app\build\outputs\apk\release\app-release.apk`

### Option 2: Command Line (Debug APK)

```bash
cd fsm-react\android
gradlew assembleDebug

# APK at: android\app\build\outputs\apk\debug\app-debug.apk
```

## 🌐 CUSTOM DOMAIN SETUP

### Step 1: In Google Cloud Console

1. Go to: https://console.cloud.google.com
2. Select project: **sak-fsm**
3. Navigate to: **App Engine** → **Settings** → **Custom domains**
4. Click **"Add a custom domain"**
5. Follow the wizard:
   - Verify domain: **saksolution.com**
   - Add subdomain: **fsm.saksolution.com**
6. Google will provide DNS records

### Step 2: Configure DNS (Your Domain Registrar)

Add these DNS records at your domain provider (GoDaddy, Namecheap, etc.):

**Primary Method (CNAME):**
```
Type: CNAME
Name: fsm
Value: ghs.googlehosted.com
TTL: 3600
```

**Alternative Method (A Records):**
If CNAME doesn't work, Google will show you specific A and AAAA records like:
```
Type: A
Name: fsm
Value: 216.239.32.21
(Add all 4 A records provided by Google)
```

### Step 3: Wait & Verify

- DNS propagation: 5 minutes to 48 hours (usually ~1 hour)
- SSL certificate: Auto-provisioned in 15-30 minutes after DNS
- Test: https://fsm.saksolution.com

### Step 4: Update APK (Optional)

If you want APK to use custom domain:

1. Edit `fsm-react\capacitor.config.json`:
   ```json
   "server": {
     "url": "https://fsm.saksolution.com"
   }
   ```

2. Rebuild:
   ```bash
   cd fsm-react
   npm run build
   npx cap sync android
   npx cap open android
   # Build APK again
   ```

## 📦 DISTRIBUTE APK

### For Testing:
1. Copy APK to Google Drive/Dropbox
2. Share link with testers
3. They need to enable "Install from unknown sources"

### For Internal Use:
1. Email APK file directly
2. Or use company file server

### For Production:
1. Sign up: https://play.google.com/console
2. Create app listing
3. Upload signed APK
4. Submit for review

## 🔧 MAINTENANCE

### Update App:
```bash
cd fsm-react

# 1. Make your changes in code

# 2. Build
npm run build

# 3. Sync to Android
npx cap sync android

# 4. Open in Android Studio and build APK
npx cap open android
```

### Update Domain:
- No code changes needed
- Just configure DNS records
- Google App Engine handles routing automatically

## 📝 IMPORTANT NOTES

### Security:
- ⚠️ **SAVE YOUR KEYSTORE FILE** - You can't recover it!
- ⚠️ **SAVE YOUR KEYSTORE PASSWORD** - You can't change it!
- Without keystore, you can't update the app (need new package name)

### APK Size:
- Current size: ~30-40 MB
- Includes all dependencies
- First install includes web assets

### Testing:
- Test on multiple Android versions (5.1+)
- Test on different screen sizes
- Test GPS, Camera permissions
- Test offline functionality

### Versioning:
- Update version in `fsm-react\package.json`
- Increment `versionCode` in `android\app\build.gradle`

## 🆘 TROUBLESHOOTING

**APK won't install:**
- Enable "Install from unknown sources" in Android settings
- Check Android version (minimum 5.1)
- Clear old version first

**GPS not working:**
- Grant location permissions in app settings
- Ensure location services enabled on device

**Camera not working:**
- Grant camera permissions in app settings

**App crashes:**
- Check Android Studio Logcat for errors
- Ensure all required permissions granted

## 📞 SUPPORT

For issues:
1. Check Android Studio Logcat
2. Test in Chrome DevTools (mobile mode)
3. Check Capacitor docs: https://capacitorjs.com

## 🎯 CURRENT STATUS

- ✅ Web app built and deployed: https://sak-fsm.el.r.appspot.com
- ✅ Android project created
- ⏳ Custom domain: Pending DNS configuration
- ⏳ APK: Ready to build (follow steps above)

**Next Steps:**
1. Open Android Studio and build APK (5 minutes)
2. Configure DNS records for fsm.saksolution.com (1 hour propagation)
3. Test both web and mobile versions

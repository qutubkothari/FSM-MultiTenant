# Android APK Build Guide

## Prerequisites

1. Install Node.js (already installed)
2. Install Capacitor CLI:
```bash
npm install -g @capacitor/cli
```

3. Install Android Studio:
- Download: https://developer.android.com/studio
- Install with default settings
- Install Android SDK (API 33 or higher)

## Step 1: Initialize Capacitor

Run these commands from the project root:

```bash
cd fsm-react

# Initialize Capacitor
npx cap init

# When prompted:
# App name: Hylite FSM
# App ID: com.saksolution.fsm
# Web directory: dist
```

## Step 2: Add Android Platform

```bash
# Add Android platform
npx cap add android

# Sync web assets to Android
npm run build
npx cap sync android
```

## Step 3: Configure Android App

Edit `android/app/src/main/AndroidManifest.xml` to add permissions:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
```

## Step 4: Build APK

### Option A: Using Android Studio (Recommended)

```bash
# Open project in Android Studio
npx cap open android
```

In Android Studio:
1. Wait for Gradle sync to complete
2. Go to **Build** → **Generate Signed Bundle / APK**
3. Select **APK**
4. Create new keystore or use existing
5. Build **Release** APK
6. APK will be in: `android/app/build/outputs/apk/release/app-release.apk`

### Option B: Using Command Line

```bash
cd android
./gradlew assembleRelease

# APK location:
# android/app/build/outputs/apk/release/app-release-unsigned.apk
```

## Step 5: Sign APK (Required for Distribution)

### Generate Keystore (First time only):

```bash
keytool -genkey -v -keystore fsm-release-key.keystore -alias fsm-key -keyalg RSA -keysize 2048 -validity 10000

# Save this keystore file securely!
# Remember the password!
```

### Sign APK:

```bash
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore fsm-release-key.keystore android/app/build/outputs/apk/release/app-release-unsigned.apk fsm-key

# Optimize APK
zipalign -v 4 android/app/build/outputs/apk/release/app-release-unsigned.apk fsm-release.apk
```

## Step 6: Test APK

1. Enable **Developer Options** on Android device
2. Enable **USB Debugging**
3. Install APK:
```bash
adb install fsm-release.apk
```

Or transfer APK to phone and install manually.

## Automated Build Script

I'll create a batch script for easy building.

## App Configuration

The app will use:
- App Name: Hylite FSM
- Package: com.saksolution.fsm
- API URL: https://fsm.saksolution.com (or current URL)
- Version: From package.json

## Distribution

**For internal testing:**
- Share APK file directly
- Or use Google Play Internal Testing

**For production:**
- Upload to Google Play Console
- Or use APK signing service

## Troubleshooting

**Gradle sync failed:**
- Update Android Studio
- Check internet connection
- Clear Gradle cache

**Build failed:**
- Check Java version (need JDK 11 or higher)
- Update Gradle wrapper
- Clear build folder

**APK won't install:**
- Enable "Install from unknown sources"
- Check Android version (minimum API 22 / Android 5.1)
- Verify APK is signed

## Update Process

When you update the app:

```bash
# 1. Build web app
cd fsm-react
npm run build

# 2. Sync to Android
npx cap sync android

# 3. Rebuild APK
cd android
./gradlew assembleRelease
```

## Important Notes

- Keep keystore file and passwords SECURE
- Increment version in package.json for each release
- Test on multiple Android devices
- Consider using Google Play for updates

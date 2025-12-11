# 🔧 Fix Android Build Issues

## Problem: Java Version Too Old

**Error**: "Dependency requires at least JVM runtime version 11. This build uses a Java 8 JVM."

## ✅ Solution: Install Java 17

### Quick Install Steps:

1. **Download Java 17 (Temurin)**
   - Go to: https://adoptium.net/temurin/releases/?version=17
   - Select: **Windows x64 Installer (.msi)**
   - Click Download

2. **Install Java 17**
   - Run the downloaded `.msi` file
   - ✅ Check: **"Set JAVA_HOME variable"**
   - ✅ Check: **"Add to PATH"**
   - Click Install

3. **Verify Installation**
   Open **NEW** PowerShell window:
   ```powershell
   java -version
   # Should show: openjdk version "17.x.x"
   ```

4. **Build APK Again**
   ```powershell
   cd C:\Users\musta\OneDrive\Documents\GitHub\FSM\fsm-react\android
   .\gradlew.bat assembleDebug
   ```

## Alternative: Install Android Studio (Recommended)

Android Studio includes Java 17 automatically!

1. **Download Android Studio**
   - https://developer.android.com/studio
   - Download and run installer

2. **Install with Standard Setup**
   - Automatically installs Java 17
   - Automatically installs Android SDK
   - No manual configuration needed!

3. **Open Project**
   ```powershell
   cd C:\Users\musta\OneDrive\Documents\GitHub\FSM\fsm-react
   npx cap open android
   ```

4. **Build APK**
   - Build → Generate Signed Bundle / APK
   - Select APK
   - Create keystore (first time)
   - Build Release

## 🚀 Fastest Solution (Recommended)

**Install Android Studio** - it's the easiest because:
- ✅ Includes correct Java version
- ✅ Includes Android SDK
- ✅ GUI for building APK (no command line)
- ✅ Easy signing and publishing
- ✅ One-click build

**Steps:**
1. Download: https://developer.android.com/studio
2. Install (Standard setup)
3. Wait for SDK download (10 min)
4. File → Open → Select: `fsm-react\android`
5. Build → Generate Signed Bundle / APK
6. Done! ✅

## Current Build Status

```
✅ Web app built
✅ Capacitor configured
✅ Android project created
✅ local.properties created
❌ Java 8 installed (need Java 11+)
```

## After Installing Java 17 or Android Studio

### Using Command Line:
```powershell
cd C:\Users\musta\OneDrive\Documents\GitHub\FSM\fsm-react\android
.\gradlew.bat assembleDebug
```

**APK Location**: `app\build\outputs\apk\debug\app-debug.apk`

### Using Android Studio:
1. Open project in Android Studio
2. Build → Generate Signed Bundle / APK
3. Select APK → Create keystore → Build Release

**APK Location**: `app\build\outputs\apk\release\app-release.apk`

## Which APK to Use?

**Debug APK** (unsigned):
- ✅ Quick to build
- ✅ Good for testing
- ❌ Can't publish to Play Store
- ❌ Shows "Debug" in app

**Release APK** (signed):
- ✅ Production ready
- ✅ Can publish to Play Store
- ✅ Optimized and smaller
- ⚠️ Requires keystore (create once, keep forever!)

## Summary

**For easiest experience:**
1. Install Android Studio (10 GB, includes everything)
2. Open project in Android Studio
3. Use GUI to build APK

**For command line:**
1. Install Java 17
2. Run `.\gradlew.bat assembleDebug`
3. Get debug APK for testing

**My recommendation:** Install Android Studio - it's the standard tool and makes everything easier!

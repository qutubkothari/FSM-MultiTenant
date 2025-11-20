# Android SDK Setup Guide

## Issue: Android Studio asking for SDK path

### Quick Fix Option 1: Let Android Studio Download SDK

1. When Android Studio opens and asks for SDK path
2. Click **"Download SDK"** or **"Install SDK"**
3. Accept the license agreements
4. Wait for SDK download (5-10 minutes)
5. SDK will be installed to: `C:\Users\musta\AppData\Local\Android\Sdk`

### Quick Fix Option 2: Set SDK Path Manually

If you already have Android SDK installed:

1. Common SDK locations:
   - `C:\Users\musta\AppData\Local\Android\Sdk`
   - `C:\Program Files\Android\Android Studio\sdk`
   - `C:\Android\sdk`

2. In Android Studio:
   - File → Settings → Appearance & Behavior → System Settings → Android SDK
   - Or set when prompted at startup

### Quick Fix Option 3: Use Android Studio Setup Wizard

1. Close Android Studio
2. Download latest Android Studio: https://developer.android.com/studio
3. Run installer
4. Choose **"Standard"** installation
5. It will automatically download and configure SDK

### Set SDK Path in Project

Create `local.properties` file in the android folder:

```properties
sdk.dir=C:\\Users\\musta\\AppData\\Local\\Android\\Sdk
```

## Complete Setup Steps

### 1. Install Android Studio (if not installed)

```bash
# Download from:
https://developer.android.com/studio

# Run installer and select "Standard" setup
# This automatically installs:
# - Android SDK
# - Android SDK Platform
# - Android Virtual Device
```

### 2. Configure SDK Components

Open Android Studio → SDK Manager → Install:
- ✅ Android SDK Platform 33 (or latest)
- ✅ Android SDK Build-Tools 33
- ✅ Android SDK Command-line Tools
- ✅ Android SDK Platform-Tools
- ✅ Android Emulator

### 3. Set Environment Variables (Optional)

Add to System Environment Variables:

```
ANDROID_HOME=C:\Users\musta\AppData\Local\Android\Sdk
ANDROID_SDK_ROOT=C:\Users\musta\AppData\Local\Android\Sdk

Path=%ANDROID_HOME%\platform-tools
Path=%ANDROID_HOME%\tools
Path=%ANDROID_HOME%\tools\bin
```

### 4. Verify Installation

Open PowerShell and test:

```powershell
# Check ADB
adb version

# Check SDK Manager
sdkmanager --list
```

## If Still Having Issues

### Try Manual APK Build

Instead of using Android Studio, build from command line:

```bash
cd C:\Users\musta\OneDrive\Documents\GitHub\FSM\fsm-react\android

# First time: Download Gradle wrapper
.\gradlew

# Build debug APK (no signing needed)
.\gradlew assembleDebug

# APK location:
# app\build\outputs\apk\debug\app-debug.apk
```

## Alternative: Use Online Build Service

If local build is problematic, use EAS Build:

```bash
cd fsm-react

# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Configure
eas build:configure

# Build APK
eas build --platform android --profile preview
```

## Recommended Solution

**For first-time setup, do this:**

1. Close everything
2. Download Android Studio: https://developer.android.com/studio
3. Install with **Standard** option
4. Let it download SDK automatically
5. Once complete, open your project:
   ```bash
   cd C:\Users\musta\OneDrive\Documents\GitHub\FSM\fsm-react
   npx cap open android
   ```
6. Wait for Gradle sync
7. Build APK

## Quick Debug APK (No Android Studio Needed)

If you just want to test quickly:

```bash
cd C:\Users\musta\OneDrive\Documents\GitHub\FSM\fsm-react\android
.\gradlew assembleDebug
```

This creates an unsigned debug APK that works for testing.

**Location**: `android\app\build\outputs\apk\debug\app-debug.apk`

You can install this directly on your phone for testing!

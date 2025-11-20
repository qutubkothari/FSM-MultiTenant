@echo off
echo ========================================
echo Java JDK Installer for Android Build
echo ========================================
echo.
echo Your system has Java 8, but Android requires Java 11+
echo.
echo Please download and install Java 17 (LTS):
echo https://adoptium.net/temurin/releases/?version=17
echo.
echo Download: "Windows x64 Installer (.msi)"
echo.
echo After installation:
echo 1. Close this window
echo 2. Open a NEW PowerShell window
echo 3. Run: java -version
echo 4. Should show version 17
echo 5. Then run: .\build-apk-capacitor.bat
echo.
echo Alternative: Use Android Studio (includes Java)
echo https://developer.android.com/studio
echo.
pause

start https://adoptium.net/temurin/releases/?version=17

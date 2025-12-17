@echo off
echo ========================================
echo FSM - SIGNED APK Builder
echo ========================================
echo.

cd fsm-react

echo [1/5] Building React app...
call npm run build
if errorlevel 1 (
    echo ❌ Build failed!
    pause
    exit /b 1
)
echo ✅ Build complete!
echo.

echo [2/5] Syncing to Android with Capacitor...
call npx cap sync android
if errorlevel 1 (
    echo ❌ Sync failed!
    pause
    exit /b 1
)
echo ✅ Sync complete!
echo.

echo [3/5] Cleaning previous builds...
cd android
call gradlew clean
echo ✅ Clean complete!
echo.

echo [4/5] Building SIGNED Release APK...
call gradlew assembleRelease
if errorlevel 1 (
    echo ❌ APK build failed!
    cd ..\..
    pause
    exit /b 1
)
echo ✅ APK build complete!
echo.

echo [5/5] Copying SIGNED APK to root folder...
cd ..\..
if exist "fsm-react\android\app\build\outputs\apk\release\app-release.apk" (
    copy "fsm-react\android\app\build\outputs\apk\release\app-release.apk" "FSM-Salesman-v1.1.0-SIGNED.apk"
    echo ✅ SIGNED APK copied to: FSM-Salesman-v1.1.0-SIGNED.apk
    echo.
    echo ========================================
    echo ✅ SIGNED APK BUILD COMPLETE!
    echo ========================================
    echo APK Location: FSM-Salesman-v1.1.0-SIGNED.apk
    dir "FSM-Salesman-v1.1.0-SIGNED.apk" | findstr "FSM-Salesman"
    echo.
    echo ✅ This APK is SIGNED and ready for distribution!
    echo.
) else (
    echo ❌ APK file not found!
    pause
    exit /b 1
)

pause

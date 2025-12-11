@echo off
echo ========================================
echo FSM - Automated APK Builder
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

echo [4/5] Building Release APK...
call gradlew assembleRelease
if errorlevel 1 (
    echo ❌ APK build failed!
    cd ..\..
    pause
    exit /b 1
)
echo ✅ APK build complete!
echo.

echo [5/5] Copying APK to root folder...
cd ..\..
if exist "fsm-react\android\app\build\outputs\apk\release\app-release-unsigned.apk" (
    copy "fsm-react\android\app\build\outputs\apk\release\app-release-unsigned.apk" "FSM-Salesman-Latest.apk"
    echo ✅ APK copied to: FSM-Salesman-Latest.apk
) else if exist "fsm-react\android\app\build\outputs\apk\release\app-release.apk" (
    copy "fsm-react\android\app\build\outputs\apk\release\app-release.apk" "FSM-Salesman-Latest.apk"
    echo ✅ APK copied to: FSM-Salesman-Latest.apk
) else (
    echo ❌ APK not found in expected location!
    echo Check: fsm-react\android\app\build\outputs\apk\release\
)
echo.

echo ========================================
echo 🎉 BUILD COMPLETE!
echo ========================================
echo APK Location: FSM-Salesman-Latest.apk
echo Size: 
dir "FSM-Salesman-Latest.apk" 2>nul | find "FSM-Salesman"
echo.
echo Note: This is an unsigned APK. For production, you need to sign it.
echo.
pause

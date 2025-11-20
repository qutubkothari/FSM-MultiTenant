@echo off
echo ========================================
echo Hylite FSM - Android APK Builder (Capacitor)
echo ========================================
echo.

cd fsm-react

echo Step 1: Building React app...
call npm run build
if errorlevel 1 (
    echo Build failed!
    pause
    exit /b 1
)
echo Build complete!
echo.

echo Step 2: Checking Capacitor installation...
if not exist "android" (
    echo Capacitor not initialized. Initializing now...
    call npx @capacitor/cli init "Hylite FSM" "com.saksolution.fsm" --web-dir=dist
    call npx @capacitor/cli add android
)

echo Step 3: Syncing to Android...
call npx cap sync android
if errorlevel 1 (
    echo Sync failed!
    pause
    exit /b 1
)
echo Sync complete!
echo.

echo Step 4: Opening in Android Studio...
echo Please build the APK in Android Studio:
echo 1. Build -^> Generate Signed Bundle / APK
echo 2. Select APK
echo 3. Follow the signing wizard
echo.
call npx cap open android

pause

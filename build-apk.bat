@echo off
echo ========================================
echo FSM App - Quick Build Android APK
echo ========================================
echo.

REM Check if EAS CLI is installed
where eas >nul 2>&1
if %errorlevel% neq 0 (
    echo EAS CLI not found. Installing...
    call npm install -g eas-cli
)

echo Logging into Expo...
call eas login

echo.
echo Building Android APK...
echo This will take 10-15 minutes.
echo.

call eas build --platform android --profile production

echo.
echo ========================================
echo Build complete!
echo.
echo Download your APK from:
echo https://expo.dev/accounts/[your-account]/projects/fsm-mobile-app/builds
echo.
pause

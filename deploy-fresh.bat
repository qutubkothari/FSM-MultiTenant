@echo off
echo ========================================
echo Deleting Old Versions and Deploying Fresh React App
echo ========================================
echo.

cd /d "%~dp0"

echo Step 1: Checking current versions...
gcloud app versions list --service=default --project=sak-fsm

echo.
echo Step 2: Deploying fresh React version...
echo.

gcloud app deploy app-react.yaml --project=sak-fsm --version=fsm-react-new --promote

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Deployment Successful!
    echo ========================================
    echo.
    echo Your React PWA is now live at:
    echo https://sak-fsm.el.r.appspot.com
    echo.
    echo.
    echo Step 3: Cleaning up old versions...
    echo.
    
    REM Delete old versions (keep only the new one)
    for /f "tokens=2" %%v in ('gcloud app versions list --service=default --project=sak-fsm --format="value(id)" ^| findstr /v "fsm-react-new"') do (
        echo Deleting version: %%v
        gcloud app versions delete %%v --service=default --project=sak-fsm --quiet
    )
    
    echo.
    echo All old versions cleaned up!
) else (
    echo.
    echo ========================================
    echo Deployment Failed!
    echo ========================================
)

echo.
pause

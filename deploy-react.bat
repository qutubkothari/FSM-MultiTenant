@echo off
echo ========================================
echo FSM React App Deployment
echo ========================================
echo.

cd /d "%~dp0"

echo Committing changes to GitHub...
git add .
git diff-index --quiet HEAD || git commit -m "Auto-commit before deployment - %date% %time%"
git push origin main 2>nul
if %ERRORLEVEL% EQU 0 (
    echo ✓ Changes committed and pushed to GitHub
) else (
    echo ⚠ Nothing to commit or push failed - continuing deployment
)
echo.

echo Deploying React PWA to Google Cloud...
echo.

gcloud app deploy app-react.yaml --project=sak-fsm --quiet

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Deployment Successful!
    echo ========================================
    echo.
    echo Your app is available at:
    echo https://sak-fsm.el.r.appspot.com
    echo.
) else (
    echo.
    echo ========================================
    echo Deployment Failed!
    echo ========================================
    echo.
)

pause

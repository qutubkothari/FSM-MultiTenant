@echo off
setlocal enabledelayedexpansion

echo ========================================
echo FSM App - Safe Deployment Script
echo ========================================
echo.

REM Colors for output (basic)
set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "RESET=[0m"

REM Step 1: Check if gcloud is installed
echo [STEP 1/7] Checking Google Cloud SDK...
where gcloud >nul 2>&1
if %errorlevel% neq 0 (
    echo %RED%ERROR: Google Cloud SDK not found!%RESET%
    echo Please install from: https://cloud.google.com/sdk/docs/install
    pause
    exit /b 1
)
echo %GREEN%✓ Google Cloud SDK found%RESET%
echo.

REM Step 2: Get current project
echo [STEP 2/7] Getting current Google Cloud project...
for /f "tokens=*" %%i in ('gcloud config get-value project 2^>nul') do set CURRENT_PROJECT=%%i
if "!CURRENT_PROJECT!"=="" (
    echo %YELLOW%No project currently set%RESET%
) else (
    echo Current project: %YELLOW%!CURRENT_PROJECT!%RESET%
)
echo.

REM Step 3: List all projects
echo [STEP 3/7] Listing your Google Cloud projects...
echo.
gcloud projects list
echo.

REM Step 4: Ask user to confirm or set project
echo [STEP 4/7] Project Configuration
set /p "FSM_PROJECT=Enter the FSM project ID to deploy to: "
if "!FSM_PROJECT!"=="" (
    echo %RED%ERROR: Project ID cannot be empty%RESET%
    pause
    exit /b 1
)
echo.

REM Step 5: Set the project
echo [STEP 5/7] Setting project to: %YELLOW%!FSM_PROJECT!%RESET%
gcloud config set project !FSM_PROJECT!
if %errorlevel% neq 0 (
    echo %RED%ERROR: Failed to set project%RESET%
    pause
    exit /b 1
)
echo %GREEN%✓ Project set successfully%RESET%
echo.

REM Step 6: Verify project before deployment
echo [STEP 6/7] Verifying project...
for /f "tokens=*" %%i in ('gcloud config get-value project 2^>nul') do set VERIFY_PROJECT=%%i
echo Current active project: %YELLOW%!VERIFY_PROJECT!%RESET%
echo.
set /p "CONFIRM=Deploy to this project? (yes/no): "
if /i not "!CONFIRM!"=="yes" (
    echo %RED%Deployment cancelled by user%RESET%
    pause
    exit /b 0
)
echo.

REM Step 7: Deploy
echo [STEP 7/7] Deploying to Google App Engine...
echo Project: %YELLOW%!VERIFY_PROJECT!%RESET%
echo.
gcloud app deploy --quiet
if %errorlevel% neq 0 (
    echo %RED%ERROR: Deployment failed%RESET%
    pause
    exit /b 1
)
echo.
echo %GREEN%========================================%RESET%
echo %GREEN%✓ DEPLOYMENT SUCCESSFUL!%RESET%
echo %GREEN%========================================%RESET%
echo.

REM Final project check
echo Final verification...
for /f "tokens=*" %%i in ('gcloud config get-value project 2^>nul') do set FINAL_PROJECT=%%i
echo Active project after deployment: %YELLOW%!FINAL_PROJECT!%RESET%
echo.

REM Show deployed URL
echo Getting deployment URL...
for /f "tokens=*" %%i in ('gcloud app browse --no-launch-browser 2^>^&1 ^| findstr "http"') do set APP_URL=%%i
if not "!APP_URL!"=="" (
    echo.
    echo %GREEN%Your app is deployed at:%RESET%
    echo %YELLOW%!APP_URL!%RESET%
    echo.
    echo Admin Dashboard: %YELLOW%!APP_URL!/admin%RESET%
)

echo.
echo Deployment complete!
pause

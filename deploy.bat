@echo off
setlocal enabledelayedexpansion

echo ========================================
echo FSM PRODUCTION DEPLOYMENT
echo Target: sak-fsm (LOCKED)
echo URL: https://fsm.saksolution.com
echo ========================================
echo.

REM Colors for output (basic)
set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "RESET=[0m"

REM Step 0: Commit changes to GitHub
echo [STEP 0/7] Committing changes to GitHub...
git add .
git diff-index --quiet HEAD || git commit -m "Auto-commit before deployment - %date% %time%"
git push origin main 2>nul
if %errorlevel% equ 0 (
    echo %GREEN%✓ Changes committed and pushed to GitHub%RESET%
) else (
    echo %YELLOW%⚠ Nothing to commit or push failed - continuing deployment%RESET%
)
echo.

REM Load deployment secrets (optional)
if exist .env.deploy (
    powershell -NoProfile -Command "$ErrorActionPreference='Stop'; Get-Content .env.deploy | Where-Object { $_ -and $_ -notmatch '^\s*#' -and $_ -match '=' } | ForEach-Object { $k,$v=$_.Split('=',2); [Environment]::SetEnvironmentVariable($k.Trim(),$v.Trim(),'Process') }"
)

REM Generate secrets-filled app yaml (ignored) from template
if not exist .deploy mkdir .deploy
powershell -NoProfile -Command "$ErrorActionPreference='Stop'; $tpl=Get-Content -Raw 'app.yaml'; foreach($k in 'SAK_API_KEY','SAK_SESSION_ID','INBOUND_SECRET','WEBHOOK_SECRET'){ if(-not $env:$k){ throw ('Missing required env var: '+$k+' (set it in .env.deploy)') } }; $out=$tpl.Replace('__SAK_API_KEY__',$env:SAK_API_KEY).Replace('__SAK_SESSION_ID__',$env:SAK_SESSION_ID).Replace('__INBOUND_SECRET__',$env:INBOUND_SECRET).Replace('__WEBHOOK_SECRET__',$env:WEBHOOK_SECRET); Set-Content -NoNewline -Path '.deploy\app.generated.yaml' -Value $out"

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

REM Step 2: Save original project (for reset if needed)
echo [STEP 2/7] Saving current Google Cloud project...
for /f "tokens=*" %%i in ('gcloud config get-value project 2^>nul') do set "ORIGINAL_PROJECT=%%i"
if "!ORIGINAL_PROJECT!"=="" (
    echo %YELLOW%No project currently set%RESET%
    set "ORIGINAL_PROJECT=NONE"
) else (
    echo Original project - will restore if cancelled: %YELLOW%!ORIGINAL_PROJECT!%RESET%
)
echo.

REM Step 3: List all projects
echo [STEP 3/7] Listing ALL your Google Cloud projects...
echo %YELLOW%WARNING: Verify the FSM project ID from this list%RESET%
echo.
gcloud projects list
if %errorlevel% neq 0 (
    echo %RED%ERROR: Failed to list projects%RESET%
    pause
    exit /b 1
)
echo.

REM Step 4: LOCKED TO PRODUCTION PROJECT
echo [STEP 4/7] Production Project Selection
echo.
echo %GREEN%========================================%RESET%
echo %GREEN%   PRODUCTION DEPLOYMENT - LOCKED      %RESET%
echo %GREEN%   Target: sak-fsm                     %RESET%
echo %GREEN%========================================%RESET%
echo.
set "FSM_PROJECT=sak-fsm"
echo This script is LOCKED to deploy to: %YELLOW%!FSM_PROJECT!%RESET%
echo.
set /p "CONTINUE=Continue deploying to sak-fsm (production)? (type YES to confirm): "
if /i not "!CONTINUE!"=="YES" (
    echo %YELLOW%Deployment cancelled%RESET%
    if not "!ORIGINAL_PROJECT!"=="NONE" (
        gcloud config set project !ORIGINAL_PROJECT! >nul 2>&1
    )
    pause
    exit /b 0
)
echo.

REM Step 5: Set the project
echo [STEP 5/7] Setting project to: %YELLOW%!FSM_PROJECT!%RESET%
gcloud config set project !FSM_PROJECT!
if %errorlevel% neq 0 (
    echo %RED%ERROR: Failed to set project - Invalid project ID?%RESET%
    echo %YELLOW%Restoring original project...%RESET%
    if not "!ORIGINAL_PROJECT!"=="NONE" (
        gcloud config set project !ORIGINAL_PROJECT! >nul 2>&1
    )
    pause
    exit /b 1
)
echo %GREEN%✓ Project set successfully%RESET%
echo.

REM Step 6: Verify project was set correctly
echo [STEP 6/7] Verifying project was set correctly...
for /f "tokens=*" %%i in ('gcloud config get-value project 2^>nul') do set "VERIFY_PROJECT=%%i"
echo.
echo %YELLOW%========================================%RESET%
echo   ACTIVE PROJECT: %GREEN%!VERIFY_PROJECT!%RESET%
echo %YELLOW%========================================%RESET%
echo.
if not "!VERIFY_PROJECT!"=="!FSM_PROJECT!" (
    echo %RED%ERROR: Project mismatch detected!%RESET%
    echo Expected: !FSM_PROJECT!
    echo Got: !VERIFY_PROJECT!
    echo %YELLOW%Restoring original project...%RESET%
    if not "!ORIGINAL_PROJECT!"=="NONE" (
        gcloud config set project !ORIGINAL_PROJECT! >nul 2>&1
    )
    pause
    exit /b 1
)
echo.
set /p "CONFIRM=Are you SURE you want to deploy to !VERIFY_PROJECT!? (type YES to confirm): "
if /i not "!CONFIRM!"=="YES" (
    echo %RED%Deployment cancelled - restoring original project%RESET%
    if not "!ORIGINAL_PROJECT!"=="NONE" (
        gcloud config set project !ORIGINAL_PROJECT! >nul 2>&1
        echo %GREEN%Restored to: !ORIGINAL_PROJECT!%RESET%
    )
    pause
    exit /b 0
)
echo.

REM Step 7: Deploy
echo [STEP 7/7] Deploying to Google App Engine...
echo Target Project: %GREEN%!VERIFY_PROJECT!%RESET%
echo.
gcloud app deploy .deploy\app.generated.yaml --quiet
if %errorlevel% neq 0 (
    echo.
    echo %RED%========================================%RESET%
    echo %RED%   ERROR: Deployment failed          %RESET%
    echo %RED%========================================%RESET%
    echo.
    echo %YELLOW%Restoring original project...%RESET%
    if not "!ORIGINAL_PROJECT!"=="NONE" (
        gcloud config set project !ORIGINAL_PROJECT! >nul 2>&1
        echo %GREEN%Restored to: !ORIGINAL_PROJECT!%RESET%
    )
    pause
    exit /b 1
)
echo.
echo %GREEN%========================================%RESET%
echo %GREEN%   DEPLOYMENT SUCCESSFUL!             %RESET%
echo %GREEN%========================================%RESET%
echo.

REM Step 8: Final verification after deployment
echo [STEP 8/8] Final verification after deployment...
for /f "tokens=*" %%i in ('gcloud config get-value project 2^>nul') do set "FINAL_PROJECT=%%i"
echo.
echo %YELLOW%========================================%RESET%
echo   Deployed to: %GREEN%!FINAL_PROJECT!%RESET%
echo %YELLOW%========================================%RESET%
echo.
if not "!FINAL_PROJECT!"=="!FSM_PROJECT!" (
    echo %RED%WARNING: Active project changed during deployment!%RESET%
    echo Expected: !FSM_PROJECT!
    echo Current: !FINAL_PROJECT!
)

REM Show deployed URL
echo.
echo Getting deployment URL...
for /f "tokens=*" %%i in ('gcloud app browse --no-launch-browser 2^>^&1 ^| findstr "http"') do set "APP_URL=%%i"
if not "!APP_URL!"=="" (
    echo.
    echo %GREEN%Your app is deployed at:%RESET%
    echo %YELLOW%!APP_URL!%RESET%
    echo.
    echo Admin Dashboard: %YELLOW%!APP_URL!/admin%RESET%
)

REM Ask if user wants to restore original project
echo.
if not "!ORIGINAL_PROJECT!"=="NONE" (
    if not "!ORIGINAL_PROJECT!"=="!FINAL_PROJECT!" (
        echo.
        echo %YELLOW%========================================%RESET%
        echo   Original project: !ORIGINAL_PROJECT!
        echo   Current project:  !FINAL_PROJECT!
        echo %YELLOW%========================================%RESET%
        echo.
        set /p "RESTORE=Restore to original project? (yes/no): "
        if /i "!RESTORE!"=="yes" (
            gcloud config set project !ORIGINAL_PROJECT! >nul 2>&1
            echo %GREEN%Restored to: !ORIGINAL_PROJECT!%RESET%
        ) else (
            echo %YELLOW%Project remains: !FINAL_PROJECT!%RESET%
        )
    )
)

echo.
echo %GREEN%Deployment complete!%RESET%
pause
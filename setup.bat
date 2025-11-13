@echo off
echo ========================================
echo FSM App - Complete Setup Script
echo ========================================
echo.

echo [1/6] Installing dependencies...
call npm install
echo.

echo [2/6] Checking Supabase configuration...
findstr /C:"ktvrffbccgxtaststlhw" App.tsx >nul
if %errorlevel% equ 0 (
    echo [92m✓ Supabase configured[0m
) else (
    echo [93m! Supabase needs configuration in App.tsx[0m
)
echo.

echo [3/6] Verifying database schema file...
if exist "database\schema.sql" (
    echo [92m✓ Database schema found[0m
    echo.
    echo NEXT: Go to https://supabase.com/dashboard
    echo Project: ktvrffbccgxtaststlhw
    echo Run the SQL in database\schema.sql
) else (
    echo [91m✗ Database schema missing[0m
)
echo.

echo [4/6] Checking admin dashboard...
if exist "admin\index.html" (
    echo [92m✓ Admin dashboard ready[0m
    findstr /C:"ktvrffbccgxtaststlhw" admin\index.html >nul
    if %errorlevel% equ 0 (
        echo [92m✓ Admin dashboard configured[0m
    ) else (
        echo [93m! Admin dashboard needs Supabase config[0m
    )
) else (
    echo [91m✗ Admin dashboard missing[0m
)
echo.

echo [5/6] Checking deployment scripts...
if exist "deploy.bat" (
    echo [92m✓ Deployment script ready[0m
) else (
    echo [91m✗ Deployment script missing[0m
)
echo.

echo [6/6] Project structure...
echo.
dir /B /AD src 2>nul
echo.

echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo NEXT STEPS:
echo.
echo 1. Setup Database:
echo    - Visit https://supabase.com/dashboard/project/ktvrffbccgxtaststlhw
echo    - Go to SQL Editor
echo    - Run database\schema.sql
echo.
echo 2. Start Development:
echo    npm start
echo    (Then press 'a' for Android or 'w' for web)
echo.
echo 3. Deploy Admin Dashboard:
echo    .\deploy.bat
echo.
echo 4. Build Android APK:
echo    .\build-apk.bat
echo.
pause

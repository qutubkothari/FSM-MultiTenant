@echo off
echo ====================================
echo FSM Multi-Tenant Setup
echo ====================================
echo.
echo This script will help you set up the multi-tenant database.
echo.
echo Choose your setup method:
echo.
echo 1. Open Setup Tool in Browser (Recommended)
echo 2. Show SQL Migration File
echo 3. Open Supabase Dashboard
echo 4. View Setup Guide
echo.
set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" (
    echo.
    echo Opening setup tool...
    start setup-multitenant.html
    echo.
    echo ✅ Setup tool opened in your browser
    echo.
    echo Next steps:
    echo 1. Click "Run Migration" to create database structure
    echo 2. Click "Verify Setup" to check everything is correct
    echo 3. Fill in the form to create your first tenant
    echo.
    pause
    goto :menu
)

if "%choice%"=="2" (
    echo.
    echo Opening SQL migration file...
    start notepad database\multi-tenant-migration.sql
    echo.
    echo ✅ SQL file opened in Notepad
    echo.
    echo Next steps:
    echo 1. Copy all the contents
    echo 2. Go to Supabase Dashboard -^> SQL Editor
    echo 3. Paste and run the script
    echo.
    pause
    goto :menu
)

if "%choice%"=="3" (
    echo.
    echo Opening Supabase Dashboard...
    start https://app.supabase.com
    echo.
    echo ✅ Supabase Dashboard opened
    echo.
    echo Next steps:
    echo 1. Select your project
    echo 2. Go to SQL Editor
    echo 3. Create new query
    echo 4. Run the migration script
    echo.
    pause
    goto :menu
)

if "%choice%"=="4" (
    echo.
    echo Opening setup guide...
    start MULTITENANT_SETUP_GUIDE.md
    echo.
    echo ✅ Setup guide opened
    echo.
    pause
    goto :menu
)

:menu
echo.
set /p again="Do you want to do something else? (Y/N): "
if /i "%again%"=="Y" goto :start

:start
cls
echo ====================================
echo FSM Multi-Tenant Setup
echo ====================================
echo.
echo Choose an option:
echo.
echo 1. Open Setup Tool in Browser
echo 2. Show SQL Migration File
echo 3. Open Supabase Dashboard
echo 4. View Setup Guide
echo 5. Exit
echo.
set /p choice2="Enter your choice (1-5): "

if "%choice2%"=="1" (
    start setup-multitenant.html
    goto :menu
)
if "%choice2%"=="2" (
    start notepad database\multi-tenant-migration.sql
    goto :menu
)
if "%choice2%"=="3" (
    start https://app.supabase.com
    goto :menu
)
if "%choice2%"=="4" (
    start MULTITENANT_SETUP_GUIDE.md
    goto :menu
)
if "%choice2%"=="5" (
    echo.
    echo Goodbye!
    exit
)

goto :menu

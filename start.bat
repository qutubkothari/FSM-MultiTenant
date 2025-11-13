@echo off
echo ========================================
echo FSM Mobile App - Quick Start
echo ========================================
echo.

REM Check if node_modules exists
if not exist "node_modules\" (
    echo [1/4] Installing dependencies...
    call npm install
    echo.
) else (
    echo [1/4] Dependencies already installed.
    echo.
)

REM Check if .env exists
if not exist ".env" (
    echo [2/4] Creating .env file...
    copy .env.example .env
    echo Please edit .env file with your Supabase credentials!
    echo.
    pause
) else (
    echo [2/4] Environment file exists.
    echo.
)

REM Display next steps
echo [3/4] Next Steps:
echo.
echo 1. Set up Supabase:
echo    - Go to https://supabase.com
echo    - Create new project
echo    - Run SQL from database/schema.sql
echo    - Copy URL and anon key to .env and App.tsx
echo.
echo 2. Get OpenAI API key (optional):
echo    - Go to https://platform.openai.com
echo    - Create API key
echo    - Add to .env and App.tsx
echo.
echo [4/4] Starting development server...
echo.

REM Start the app
call npm start

pause

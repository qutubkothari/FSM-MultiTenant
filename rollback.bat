@echo off
echo ================================
echo FSM App - Quick Rollback Script
echo ================================
echo.
echo This will rollback to the previous version
echo.

REM List recent versions
echo Fetching recent versions...
gcloud app versions list --service=default --sort-by=~version.createTime --limit=5

echo.
echo Enter the version ID to rollback to (e.g., 20251123t122956):
set /p VERSION_ID=

echo.
echo Rolling back to version %VERSION_ID%...
gcloud app services set-traffic default --splits=%VERSION_ID%=1 --quiet

echo.
echo ================================
echo Rollback complete!
echo Check your app: https://fsm.saksolution.com
echo ================================
pause

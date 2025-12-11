@echo off
REM Quick rollback to previous version

echo Listing recent versions...
gcloud app versions list --service=default --sort-by=~version.createTime --limit=5

echo.
set /p OLD_VERSION="Enter the version ID to rollback to: "

echo.
echo Rolling back to version: %OLD_VERSION%
gcloud app services set-traffic default --splits=%OLD_VERSION%=1.0 --quiet

echo.
echo ✅ Rollback complete! All traffic now going to version: %OLD_VERSION%
echo.

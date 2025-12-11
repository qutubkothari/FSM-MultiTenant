@echo off
REM Safe deployment - does not affect live users
echo Building React app...
cd fsm-react
call npm run build
cd ..

echo Copying to dist-react...
powershell -Command "Remove-Item -Path dist-react -Recurse -Force -ErrorAction SilentlyContinue"
powershell -Command "Copy-Item -Path fsm-react\dist -Destination dist-react -Recurse"

echo Deploying to Google App Engine (NO TRAFFIC)...
gcloud app deploy --no-promote --quiet

echo.
echo ✅ Deployment complete! New version is live but receiving NO traffic.
echo.
echo To test the new version:
echo   gcloud app versions list
echo   Then visit: https://[VERSION]-dot-sak-fsm.el.r.appspot.com
echo.
echo To send 10%% traffic to new version:
echo   gcloud app services set-traffic default --splits=[NEW_VERSION]=0.1,[OLD_VERSION]=0.9
echo.
echo To fully migrate:
echo   gcloud app services set-traffic default --migrate
echo.

@echo off
REM Safe deployment - does not affect live users
setlocal

REM LOCKED PROJECT
set "FSM_PROJECT=sak-fsm"

REM Save original project (restore at end)
for /f "tokens=*" %%i in ('gcloud config get-value project 2^>nul') do set "ORIGINAL_PROJECT=%%i"
if "%ORIGINAL_PROJECT%"=="" set "ORIGINAL_PROJECT=NONE"

echo ========================================
echo SAFE DEPLOY (NO TRAFFIC)
echo LOCKED PROJECT: %FSM_PROJECT%
echo ========================================
echo.

REM Load deployment secrets (optional)
if exist .env.deploy (
	powershell -NoProfile -Command "$ErrorActionPreference='Stop'; Get-Content .env.deploy | Where-Object { $_ -and $_ -notmatch '^\s*#' -and $_ -match '=' } | ForEach-Object { $k,$v=$_.Split('=',2); [Environment]::SetEnvironmentVariable($k.Trim(),$v.Trim(),'Process') }"
)

REM Generate secrets-filled app yaml (ignored) from template
if not exist .deploy mkdir .deploy
powershell -NoProfile -Command "$ErrorActionPreference='Stop'; $tpl=Get-Content -Raw 'app.yaml'; foreach($k in 'SAK_API_KEY','SAK_SESSION_ID','INBOUND_SECRET','WEBHOOK_SECRET'){ if(-not $env:$k){ throw ('Missing required env var: '+$k+' (set it in .env.deploy)') } }; $out=$tpl.Replace('__SAK_API_KEY__',$env:SAK_API_KEY).Replace('__SAK_SESSION_ID__',$env:SAK_SESSION_ID).Replace('__INBOUND_SECRET__',$env:INBOUND_SECRET).Replace('__WEBHOOK_SECRET__',$env:WEBHOOK_SECRET); Set-Content -NoNewline -Path '.deploy\app.generated.yaml' -Value $out"

echo Committing changes to GitHub...
git add .
git commit -m "Auto-commit before deployment - %date% %time%" 2>nul
git push origin main
if %ERRORLEVEL% NEQ 0 (
	echo WARNING: Git push failed or nothing to commit. Continuing deployment...
)
echo.

echo Setting gcloud project to: %FSM_PROJECT% ...
call gcloud config set project %FSM_PROJECT% >nul
if %ERRORLEVEL% NEQ 0 (
	echo ERROR: Failed to set gcloud project to %FSM_PROJECT%!
	exit /b 1
)

for /f "tokens=*" %%i in ('gcloud config get-value project 2^>nul') do set "VERIFY_PROJECT=%%i"
if /i not "%VERIFY_PROJECT%"=="%FSM_PROJECT%" (
	echo ERROR: Project mismatch. Expected %FSM_PROJECT% but got %VERIFY_PROJECT%
	exit /b 1
)

echo Building React app...
cd fsm-react
call npm run build
cd ..

echo Copying to dist-react...
powershell -Command "Remove-Item -Path dist-react -Recurse -Force -ErrorAction SilentlyContinue"
powershell -Command "Copy-Item -Path fsm-react\dist -Destination dist-react -Recurse"

echo Deploying to Google App Engine (NO TRAFFIC)...
call gcloud app deploy .deploy\app.generated.yaml --no-promote --quiet --project=sak-fsm

REM Restore original project
if /i not "%ORIGINAL_PROJECT%"=="NONE" (
	call gcloud config set project %ORIGINAL_PROJECT% >nul
)

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

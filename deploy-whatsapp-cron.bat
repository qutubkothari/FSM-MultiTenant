@echo off
setlocal

REM LOCKED PROJECT
set "FSM_PROJECT=sak-fsm"

echo ========================================
echo DEPLOY WHATSAPP CRON SERVICE
echo LOCKED PROJECT: %FSM_PROJECT%
echo Service: whatsapp-cron
echo ========================================
echo.

REM Load deployment secrets (optional)
if exist .env.deploy (
  powershell -NoProfile -Command "$ErrorActionPreference='Stop'; Get-Content .env.deploy | Where-Object { $_ -and $_ -notmatch '^\s*#' -and $_ -match '=' } | ForEach-Object { $k,$v=$_.Split('=',2); [Environment]::SetEnvironmentVariable($k.Trim(),$v.Trim(),'Process') }"
)

REM Generate secrets-filled whatsapp-cron yaml (ignored) from template
if not exist .deploy mkdir .deploy
powershell -NoProfile -Command "$ErrorActionPreference='Stop'; $tpl=Get-Content -Raw 'app-whatsapp-cron.yaml'; foreach($k in @('SAK_API_KEY','SAK_SESSION_ID')){ if(-not [Environment]::GetEnvironmentVariable($k,'Process')){ throw ('Missing required env var: '+$k+' (set it in .env.deploy)') } }; $api=[Environment]::GetEnvironmentVariable('SAK_API_KEY','Process'); $sid=[Environment]::GetEnvironmentVariable('SAK_SESSION_ID','Process'); $out=$tpl.Replace('__SAK_API_KEY__',$api).Replace('__SAK_SESSION_ID__',$sid); Set-Content -NoNewline -Path '.deploy\app-whatsapp-cron.generated.yaml' -Value $out"

echo Deploying whatsapp-cron service...
gcloud app deploy .deploy\app-whatsapp-cron.generated.yaml --quiet --project=%FSM_PROJECT%
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo ERROR: Deploy failed.
  exit /b 1
)

echo.
echo ✅ whatsapp-cron deployed successfully.

@echo off
setlocal EnableDelayedExpansion

REM LOCKED PROJECT
set "FSM_PROJECT=sak-fsm"

echo ========================================
echo DEPLOY WHATSAPP CRON SERVICE
echo LOCKED PROJECT: %FSM_PROJECT%
echo Service: whatsapp-cron
echo ========================================
echo.

REM Load deployment secrets into this process (optional)
if exist .env.deploy (
  for /f "usebackq tokens=1,* delims==" %%A in (`findstr /R "^[A-Za-z_][A-Za-z0-9_]*=" .env.deploy`) do (
    set "%%A=%%B"
  )
)

REM Generate secrets-filled whatsapp-cron yaml (ignored) from template
if not exist .deploy mkdir .deploy
if "%SAK_API_KEY%"=="" (
  echo ERROR: Missing SAK_API_KEY ^(set it in .env.deploy^)
  exit /b 1
)
if "%SAK_SESSION_ID%"=="" (
  echo ERROR: Missing SAK_SESSION_ID ^(set it in .env.deploy^)
  exit /b 1
)

powershell -NoProfile -Command "$ErrorActionPreference='Stop'; $tpl=Get-Content -Raw 'app-whatsapp-cron.yaml'; $out=$tpl.Replace('__SAK_API_KEY__',$env:SAK_API_KEY).Replace('__SAK_SESSION_ID__',$env:SAK_SESSION_ID); Set-Content -NoNewline -Path '.deploy\app-whatsapp-cron.generated.yaml' -Value $out"
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo ERROR: Failed to generate .deploy\app-whatsapp-cron.generated.yaml
  exit /b 1
)

echo Deploying whatsapp-cron service...
gcloud app deploy .deploy\app-whatsapp-cron.generated.yaml --quiet --project=%FSM_PROJECT%
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo ERROR: Deploy failed.
  exit /b 1
)

echo.
echo ✅ whatsapp-cron deployed successfully.

@echo off
echo ========================================
echo Deleting All Old App Engine Versions
echo ========================================
echo.
echo Keeping only: 20251114t020305 (current)
echo.

cd /d "%~dp0"

echo Deleting old versions...
echo.

gcloud app versions delete 20251113t135043 --service=default --project=sak-fsm --quiet
gcloud app versions delete 20251113t142346 --service=default --project=sak-fsm --quiet
gcloud app versions delete 20251113t143009 --service=default --project=sak-fsm --quiet
gcloud app versions delete 20251113t162543 --service=default --project=sak-fsm --quiet
gcloud app versions delete 20251113t163432 --service=default --project=sak-fsm --quiet
gcloud app versions delete 20251113t170851 --service=default --project=sak-fsm --quiet
gcloud app versions delete 20251113t174008 --service=default --project=sak-fsm --quiet
gcloud app versions delete 20251113t175145 --service=default --project=sak-fsm --quiet
gcloud app versions delete 20251113t180504 --service=default --project=sak-fsm --quiet
gcloud app versions delete 20251113t181050 --service=default --project=sak-fsm --quiet
gcloud app versions delete 20251113t183154 --service=default --project=sak-fsm --quiet
gcloud app versions delete 20251113t184710 --service=default --project=sak-fsm --quiet
gcloud app versions delete 20251113t190459 --service=default --project=sak-fsm --quiet
gcloud app versions delete 20251113t191440 --service=default --project=sak-fsm --quiet
gcloud app versions delete 20251113t200841 --service=default --project=sak-fsm --quiet
gcloud app versions delete 20251113t212231 --service=default --project=sak-fsm --quiet
gcloud app versions delete 20251113t212731 --service=default --project=sak-fsm --quiet
gcloud app versions delete 20251113t215655 --service=default --project=sak-fsm --quiet
gcloud app versions delete 20251113t215955 --service=default --project=sak-fsm --quiet
gcloud app versions delete 20251113t220419 --service=default --project=sak-fsm --quiet
gcloud app versions delete 20251113t221753 --service=default --project=sak-fsm --quiet
gcloud app versions delete 20251113t222447 --service=default --project=sak-fsm --quiet
gcloud app versions delete mobile --service=default --project=sak-fsm --quiet
gcloud app versions delete react --service=default --project=sak-fsm --quiet

echo.
echo ========================================
echo Cleanup Complete!
echo ========================================
echo.
echo Remaining versions:
gcloud app versions list --service=default --project=sak-fsm
echo.
pause

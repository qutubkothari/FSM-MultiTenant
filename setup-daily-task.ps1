# FSM Daily Summary - Windows Task Scheduler Setup
# Run this in PowerShell as Administrator

$taskName = "FSM-Daily-Summaries"
$scriptPath = "C:\Users\musta\OneDrive\Documents\GitHub\FSM-MultiTenant\send-daily-summaries.js"
$logPath = "C:\Users\musta\OneDrive\Documents\GitHub\FSM-MultiTenant\logs"

# Create logs directory if it doesn't exist
if (-not (Test-Path $logPath)) {
    New-Item -ItemType Directory -Path $logPath -Force
}

# Delete existing task if it exists
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

# Create scheduled task action
$action = New-ScheduledTaskAction `
    -Execute "node.exe" `
    -Argument "`"$scriptPath`"" `
    -WorkingDirectory "C:\Users\musta\OneDrive\Documents\GitHub\FSM-MultiTenant"

# Create trigger - Daily at 6:00 PM
$trigger = New-ScheduledTaskTrigger -Daily -At "18:00"

# Create settings
$settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -DontStopIfGoingOnBatteries `
    -AllowStartIfOnBatteries

# Create principal (run as current user)
$principal = New-ScheduledTaskPrincipal `
    -UserId "$env:USERDOMAIN\$env:USERNAME" `
    -LogonType Interactive `
    -RunLevel Highest

# Register the task
Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Description "Send daily FSM summaries to salesmen and admins via WhatsApp at 6 PM"

Write-Host "`n✅ Task '$taskName' created successfully!" -ForegroundColor Green
Write-Host "📅 Schedule: Daily at 6:00 PM" -ForegroundColor Cyan
Write-Host "📂 Script: $scriptPath" -ForegroundColor Cyan
Write-Host "`nTo view the task:" -ForegroundColor Yellow
Write-Host "  Get-ScheduledTask -TaskName '$taskName'" -ForegroundColor White
Write-Host "`nTo test the task now:" -ForegroundColor Yellow
Write-Host "  Start-ScheduledTask -TaskName '$taskName'" -ForegroundColor White
Write-Host "`nTo disable the task:" -ForegroundColor Yellow
Write-Host "  Disable-ScheduledTask -TaskName '$taskName'" -ForegroundColor White

# Setup Daily Database Backup - Task Scheduler
# This script creates a Windows scheduled task to run the backup daily

$ScriptPath = Join-Path $PSScriptRoot "backup-complete.ps1"
$TaskName = "FSM Database Backup to OneDrive"
$TaskDescription = "Daily backup of FSM Supabase database (config + visits) to OneDrive"
$BackupTime = "02:00"  # Run at 2 AM daily

Write-Host "`n=== Setting Up Daily Database Backup ===" -ForegroundColor Cyan

# Check if script exists
if (-not (Test-Path $ScriptPath)) {
    Write-Host "ERROR: backup-complete.ps1 not found!" -ForegroundColor Red
    Write-Host "Path: $ScriptPath" -ForegroundColor Yellow
    exit 1
}

Write-Host "Backup script: $ScriptPath" -ForegroundColor White
Write-Host "Schedule: Daily at $BackupTime" -ForegroundColor White

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "`nWARNING: Not running as Administrator!" -ForegroundColor Yellow
    Write-Host "Scheduled task may not be created with proper permissions." -ForegroundColor Yellow
    Write-Host "`nTo run as Administrator:" -ForegroundColor Cyan
    Write-Host "1. Right-click PowerShell" -ForegroundColor White
    Write-Host "2. Select 'Run as Administrator'" -ForegroundColor White
    Write-Host "3. Run this script again`n" -ForegroundColor White
    
    $response = Read-Host "Continue anyway? (y/n)"
    if ($response -ne 'y') {
        exit 0
    }
}

try {
    # Check if task already exists
    $existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    
    if ($existingTask) {
        Write-Host "`nTask already exists. Removing old task..." -ForegroundColor Yellow
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    }
    
    # Create the scheduled task action
    $action = New-ScheduledTaskAction `
        -Execute "PowerShell.exe" `
        -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`"" `
        -WorkingDirectory $PSScriptRoot
    
    # Create the trigger (daily at specified time)
    $trigger = New-ScheduledTaskTrigger -Daily -At $BackupTime
    
    # Create additional trigger (at system startup, delayed by 5 minutes)
    $startupTrigger = New-ScheduledTaskTrigger -AtStartup
    $startupTrigger.Delay = "PT5M"  # 5 minute delay
    
    # Combine triggers
    $triggers = @($trigger, $startupTrigger)
    
    # Create the principal (run as current user)
    $principal = New-ScheduledTaskPrincipal `
        -UserId $env:USERNAME `
        -LogonType S4U `
        -RunLevel Highest
    
    # Create settings
    $settings = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -StartWhenAvailable `
        -RunOnlyIfNetworkAvailable `
        -ExecutionTimeLimit (New-TimeSpan -Hours 1)
    
    # Register the scheduled task
    Write-Host "`nCreating scheduled task..." -ForegroundColor Cyan
    Register-ScheduledTask `
        -TaskName $TaskName `
        -Description $TaskDescription `
        -Action $action `
        -Trigger $triggers `
        -Principal $principal `
        -Settings $settings `
        -Force | Out-Null
    
    Write-Host "✓ Scheduled task created successfully!" -ForegroundColor Green
    Write-Host "`nTask Details:" -ForegroundColor Cyan
    Write-Host "  Name: $TaskName" -ForegroundColor White
    Write-Host "  Schedule: Daily at $BackupTime" -ForegroundColor White
    Write-Host "  Also runs: 5 minutes after system startup" -ForegroundColor White
    Write-Host "  User: $env:USERNAME" -ForegroundColor White
    
    Write-Host "`n✓ Backup will run automatically!" -ForegroundColor Green
    Write-Host "`nYou can:" -ForegroundColor Cyan
    Write-Host "  - View task in Task Scheduler (taskschd.msc)" -ForegroundColor White
    Write-Host "  - Test backup now: .\backup-database.ps1" -ForegroundColor White
    Write-Host "  - Run task manually: Start-ScheduledTask -TaskName '$TaskName'" -ForegroundColor White
    
    # Ask if user wants to test now
    Write-Host "`n" -NoNewline
    $testNow = Read-Host "Would you like to test the backup now? (y/n)"
    
    if ($testNow -eq 'y') {
        Write-Host "`nRunning backup test..." -ForegroundColor Cyan
        & $ScriptPath
    }
    
} catch {
    Write-Host "`n✗ Failed to create scheduled task!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "`nPlease run PowerShell as Administrator and try again." -ForegroundColor Yellow
    exit 1
}

Write-Host "`n=================================`n" -ForegroundColor Cyan

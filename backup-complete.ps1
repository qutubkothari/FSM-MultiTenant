# Master Backup Script - Runs both configuration and visits backups
# This should be scheduled to run daily

param(
    [string]$BackupFolder = "C:\Users\musta\OneDrive\Database Backups\FSM"
)

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  FSM Database - Complete Daily Backup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Started: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n" -ForegroundColor White

$scriptPath = $PSScriptRoot
$startTime = Get-Date

# Step 1: Backup configuration data
Write-Host "[1/2] Backing up configuration data..." -ForegroundColor Yellow

$configBackupScript = Join-Path $scriptPath "backup-database.ps1"
if (Test-Path $configBackupScript) {
    & $configBackupScript
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Configuration backup completed" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Configuration backup failed" -ForegroundColor Red
    }
} else {
    Write-Host "[FAIL] Configuration backup script not found" -ForegroundColor Red
}

Write-Host ""

# Step 2: Backup visits data
Write-Host "[2/2] Backing up visits data..." -ForegroundColor Yellow

$visitsBackupScript = Join-Path $scriptPath "backup-visits.ps1"
if (Test-Path $visitsBackupScript) {
    & $visitsBackupScript
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Visits backup completed" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Visits backup failed" -ForegroundColor Red
    }
} else {
    Write-Host "[FAIL] Visits backup script not found" -ForegroundColor Red
}

# Summary
$duration = (Get-Date) - $startTime
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Backup Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "Completed: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor White
Write-Host "Duration: $([math]::Round($duration.TotalSeconds, 1)) seconds" -ForegroundColor White

# Show backup files
Write-Host "`nBackup Location: $BackupFolder" -ForegroundColor Cyan

# Configuration backups
$configBackups = Get-ChildItem -Path $BackupFolder -Filter "FSM_Backup_*.json.zip" -ErrorAction SilentlyContinue | 
    Sort-Object CreationTime -Descending | Select-Object -First 1

if ($configBackups) {
    $sizeMB = [math]::Round($configBackups.Length / 1KB, 2)
    Write-Host "  Config: $($configBackups.Name) ($sizeMB KB)" -ForegroundColor White
}

# Visits backups
$visitsBackups = Get-ChildItem -Path "$BackupFolder\Visits" -Filter "Visits_Backup_*.json.zip" -ErrorAction SilentlyContinue | 
    Sort-Object CreationTime -Descending | Select-Object -First 1

if ($visitsBackups) {
    $sizeMB = [math]::Round($visitsBackups.Length / 1MB, 2)
    Write-Host "  Visits: $($visitsBackups.Name) ($sizeMB MB)" -ForegroundColor White
}

# Calculate total size
$allBackups = Get-ChildItem -Path $BackupFolder -Recurse -Filter "*.zip" -ErrorAction SilentlyContinue
$totalSize = ($allBackups | Measure-Object -Property Length -Sum).Sum
$totalSizeMB = [math]::Round($totalSize / 1MB, 2)

Write-Host "`nTotal backups: $($allBackups.Count) files ($totalSizeMB MB)" -ForegroundColor Cyan
Write-Host "All backups synced to OneDrive" -ForegroundColor Green
Write-Host ""

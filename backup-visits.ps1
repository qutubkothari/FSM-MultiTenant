# Supabase Visits Data Backup Script
# Backs up visits data in chunks to handle large tables

param(
    [string]$BackupFolder = "C:\Users\musta\OneDrive\Database Backups\FSM\Visits",
    [int]$DaysToKeep = 30  # Keep visits backup for 30 days
)

# Configuration
$SUPABASE_URL = "https://ktvrffbccgxtaststlhw.supabase.co"
$SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0dnJmZmJjY2d4dGFzdHN0bGh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzAxNjczMiwiZXhwIjoyMDc4NTkyNzMyfQ.F16AQfkbIg3YFOsENK8KeTInooCdfR5XGMPN6raU0kA"
$BACKUP_FOLDER = $BackupFolder
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$BACKUP_FILE = "Visits_Backup_$TIMESTAMP.json"
$BACKUP_PATH = Join-Path $BACKUP_FOLDER $BACKUP_FILE

# Colors
$ErrorColor = "Red"
$SuccessColor = "Green"
$InfoColor = "Cyan"

Write-Host "`n=== Visits Data Backup ===" -ForegroundColor $InfoColor
Write-Host "Starting backup at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor $InfoColor

# Create backup folder
if (-not (Test-Path $BACKUP_FOLDER)) {
    Write-Host "Creating backup folder: $BACKUP_FOLDER" -ForegroundColor $InfoColor
    New-Item -ItemType Directory -Path $BACKUP_FOLDER -Force | Out-Null
}

$headers = @{
    'apikey' = $SUPABASE_SERVICE_KEY
    'Authorization' = "Bearer $SUPABASE_SERVICE_KEY"
    'Content-Type' = 'application/json'
    'Prefer' = 'count=exact'
}

try {
    Write-Host "Connecting to Supabase..." -ForegroundColor $InfoColor
    
    # Get total count first
    Write-Host "Counting visits records..." -ForegroundColor $InfoColor -NoNewline
    $countUrl = "$SUPABASE_URL/rest/v1/visits?select=id&limit=1"
    $countResponse = Invoke-WebRequest -Uri $countUrl -Method GET -Headers $headers -UseBasicParsing
    $totalCount = [int]($countResponse.Headers['Content-Range'] -split '/')[1]
    Write-Host " $totalCount records found" -ForegroundColor Green
    
    if ($totalCount -eq 0) {
        Write-Host "No visits data to backup" -ForegroundColor Yellow
        exit 0
    }
    
    # Fetch data in chunks
    $allVisits = @()
    $chunkSize = 500  # Smaller chunks for large data
    $chunks = [math]::Ceiling($totalCount / $chunkSize)
    
    Write-Host "Downloading in $chunks chunks of $chunkSize records..." -ForegroundColor $InfoColor
    
    for ($i = 0; $i -lt $chunks; $i++) {
        $offset = $i * $chunkSize
        $progress = [math]::Round((($i + 1) / $chunks) * 100, 1)
        
        Write-Host "  Chunk $($i + 1)/$chunks ($progress%) " -ForegroundColor Gray -NoNewline
        
        try {
            $url = "$SUPABASE_URL/rest/v1/visits?limit=$chunkSize&offset=$offset&order=created_at.desc"
            $params = @{
                Uri = $url
                Method = 'GET'
                Headers = $headers
                TimeoutSec = 60
            }
            
            $chunk = Invoke-RestMethod @params
            $allVisits += $chunk
            
            Write-Host "✓ $($chunk.Count) records" -ForegroundColor Green
            
            # Small delay to avoid rate limiting
            Start-Sleep -Milliseconds 100
            
        } catch {
            Write-Host "✗ ERROR: $($_.Exception.Message)" -ForegroundColor Red
            # Continue with remaining chunks
        }
    }
    
    $backupData = @{
        timestamp = $TIMESTAMP
        version = "1.1.0"
        total_records = $allVisits.Count
        backup_date = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
        visits = $allVisits
    }
    
    Write-Host "`nSaving backup file..." -ForegroundColor $InfoColor
    $json = $backupData | ConvertTo-Json -Depth 10 -Compress
    [System.IO.File]::WriteAllText($BACKUP_PATH, $json, [System.Text.Encoding]::UTF8)
    
    if (Test-Path $BACKUP_PATH) {
        $fileSize = (Get-Item $BACKUP_PATH).Length
        $fileSizeMB = [math]::Round($fileSize / 1MB, 2)
        
        Write-Host "`n✓ Backup saved successfully!" -ForegroundColor $SuccessColor
        Write-Host "File: $BACKUP_FILE" -ForegroundColor $SuccessColor
        Write-Host "Records: $($allVisits.Count) visits" -ForegroundColor $SuccessColor
        Write-Host "Size: $fileSizeMB MB" -ForegroundColor $SuccessColor
        
        # Compress
        Write-Host "`nCompressing..." -ForegroundColor $InfoColor
        $zipPath = "$BACKUP_PATH.zip"
        Compress-Archive -Path $BACKUP_PATH -DestinationPath $zipPath -Force
        Remove-Item $BACKUP_PATH
        
        $zipSize = (Get-Item $zipPath).Length
        $zipSizeMB = [math]::Round($zipSize / 1MB, 2)
        $ratio = [math]::Round((1 - ($zipSize / $fileSize)) * 100, 1)
        
        Write-Host "✓ Compressed to: $zipSizeMB MB (saved $ratio%)" -ForegroundColor $SuccessColor
        Write-Host "Location: $zipPath" -ForegroundColor $SuccessColor
        
    } else {
        throw "Backup file not created"
    }
    
} catch {
    Write-Host "`n✗ Backup failed!" -ForegroundColor $ErrorColor
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor $ErrorColor
    exit 1
}

# Cleanup old backups
Write-Host "`nCleaning up old backups (keeping last $DaysToKeep days)..." -ForegroundColor $InfoColor
$cutoffDate = (Get-Date).AddDays(-$DaysToKeep)
$oldBackups = Get-ChildItem -Path $BACKUP_FOLDER -Filter "Visits_Backup_*.json.zip" | 
    Where-Object { $_.CreationTime -lt $cutoffDate }

if ($oldBackups.Count -gt 0) {
    Write-Host "Removing $($oldBackups.Count) old backup(s)" -ForegroundColor Yellow
    $oldBackups | ForEach-Object {
        Write-Host "  - $($_.Name)" -ForegroundColor Gray
        Remove-Item $_.FullName -Force
    }
} else {
    Write-Host "No old backups to remove" -ForegroundColor Gray
}

# Show current backups
$backups = Get-ChildItem -Path $BACKUP_FOLDER -Filter "Visits_Backup_*.json.zip" | 
    Sort-Object CreationTime -Descending

Write-Host "`nCurrent backups ($($backups.Count)):" -ForegroundColor $InfoColor
$totalSize = 0
$backups | ForEach-Object {
    $sizeMB = [math]::Round($_.Length / 1MB, 2)
    $totalSize += $_.Length
    $age = (Get-Date) - $_.CreationTime
    Write-Host "  $($_.Name) - $sizeMB MB - $([math]::Floor($age.TotalDays)) days old" -ForegroundColor White
}

$totalSizeMB = [math]::Round($totalSize / 1MB, 2)
Write-Host "`nTotal backup size: $totalSizeMB MB" -ForegroundColor $InfoColor

Write-Host "`nBackup completed at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor $SuccessColor
Write-Host "=================================`n" -ForegroundColor $InfoColor

# Supabase Database Backup Script (REST API Method)
# Backs up the database daily to OneDrive using Supabase REST API

param(
    [string]$BackupFolder = "C:\Users\musta\OneDrive\Database Backups\FSM",
    [int]$DaysToKeep = 7
)

# Configuration
$SUPABASE_URL = "https://ktvrffbccgxtaststlhw.supabase.co"
$SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0dnJmZmJjY2d4dGFzdHN0bGh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzAxNjczMiwiZXhwIjoyMDc4NTkyNzMyfQ.F16AQfkbIg3YFOsENK8KeTInooCdfR5XGMPN6raU0kA"  # SERVICE ROLE KEY - READ ONLY FOR BACKUPS
$BACKUP_FOLDER = $BackupFolder
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$BACKUP_FILE = "FSM_Backup_$TIMESTAMP.json"
$BACKUP_PATH = Join-Path $BACKUP_FOLDER $BACKUP_FILE

# Colors for output
$ErrorColor = "Red"
$SuccessColor = "Green"
$InfoColor = "Cyan"

Write-Host "`n=== Supabase Database Backup (REST API) ===" -ForegroundColor $InfoColor
Write-Host "Starting backup at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor $InfoColor

# Check if service key is set
if ([string]::IsNullOrWhiteSpace($SUPABASE_SERVICE_KEY)) {
    Write-Host "`nERROR: Service key not configured!" -ForegroundColor $ErrorColor
    Write-Host "Please edit backup-database.ps1 and set SUPABASE_SERVICE_KEY" -ForegroundColor Yellow
    Write-Host "`nTo find your service key:" -ForegroundColor Yellow
    Write-Host "1. Go to https://supabase.com/dashboard/project/ktvrffbccgxtaststlhw/settings/api" -ForegroundColor White
    Write-Host "2. Copy the 'service_role' key (NOT the anon key!)" -ForegroundColor White
    Write-Host "3. Update line 11 with: `$SUPABASE_SERVICE_KEY = 'your_service_key_here'" -ForegroundColor White
    Write-Host "`n⚠️  IMPORTANT: Keep the service key secret! It has full database access." -ForegroundColor Yellow
    exit 1
}

# Create backup folder if it doesn't exist
if (-not (Test-Path $BACKUP_FOLDER)) {
    Write-Host "Creating backup folder: $BACKUP_FOLDER" -ForegroundColor $InfoColor
    New-Item -ItemType Directory -Path $BACKUP_FOLDER -Force | Out-Null
}

# Tables to backup
$tables = @(
    'tenants',
    'users',
    'plants',
    'products',
    'customers',
    'salesmen',
    'visits',
    'salesman_targets'
)

$backupData = @{
    timestamp = $TIMESTAMP
    version = "1.1.0"
    tables = @{}
}

try {
    Write-Host "Connecting to Supabase..." -ForegroundColor $InfoColor
    Write-Host "URL: $SUPABASE_URL" -ForegroundColor Gray
    
    $headers = @{
        'apikey' = $SUPABASE_SERVICE_KEY
        'Authorization' = "Bearer $SUPABASE_SERVICE_KEY"
        'Content-Type' = 'application/json'
    }
    
    $totalRecords = 0
    
    foreach ($table in $tables) {
        Write-Host "Backing up table: $table" -ForegroundColor $InfoColor -NoNewline
        
        try {
            $allRecords = @()
            $pageSize = 1000
            $offset = 0
            $hasMore = $true
            
            while ($hasMore) {
                # Fetch records with pagination
                $url = "$SUPABASE_URL/rest/v1/$table`?limit=$pageSize&offset=$offset"
                $params = @{
                    Uri = $url
                    Method = 'GET'
                    Headers = $headers
                    TimeoutSec = 30
                }
                
                $response = Invoke-RestMethod @params
                
                if ($response.Count -gt 0) {
                    $allRecords += $response
                    $offset += $pageSize
                } else {
                    $hasMore = $false
                }
            }
            
            $recordCount = $allRecords.Count
            $totalRecords += $recordCount
            
            $backupData.tables[$table] = $allRecords
            
            Write-Host " - $recordCount records" -ForegroundColor Green
            
        } catch {
            Write-Host " - ERROR: $($_.Exception.Message)" -ForegroundColor Red
            # Continue with other tables even if one fails
        }
    }
    
    # Save to JSON file
    Write-Host "`nSaving backup file..." -ForegroundColor $InfoColor
    $backupData | ConvertTo-Json -Depth 10 | Out-File -FilePath $BACKUP_PATH -Encoding UTF8
    
    if (Test-Path $BACKUP_PATH) {
        $fileSize = (Get-Item $BACKUP_PATH).Length
        $fileSizeMB = [math]::Round($fileSize / 1MB, 2)
        
        Write-Host "`n✓ Backup completed successfully!" -ForegroundColor $SuccessColor
        Write-Host "File: $BACKUP_FILE" -ForegroundColor $SuccessColor
        Write-Host "Records: $totalRecords" -ForegroundColor $SuccessColor
        Write-Host "Size: $fileSizeMB MB" -ForegroundColor $SuccessColor
        Write-Host "Location: $BACKUP_PATH" -ForegroundColor $SuccessColor
        
        # Compress the backup to save space
        Write-Host "`nCompressing backup..." -ForegroundColor $InfoColor
        $zipPath = "$BACKUP_PATH.zip"
        Compress-Archive -Path $BACKUP_PATH -DestinationPath $zipPath -Force
        Remove-Item $BACKUP_PATH  # Remove uncompressed file
        
        $zipSize = (Get-Item $zipPath).Length
        $zipSizeMB = [math]::Round($zipSize / 1MB, 2)
        $compressionRatio = [math]::Round((1 - ($zipSize / $fileSize)) * 100, 1)
        Write-Host "✓ Compressed to: $zipSizeMB MB ($compressionRatio% savings)" -ForegroundColor $SuccessColor
        
    } else {
        throw "Backup file was not created"
    }
    
} catch {
    Write-Host "`n✗ Backup failed!" -ForegroundColor $ErrorColor
    Write-Host "Error: $_" -ForegroundColor $ErrorColor
    exit 1
}

# Cleanup old backups (keep only last N days)
Write-Host "`nCleaning up old backups..." -ForegroundColor $InfoColor
$cutoffDate = (Get-Date).AddDays(-$DaysToKeep)
$oldBackups = Get-ChildItem -Path $BACKUP_FOLDER -Filter "FSM_Backup_*.json.zip" | 
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

# Show remaining backups
$remainingBackups = Get-ChildItem -Path $BACKUP_FOLDER -Filter "FSM_Backup_*.json.zip" | 
    Sort-Object CreationTime -Descending

Write-Host "`nCurrent backups ($($remainingBackups.Count)):" -ForegroundColor $InfoColor
$remainingBackups | ForEach-Object {
    $sizeMB = [math]::Round($_.Length / 1MB, 2)
    $age = (Get-Date) - $_.CreationTime
    Write-Host "  $($_.Name) - $sizeMB MB - $([math]::Floor($age.TotalDays)) days old" -ForegroundColor White
}

Write-Host "`nBackup completed at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor $SuccessColor
Write-Host "=================================`n" -ForegroundColor $InfoColor

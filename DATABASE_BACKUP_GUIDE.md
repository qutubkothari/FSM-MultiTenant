# Database Backup System

Automated daily backup of FSM Supabase database to OneDrive.

## Setup Instructions

### 1. Install PostgreSQL Client Tools

The backup script needs `pg_dump` to export the database.

**Option A: Direct Download**
- Download from: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
- Install PostgreSQL (you only need the command-line tools)
- Add to PATH: `C:\Program Files\PostgreSQL\16\bin`

**Option B: Using Chocolatey**
```powershell
choco install postgresql
```

### 2. Get Your Database Password

1. Go to your Supabase dashboard
2. Navigate to: Project Settings → Database
3. Click "Reset database password" if needed
4. Copy the password (you'll need it in the next step)

URL: https://supabase.com/dashboard/project/ktvrffbccgxtaststlhw/settings/database

### 3. Configure the Backup Script

Edit `backup-database.ps1` and update line 11:

```powershell
$SUPABASE_DB_PASSWORD = "your_password_here"  # ADD YOUR PASSWORD
```

### 4. Test the Backup

Run a manual backup to test:

```powershell
.\backup-database.ps1
```

This will:
- Connect to your Supabase database
- Export all data to SQL file
- Compress it to save space
- Save to: `C:\Users\musta\OneDrive\Database Backups\FSM\`

### 5. Setup Automatic Daily Backups

Run PowerShell as Administrator and execute:

```powershell
.\setup-daily-backup.ps1
```

This creates a Windows scheduled task that will:
- Run every day at 2:00 AM
- Also run 5 minutes after system startup
- Keep the last 7 days of backups
- Automatically delete older backups

## Backup Location

Backups are saved to:
```
C:\Users\musta\OneDrive\Database Backups\FSM\
```

Files are named: `FSM_Backup_YYYYMMDD_HHMMSS.sql.zip`

Example: `FSM_Backup_20251128_020000.sql.zip`

## Manual Commands

### Run Backup Now
```powershell
.\backup-database.ps1
```

### Run Scheduled Task Manually
```powershell
Start-ScheduledTask -TaskName "FSM Database Backup to OneDrive"
```

### View Task in Task Scheduler
```powershell
taskschd.msc
```

### Check Backup History
```powershell
Get-ChildItem "C:\Users\musta\OneDrive\Database Backups\FSM\" | Sort-Object CreationTime -Descending
```

### Remove Scheduled Task
```powershell
Unregister-ScheduledTask -TaskName "FSM Database Backup to OneDrive" -Confirm:$false
```

## Restore from Backup

To restore a backup:

1. Extract the `.sql.zip` file
2. Use `psql` to restore:

```powershell
$env:PGPASSWORD = "your_password"
psql -h db.ktvrffbccgxtaststlhw.supabase.co -p 5432 -U postgres -d postgres -f "FSM_Backup_20251128_020000.sql"
```

**⚠️ WARNING:** Restoring will overwrite existing data!

## Settings

You can customize these in `backup-database.ps1`:

- **Backup folder**: Line 8 - `$BackupFolder`
- **Days to keep**: Line 9 - `$DaysToKeep` (default: 7)

You can customize the schedule in `setup-daily-backup.ps1`:

- **Backup time**: Line 6 - `$BackupTime` (default: "02:00")

## Troubleshooting

### "pg_dump not found"
- Install PostgreSQL client tools (see step 1)
- Make sure `C:\Program Files\PostgreSQL\16\bin` is in your PATH

### "Database password not configured"
- Edit `backup-database.ps1` and add your password (see step 3)

### "Access denied" or "Permission denied"
- Run PowerShell as Administrator when setting up the scheduled task

### Backup not running automatically
- Check Task Scheduler (`taskschd.msc`)
- Look for "FSM Database Backup to OneDrive"
- Check "Last Run Result" column

## Security Notes

⚠️ **Important**: The database password is stored in the script file.

To secure it:
1. Keep `backup-database.ps1` in a secure location
2. Don't commit it to Git (add to `.gitignore`)
3. Set file permissions to restrict access
4. Consider using Windows Credential Manager instead

## What Gets Backed Up

The backup includes:
- All tables and data
- Functions and procedures
- Views
- Sequences
- Indexes
- Triggers

The backup does NOT include:
- Supabase Storage files (uploaded images, etc.)
- Authentication users (managed by Supabase Auth)

## OneDrive Sync

Since backups are saved to OneDrive:
- ✓ Automatically synced to cloud
- ✓ Accessible from any device
- ✓ Protected by Microsoft's redundancy
- ✓ Can restore even if local machine fails

Make sure OneDrive is running and syncing properly.

## Backup Size

Typical backup sizes:
- Raw SQL: 5-50 MB (depends on data)
- Compressed: 1-10 MB (80-90% compression)

With 7 days retention, expect 7-70 MB total.

$ErrorActionPreference='Stop'
$taskRepo=$PSScriptRoot
$taskRuntime=Join-Path (Split-Path $taskRepo -Parent) 'Instagram-4.0-local'
$taskDocker=Join-Path $env:LOCALAPPDATA 'Programs\DockerDesktop\resources\bin\docker.exe'
if(-not(Test-Path -LiteralPath $taskDocker)){$taskDocker='C:\Program Files\Docker\Docker\resources\bin\docker.exe'}
& $taskDocker compose --project-directory $taskRepo up -d --wait postgres
if($LASTEXITCODE -ne 0){throw 'Docker Engine is not ready.'}
$taskCount=& $taskDocker compose --project-directory $taskRepo exec -T postgres psql -U postgres -d Instagram -At -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'"
if($LASTEXITCODE -ne 0 -or [int]$taskCount -gt 0){throw 'Destination DB is not empty. Refusing to overwrite it.'}
$taskBackup=Join-Path $taskRuntime ('backup-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'.sql')
$taskOldPassword=$env:PGPASSWORD
try {
 $env:PGPASSWORD='postgres'
 & (Join-Path $taskRuntime 'postgresql-16\pgsql\bin\pg_dump.exe') -h 127.0.0.1 -p 55432 -U postgres -d Instagram --no-owner --no-acl --file=$taskBackup
 if($LASTEXITCODE -ne 0){throw 'Backup failed. Source database was preserved.'}
} finally {$env:PGPASSWORD=$taskOldPassword}
$taskContainer=& $taskDocker compose --project-directory $taskRepo ps -q postgres
& $taskDocker cp $taskBackup (""+$taskContainer+':/tmp/instagram-backup.sql')
if($LASTEXITCODE -ne 0){throw 'Copying backup failed.'}
& $taskDocker compose --project-directory $taskRepo exec -T postgres psql -v ON_ERROR_STOP=1 -U postgres -d Instagram -f /tmp/instagram-backup.sql
if($LASTEXITCODE -ne 0){throw 'Restore failed. Source DB and SQL backup remain available.'}
Write-Output "DB restored to Docker. Backup retained: $taskBackup"
Write-Output 'Verify accounts/posts, then stop portable launch and run Run-Local.ps1 (Docker is the default).'

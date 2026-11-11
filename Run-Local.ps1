param([switch]$Stop, [switch]$Status, [ValidateSet('Docker','Portable')][string]$Database = 'Docker')
$ErrorActionPreference = 'Stop'
$taskRepo = $PSScriptRoot
$taskRuntime = Join-Path (Split-Path $taskRepo -Parent) 'Instagram-4.0-local'
New-Item -ItemType Directory -Path $taskRuntime -Force | Out-Null
$taskPgBin = Join-Path $taskRuntime 'postgresql-16\pgsql\bin'
$taskPgData = Join-Path $taskRuntime 'data'
$taskPidFile = Join-Path $taskRuntime 'app-processes.json'
$taskBackend = Join-Path $taskRepo 'Source_Code\backend'
$taskFrontend = Join-Path $taskRepo 'Source_Code\frontend'
$taskAppScript = Join-Path $taskBackend 'src\app.js'
$taskDocker = Join-Path $env:LOCALAPPDATA 'Programs\DockerDesktop\resources\bin\docker.exe'
if (-not (Test-Path -LiteralPath $taskDocker)) { $taskDocker = 'C:\Program Files\Docker\Docker\resources\bin\docker.exe' }
$taskViteScript = Join-Path $taskFrontend 'node_modules\vite\bin\vite.js'
$taskNodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
$taskNode = if ($taskNodeCommand) { $taskNodeCommand.Source } else {
    Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
}

function Test-TaskUrl([string]$taskUrl) {
    & $taskNode -e 'fetch(process.argv[1], {signal: AbortSignal.timeout(2000)}).then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))' $taskUrl
    return $LASTEXITCODE -eq 0
}
function Get-TaskStatus {
    $taskActualProvider=$Database
    if(Test-Path -LiteralPath $taskPidFile){$taskInfo=Get-Content -LiteralPath $taskPidFile -Raw|ConvertFrom-Json;if($taskInfo.database){$taskActualProvider=$taskInfo.database}}
    [pscustomobject]@{
        Frontend = Test-TaskUrl 'http://localhost:5173/'
        BackendAndDatabase = Test-TaskUrl 'http://localhost:8000/health'
        DatabaseProvider = $taskActualProvider
        DatabasePort = if ($taskActualProvider -eq 'Docker') { 5432 } else { 55432 }
    }
}
if ($Status) { Get-TaskStatus | Format-List; return }
if ($Stop) {
    if(Test-Path -LiteralPath $taskPidFile){$taskInfo=Get-Content -LiteralPath $taskPidFile -Raw|ConvertFrom-Json;if($taskInfo.database){$Database=$taskInfo.database}}
    if (Test-Path -LiteralPath $taskPidFile) {
        $taskSaved = Get-Content -LiteralPath $taskPidFile -Raw | ConvertFrom-Json
        foreach ($taskSavedProcess in @($taskSaved.backend, $taskSaved.frontend)) {
            $taskProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $($taskSavedProcess.id)" -ErrorAction SilentlyContinue
            # A saved PID must still belong to the exact Node script we started.
            if ($taskProcess -and $taskProcess.Name -eq 'node.exe' -and $taskProcess.CommandLine.Contains($taskSavedProcess.script)) {
                Stop-Process -Id $taskSavedProcess.id
            }
        }
    }
    if ($Database -eq 'Portable') {
    & (Join-Path $taskPgBin 'pg_ctl.exe') -D $taskPgData status *> $null
    if ($LASTEXITCODE -eq 0) {
        & (Join-Path $taskPgBin 'pg_ctl.exe') -D $taskPgData -m fast -w stop
        if ($LASTEXITCODE -ne 0) { throw 'Unable to stop the demo database.' }
    }
    } else { & $taskDocker compose --project-directory $taskRepo stop postgres }
    Write-Output 'Local Instagram processes stopped.'
    return
}

foreach ($taskRequiredFile in @($taskNode, $taskAppScript, $taskViteScript)) {
    if (-not (Test-Path -LiteralPath $taskRequiredFile)) { throw "Missing runtime file: $taskRequiredFile" }
}
if ($Database -eq 'Docker') {
    & $taskDocker compose --project-directory $taskRepo up -d --wait postgres
    if ($LASTEXITCODE -ne 0) { throw 'Docker Engine is unavailable. Run Setup-Docker.ps1 as Administrator, restart Windows if required, then open Docker Desktop.' }
} else {
& (Join-Path $taskPgBin 'pg_ctl.exe') -D $taskPgData status *> $null
if ($LASTEXITCODE -ne 0) {
    & (Join-Path $taskPgBin 'pg_ctl.exe') -D $taskPgData -l (Join-Path $taskRuntime 'postgres.log') -o '-p 55432 -h 127.0.0.1' -w start
    if ($LASTEXITCODE -ne 0) { throw 'Unable to start the demo database.' }
}
}
if (Test-TaskUrl 'http://localhost:8000/health') {
    throw 'Backend is already running. Use -Status to inspect it or -Stop to stop processes launched by this script.'
}
if (Test-TaskUrl 'http://localhost:5173/') {
    throw 'Port 5173 is already in use. Stop the existing frontend before starting this script.'
}
$taskOldDatabaseUrl = $env:DATABASE_URL
try {
    # Connection override affects only this local launch; the existing .env is preserved.
    $taskDbPort = if ($Database -eq 'Docker') { 5432 } else { 55432 }
    $env:DATABASE_URL = "postgres://postgres:postgres@127.0.0.1:$taskDbPort/Instagram"
    Push-Location $taskBackend
    try { & $taskNode 'node_modules/sequelize-cli/lib/sequelize' db:migrate; if ($LASTEXITCODE -ne 0) { throw 'Database migration failed.' } } finally { Pop-Location }
    $taskBackendProcess = Start-Process -FilePath $taskNode -ArgumentList @(('"' + $taskAppScript + '"')) -WorkingDirectory $taskBackend -WindowStyle Hidden -RedirectStandardOutput (Join-Path $taskRuntime 'backend.log') -RedirectStandardError (Join-Path $taskRuntime 'backend-error.log') -PassThru
} finally { $env:DATABASE_URL = $taskOldDatabaseUrl }
$taskFrontendProcess = Start-Process -FilePath $taskNode -ArgumentList @(('"' + $taskViteScript + '"'), '--host', '127.0.0.1', '--port', '5173', '--strictPort') -WorkingDirectory $taskFrontend -WindowStyle Hidden -RedirectStandardOutput (Join-Path $taskRuntime 'frontend.log') -RedirectStandardError (Join-Path $taskRuntime 'frontend-error.log') -PassThru
@{
    database = $Database
    backend = @{ id = $taskBackendProcess.Id; script = $taskAppScript }
    frontend = @{ id = $taskFrontendProcess.Id; script = $taskViteScript }
} | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath $taskPidFile -Encoding UTF8
for ($taskAttempt = 0; $taskAttempt -lt 20; $taskAttempt++) {
    $taskReady = Get-TaskStatus
    if ($taskReady.Frontend -and $taskReady.BackendAndDatabase) {
        Write-Output 'Frontend: http://localhost:5173/'
        Write-Output 'Health:   http://localhost:8000/health'
        Write-Output 'Demo login: owner / 12345678 (or viewer / 12345678)'
        return
    }
    Start-Sleep -Milliseconds 500
}
throw "Startup failed. Check logs in $taskRuntime."

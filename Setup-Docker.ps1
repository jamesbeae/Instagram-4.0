#Requires -RunAsAdministrator
$ErrorActionPreference = 'Stop'
# Enable the Windows prerequisites. Never restart the user's computer automatically.
$taskResults = @()
foreach ($taskFeature in @('VirtualMachinePlatform','Microsoft-Windows-Subsystem-Linux')) {
    $taskState = Get-WindowsOptionalFeature -Online -FeatureName $taskFeature
    if ($taskState.State -ne 'Enabled') {
        $taskResults += Enable-WindowsOptionalFeature -Online -FeatureName $taskFeature -All -NoRestart
    }
}
if ($taskResults | Where-Object RestartNeeded) {
    Write-Output 'Windows features enabled. Save your work and restart Windows, then run this script again.'
    exit 0
}
& wsl.exe --install --no-distribution
if ($LASTEXITCODE -ne 0) { throw 'WSL installation failed. Check the displayed Windows error.' }
& wsl.exe --update
if ($LASTEXITCODE -ne 0) { throw 'WSL update failed.' }
Write-Output 'Open Docker Desktop and wait until Engine running, then run Run-Local.ps1.'

$ErrorActionPreference = "Stop"

Write-Host "=== 1. Testing Unpacked Binary ==="
$unpackedPath = (Resolve-Path "dist-electron\win-unpacked\Sibham Enterprises Billing.exe").Path
Write-Host "Path: $unpackedPath"
$p1 = Start-Process -FilePath $unpackedPath -ArgumentList "--test" -PassThru -Wait
Write-Host "Unpacked App Exit Code: $($p1.ExitCode)"
if ($p1.ExitCode -ne 0) {
    Write-Error "Unpacked executable test failed with exit code $($p1.ExitCode)"
    exit 1
}

Write-Host "`n=== 2. Testing Portable Standalone Binary ==="
$portablePath = (Resolve-Path "dist-electron\Sibham Enterprises Billing 1.0.0.exe").Path
Write-Host "Path: $portablePath"
$p2 = Start-Process -FilePath $portablePath -ArgumentList "--test" -PassThru -Wait
Write-Host "Portable App Exit Code: $($p2.ExitCode)"
if ($p2.ExitCode -ne 0) {
    Write-Error "Portable executable test failed with exit code $($p2.ExitCode)"
    exit 1
}

Write-Host "`n=== 3. Testing NSIS Desktop Setup Installer ==="
$installerPath = (Resolve-Path "dist-electron\Sibham Enterprises Billing Setup 1.0.0.exe").Path
Write-Host "Path: $installerPath"
$p3 = Start-Process -FilePath $installerPath -ArgumentList "/S" -PassThru -Wait
Write-Host "NSIS Setup Exit Code: $($p3.ExitCode)"
if ($p3.ExitCode -ne 0) {
    Write-Error "NSIS setup installer failed with exit code $($p3.ExitCode)"
    exit 1
}

Write-Host "`n=== 4. Verifying Installed Application Execution ==="
$installedExe = "$env:LOCALAPPDATA\Programs\shibham-enterprises-billing\Sibham Enterprises Billing.exe"
if (-not (Test-Path $installedExe)) {
    Write-Error "Installed binary not found at $installedExe"
    exit 1
}
Write-Host "Installed Path: $installedExe"
$p4 = Start-Process -FilePath $installedExe -ArgumentList "--test" -PassThru -Wait
Write-Host "Installed App Exit Code: $($p4.ExitCode)"
if ($p4.ExitCode -ne 0) {
    Write-Error "Installed binary test failed with exit code $($p4.ExitCode)"
    exit 1
}

Write-Host "`nAll 4 binaries (Unpacked, Portable, Setup Installer, Installed App) verified successfully with exit code 0!"

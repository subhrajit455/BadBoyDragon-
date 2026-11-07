$base = "C:\Users\VAIS-DT4\AppData\Local\electron-builder\Cache\winCodeSign"
$target = Join-Path $base "winCodeSign-2.6.0"

# Find any of the extracted directories
$extractedDirs = Get-ChildItem -Directory $base | Where-Object { $_.Name -ne "winCodeSign-2.6.0" }

if ($extractedDirs.Count -gt 0) {
    $firstDir = $extractedDirs[0].FullName
    Write-Host "Copying from $firstDir to $target..."
    if (Test-Path $target) {
        Remove-Item -Recurse -Force $target
    }
    Copy-Item -Recurse -Force $firstDir $target
}

# Remove any temporary folders and .7z locks
Get-ChildItem $base | Where-Object { $_.Name -ne "winCodeSign-2.6.0" } | ForEach-Object {
    try {
        Remove-Item -Recurse -Force $_.FullName -ErrorAction SilentlyContinue
    } catch {}
}

Write-Host "winCodeSign-2.6.0 ready:"
Get-ChildItem $target | Select-Object Name

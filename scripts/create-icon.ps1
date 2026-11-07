Add-Type -AssemblyName System.Drawing

if (-not (Test-Path "build")) {
    New-Item -ItemType Directory -Path "build" | Out-Null
}

$sourcePath = (Resolve-Path "client/public/logo.png").Path
$icoPath = (Join-Path (Resolve-Path "build").Path "icon.ico")
$pngPath = (Join-Path (Resolve-Path "build").Path "icon.png")

$src = [System.Drawing.Image]::FromFile($sourcePath)
$bmp = New-Object System.Drawing.Bitmap(256, 256)
$g = [System.Drawing.Graphics]::FromImage($bmp)

$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$g.Clear([System.Drawing.Color]::Transparent)

$scale = [Math]::Min(256.0 / $src.Width, 256.0 / $src.Height)
$w = [int]($src.Width * $scale)
$h = [int]($src.Height * $scale)
$x = [int]((256 - $w) / 2)
$y = [int]((256 - $h) / 2)

$g.DrawImage($src, $x, $y, $w, $h)

$bmp.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$bmp.Dispose()
$src.Dispose()

# Package PNG into valid standard Windows Vista+ 256x256 ICO container
$pngBytes = [System.IO.File]::ReadAllBytes($pngPath)
$ms = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter($ms)

# ICO Header
$bw.Write([UInt16]0) # Reserved
$bw.Write([UInt16]1) # Icon type
$bw.Write([UInt16]1) # 1 image

# Directory Entry
$bw.Write([byte]0)                  # Width: 0 = 256
$bw.Write([byte]0)                  # Height: 0 = 256
$bw.Write([byte]0)                  # Palette
$bw.Write([byte]0)                  # Reserved
$bw.Write([UInt16]1)                # Color planes
$bw.Write([UInt16]32)               # Bpp
$bw.Write([UInt32]$pngBytes.Length) # Image size
$bw.Write([UInt32]22)               # Image offset (6 + 16 = 22)

# Write raw PNG
$bw.Write($pngBytes)
[System.IO.File]::WriteAllBytes($icoPath, $ms.ToArray())

$bw.Close()
$ms.Close()

Write-Host "Generated valid: $icoPath and $pngPath"

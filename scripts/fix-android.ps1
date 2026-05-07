Add-Type -AssemblyName System.Drawing
$bitmap = [System.Drawing.Image]::FromFile('..\public\icon.png')
$outputDir = '..\src-tauri\icons'

function Create-Icon($size, $path) {
    $b = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($b)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($bitmap, 0, 0, $size, $size)
    $g.Dispose()
    $b.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $b.Dispose()
    Write-Host "OK: $path"
}

# Desktop
Create-Icon 32 (Join-Path $outputDir '32x32.png')
Create-Icon 128 (Join-Path $outputDir '128x128.png')
Create-Icon 256 (Join-Path $outputDir '128x128@2x.png')
Create-Icon 512 (Join-Path $outputDir 'icon.png')

# Android
$android = @(48,72,96,144,192)
$folders = @('mipmap-mdpi','mipmap-hdpi','mipmap-xhdpi','mipmap-xxhdpi','mipmap-xxxhdpi')
for ($i=0; $i -lt 5; $i++) {
    $folder = Join-Path $outputDir 'android' $folders[$i]
    if (!(Test-Path $folder)) { New-Item -ItemType Directory -Path $folder -Force | Out-Null }
    Create-Icon $android[$i] (Join-Path $folder 'ic_launcher.png')
    Create-Icon ($android[$i]*2) (Join-Path $folder 'ic_launcher_foreground.png')
}

$bitmap.Dispose()
Write-Host 'DONE'

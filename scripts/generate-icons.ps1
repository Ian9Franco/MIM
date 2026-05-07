# Generador de iconos para Tauri
$sourceIco = "..\public\icon.png"
$outputDir = "..\src-tauri\icons"

Add-Type -AssemblyName System.Drawing

$bitmap = [System.Drawing.Image]::FromFile((Resolve-Path $sourceIco))

function Generate-Icon {
    param($size, $outputPath)
    $newBitmap = New-Object System.Drawing.Bitmap($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($newBitmap)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.DrawImage($bitmap, 0, 0, $size, $size)
    $graphics.Dispose()
    $newBitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $newBitmap.Dispose()
}

# Iconos principales de Tauri
Write-Host "Generando iconos principales..."
Generate-Icon 32 (Join-Path $outputDir "32x32.png")
Generate-Icon 128 (Join-Path $outputDir "128x128.png")
Generate-Icon 256 (Join-Path $outputDir "128x128@2x.png")
Generate-Icon 512 (Join-Path $outputDir "icon.png")

# Iconos Android
Write-Host "Generando iconos Android..."
$androidSizes = @(
    @{Folder="mipmap-mdpi"; Size=48},
    @{Folder="mipmap-hdpi"; Size=72},
    @{Folder="mipmap-xhdpi"; Size=96},
    @{Folder="mipmap-xxhdpi"; Size=144},
    @{Folder="mipmap-xxxhdpi"; Size=192}
)
foreach ($item in $androidSizes) {
    $folder = Join-Path $outputDir "android" $item.Folder
    if (!(Test-Path $folder)) { New-Item -ItemType Directory -Path $folder -Force | Out-Null }
    Generate-Icon $item.Size (Join-Path $folder "ic_launcher.png")
    Generate-Icon ($item.Size * 2) (Join-Path $folder "ic_launcher_foreground.png")
    Write-Host "  Android $($item.Folder): $($item.Size)px"
}

# Iconos iOS
Write-Host "Generando iconos iOS..."
$iosIcons = @(
    @{Name="AppIcon-20x20@1x.png"; Size=20},
    @{Name="AppIcon-20x20@2x.png"; Size=40},
    @{Name="AppIcon-20x20@2x-1.png"; Size=40},
    @{Name="AppIcon-20x20@3x.png"; Size=60},
    @{Name="AppIcon-29x29@1x.png"; Size=29},
    @{Name="AppIcon-29x29@2x.png"; Size=58},
    @{Name="AppIcon-29x29@2x-1.png"; Size=58},
    @{Name="AppIcon-29x29@3x.png"; Size=87},
    @{Name="AppIcon-40x40@1x.png"; Size=40},
    @{Name="AppIcon-40x40@2x.png"; Size=80},
    @{Name="AppIcon-40x40@2x-1.png"; Size=80},
    @{Name="AppIcon-40x40@3x.png"; Size=120},
    @{Name="AppIcon-60x60@2x.png"; Size=120},
    @{Name="AppIcon-60x60@3x.png"; Size=180},
    @{Name="AppIcon-76x76@1x.png"; Size=76},
    @{Name="AppIcon-76x76@2x.png"; Size=152},
    @{Name="AppIcon-83.5x83.5@2x.png"; Size=167},
    @{Name="AppIcon-512@2x.png"; Size=1024}
)
$iosDir = Join-Path $outputDir "ios"
foreach ($item in $iosIcons) {
    Generate-Icon $item.Size (Join-Path $iosDir $item.Name)
}
Write-Host "  iOS: $($iosIcons.Count) iconos generados"

$bitmap.Dispose()

Write-Host ""
Write-Host "Todos los iconos generados en: $outputDir"

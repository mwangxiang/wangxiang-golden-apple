param(
  [string]$AvatarDir = "reports\visual-daily\20260426-magicai-sbti-prompt\avatar-reference",
  [string]$Out = "reports\visual-daily\20260426-magicai-sbti-prompt\avatar-reference\top10-avatar-reference-sheet.png"
)

Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$dir = if ([System.IO.Path]::IsPathRooted($AvatarDir)) { $AvatarDir } else { Join-Path $root $AvatarDir }
$outFile = if ([System.IO.Path]::IsPathRooted($Out)) { $Out } else { Join-Path $root $Out }

$files = Get-ChildItem -LiteralPath $dir -Filter "*.jpg" | Sort-Object Name
$cellW = 220; $cellH = 260; $cols = 5
$rows = [Math]::Ceiling($files.Count / $cols)
$bmp = [System.Drawing.Bitmap]::new($cellW * $cols, $cellH * $rows)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.Clear([System.Drawing.Color]::FromArgb(250, 248, 245))
$font = [System.Drawing.Font]::new("Microsoft YaHei UI", 12, [System.Drawing.FontStyle]::Bold)
$small = [System.Drawing.Font]::new("Consolas", 10)
$brush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(20, 24, 32))

for ($i = 0; $i -lt $files.Count; $i++) {
  $row = [Math]::Floor($i / $cols); $col = $i % $cols
  $x = $col * $cellW; $y = $row * $cellH
  $g.FillRectangle([System.Drawing.SolidBrush]::new([System.Drawing.Color]::White), $x + 10, $y + 10, $cellW - 20, $cellH - 20)
  $img = [System.Drawing.Image]::FromFile($files[$i].FullName)
  $scale = [Math]::Min(160 / $img.Width, 160 / $img.Height)
  $dw = $img.Width * $scale; $dh = $img.Height * $scale
  $dx = $x + ($cellW - $dw) / 2; $dy = $y + 24
  $g.DrawImage($img, [System.Drawing.RectangleF]::new($dx, $dy, $dw, $dh))
  $img.Dispose()
  $label = [System.IO.Path]::GetFileNameWithoutExtension($files[$i].Name)
  $g.DrawString($label, $font, $brush, $x + 18, $y + 196)
  $g.DrawString($files[$i].Name, $small, $brush, $x + 18, $y + 224)
}

$bmp.Save($outFile, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
Write-Output $outFile

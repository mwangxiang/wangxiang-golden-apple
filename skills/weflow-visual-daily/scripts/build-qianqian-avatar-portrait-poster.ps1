param(
  [Parameter(Mandatory=$true)][string]$Persona,
  [Parameter(Mandatory=$true)][string]$AvatarManifest,
  [Parameter(Mandatory=$true)][string]$Out,
  [Parameter(Mandatory=$true)][string]$GroupName,
  [Parameter(Mandatory=$true)][string]$Date,
  [string]$Theme = "财税实务、职场现场、AI 学习"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

function Read-Json($Path) {
  $text = [System.IO.File]::ReadAllText((Resolve-Path -LiteralPath $Path), [System.Text.Encoding]::UTF8)
  return $text | ConvertFrom-Json
}

function New-Brush($Hex) {
  return New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml($Hex))
}

function New-Pen($Hex, $Width = 1) {
  return New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml($Hex), $Width)
}

function Draw-RoundRect($Graphics, $Brush, [float]$X, [float]$Y, [float]$W, [float]$H, [float]$R) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $R * 2
  $path.AddArc($X, $Y, $d, $d, 180, 90)
  $path.AddArc($X + $W - $d, $Y, $d, $d, 270, 90)
  $path.AddArc($X + $W - $d, $Y + $H - $d, $d, $d, 0, 90)
  $path.AddArc($X, $Y + $H - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  $Graphics.FillPath($Brush, $path)
  $path.Dispose()
}

function Draw-WrappedText($Graphics, $Text, $Font, $Brush, [float]$X, [float]$Y, [float]$W, [float]$LineHeight, [int]$MaxLines) {
  if ([string]::IsNullOrWhiteSpace($Text)) { return $Y }
  $line = ""
  $lines = New-Object System.Collections.Generic.List[string]
  foreach ($ch in ([string]$Text).ToCharArray()) {
    $candidate = $line + $ch
    if ($Graphics.MeasureString($candidate, $Font).Width -gt $W -and $line.Length -gt 0) {
      $lines.Add($line)
      $line = [string]$ch
    } else {
      $line = $candidate
    }
  }
  if ($line.Length -gt 0) { $lines.Add($line) }
  $count = [Math]::Min($MaxLines, $lines.Count)
  for ($i = 0; $i -lt $count; $i++) {
    $out = $lines[$i]
    if ($i -eq $count - 1 -and $lines.Count -gt $count -and $out.Length -gt 1) {
      $out = $out.Substring(0, $out.Length - 1) + "…"
    }
    $Graphics.DrawString($out, $Font, $Brush, $X, $Y + $i * $LineHeight)
  }
  return $Y + $count * $LineHeight
}

function Fit-Text($Graphics, $Text, $Font, [float]$W) {
  $out = [string]$Text
  if ([string]::IsNullOrWhiteSpace($out)) { return "" }
  while ($out.Length -gt 1 -and $Graphics.MeasureString($out, $Font).Width -gt $W) {
    $out = $out.Substring(0, $out.Length - 1)
  }
  if ($out -ne [string]$Text -and $out.Length -gt 1) {
    $out = $out.Substring(0, $out.Length - 1) + "..."
  }
  return $out
}

function Draw-AvatarCircle($Graphics, $Path, [float]$X, [float]$Y, [float]$Size) {
  $pathText = [string]$Path
  if ([string]::IsNullOrWhiteSpace($pathText)) { return }
  if (-not (Test-Path -LiteralPath $pathText)) { return }
  $resolved = (Resolve-Path -LiteralPath $pathText).ProviderPath
  $img = [System.Drawing.Image]::FromFile($resolved)
  try {
    $rect = New-Object System.Drawing.Rectangle([int]$X, [int]$Y, [int]$Size, [int]$Size)
    $Graphics.DrawImage($img, $rect)
  } finally {
    $img.Dispose()
  }
}

function Draw-ImageCover($Graphics, $Path, [float]$X, [float]$Y, [float]$W, [float]$H) {
  $pathText = [string]$Path
  if ([string]::IsNullOrWhiteSpace($pathText)) { return }
  if (-not (Test-Path -LiteralPath $pathText)) { return }
  $resolved = (Resolve-Path -LiteralPath $pathText).ProviderPath
  $img = [System.Drawing.Image]::FromFile($resolved)
  try {
    $srcRatio = $img.Width / $img.Height
    $dstRatio = $W / $H
    if ($srcRatio -gt $dstRatio) {
      $srcH = $img.Height
      $srcW = [int]($img.Height * $dstRatio)
      $srcX = [int](($img.Width - $srcW) / 2)
      $srcY = 0
    } else {
      $srcW = $img.Width
      $srcH = [int]($img.Width / $dstRatio)
      $srcX = 0
      $srcY = [int](($img.Height - $srcH) / 2)
    }
    $destRect = New-Object System.Drawing.Rectangle([int]$X, [int]$Y, [int]$W, [int]$H)
    $srcRect = New-Object System.Drawing.Rectangle($srcX, $srcY, $srcW, $srcH)
    $Graphics.DrawImage($img, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
  } finally {
    $img.Dispose()
  }
}

function Type-Color($Code) {
  switch ($Code) {
    "NERD" { return "#F97316" }
    "SAGE" { return "#2563EB" }
    "FIRE" { return "#DC2626" }
    "META" { return "#7C3AED" }
    "CTRL" { return "#0F766E" }
    "MALO" { return "#65A30D" }
    "GLUE" { return "#2563EB" }
    "HYPE" { return "#D97706" }
    "RUSH" { return "#16A34A" }
    "MEME" { return "#DB2777" }
    default { return "#64748B" }
  }
}

function Pick-Backdrop($Index) {
  $colors = @("#DCEFE4", "#E8EDF9", "#F8E9C8", "#F5DFD9", "#E7F0FF", "#EDE7F6", "#E6F4EA", "#FFF1D6", "#DFF7F4", "#FFE4E6")
  return $colors[($Index - 1) % $colors.Count]
}

$personaRoot = Read-Json $Persona
$avatarRows = @(Read-Json $AvatarManifest)
$avatarDir = Split-Path -Parent (Resolve-Path -LiteralPath $AvatarManifest).ProviderPath
$avatarByRank = @{}
foreach ($row in $avatarRows) {
  $rankKey = [int]$row.rank
  $fromManifest = [string]$row.avatarFile
  if (-not [string]::IsNullOrWhiteSpace($fromManifest) -and (Test-Path -LiteralPath $fromManifest)) {
    $avatarByRank[$rankKey] = (Resolve-Path -LiteralPath $fromManifest).ProviderPath
  } else {
    $fallback = Get-ChildItem -LiteralPath $avatarDir -Filter ("{0:D2}_*.jpg" -f $rankKey) -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($fallback) { $avatarByRank[$rankKey] = $fallback.FullName }
  }
}
$people = @($personaRoot.people | Select-Object -First 10)

$width = 2400
$height = 1350
$bmp = New-Object System.Drawing.Bitmap($width, $height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
$g.Clear([System.Drawing.ColorTranslator]::FromHtml("#FFF8EA"))

$fontFamily = "Microsoft YaHei"
$titleFont = New-Object System.Drawing.Font($fontFamily, 49, [System.Drawing.FontStyle]::Bold)
$metaFont = New-Object System.Drawing.Font($fontFamily, 22, [System.Drawing.FontStyle]::Regular)
$rankFont = New-Object System.Drawing.Font($fontFamily, 36, [System.Drawing.FontStyle]::Bold)
$nameFont = New-Object System.Drawing.Font($fontFamily, 24, [System.Drawing.FontStyle]::Bold)
$typeFont = New-Object System.Drawing.Font($fontFamily, 17, [System.Drawing.FontStyle]::Bold)
$bodyFont = New-Object System.Drawing.Font($fontFamily, 15, [System.Drawing.FontStyle]::Regular)
$smallFont = New-Object System.Drawing.Font($fontFamily, 14, [System.Drawing.FontStyle]::Regular)
$goldFont = New-Object System.Drawing.Font($fontFamily, 16, [System.Drawing.FontStyle]::Bold)
$sloganFont = New-Object System.Drawing.Font($fontFamily, 29, [System.Drawing.FontStyle]::Regular)

$ink = New-Brush "#2A1B12"
$muted = New-Brush "#57473C"
$soft = New-Brush "#FFFDF7"
$gold = New-Brush "#D18419"
$white = New-Brush "#FFFFFF"
$borderPen = New-Pen "#E8D4B3" 2
$linePen = New-Pen "#E2CFAE" 2

$g.DrawString("✦ $GroupName · 高频发言 Top10 · 头像画像 ✦", $titleFont, $ink, 34, 28)
$g.DrawString("💬 共 $($personaRoot.totalMessages) 条消息  |  📅 $Date $($personaRoot.interval)  |  主题：$Theme", $metaFont, $muted, 45, 105)
$sourceText = "数据来源：WeFlow 本地聊天记录"
$sourceSize = $g.MeasureString($sourceText, $metaFont)
$g.DrawString($sourceText, $metaFont, $muted, $width - $sourceSize.Width - 42, 26)

$cardW = 448
$cardH = 470
$gapX = 24
$gapY = 28
$startX = 34
$startY = 170

for ($i = 0; $i -lt $people.Count; $i++) {
  $p = $people[$i]
  $rank = [int]$p.rank
  $col = $i % 5
  $row = [Math]::Floor($i / 5)
  $x = $startX + $col * ($cardW + $gapX)
  $y = $startY + $row * ($cardH + $gapY)
  $typeCode = [string]$p.type.code
  $typeName = [string]$p.type.name
  $typeHex = Type-Color $typeCode
  $typeBrush = New-Brush $typeHex
  $backdrop = New-Brush (Pick-Backdrop $rank)

  Draw-RoundRect $g $soft $x $y $cardW $cardH 18
  $g.DrawRectangle($borderPen, $x, $y, $cardW, $cardH)
  Draw-RoundRect $g $backdrop ($x + 12) ($y + 12) ($cardW - 24) 230 14

  $avatar = $avatarByRank[$rank]
  if ([string]::IsNullOrWhiteSpace([string]$avatar)) {
    $fallbackAvatar = Get-ChildItem -LiteralPath $avatarDir -Filter ("{0:D2}_*.jpg" -f $rank) -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($fallbackAvatar) { $avatar = $fallbackAvatar.FullName }
  }
  Draw-ImageCover $g $avatar ($x + 18) ($y + 18) ($cardW - 36) 218
  $g.DrawRectangle((New-Pen "#FFFFFF" 4), ($x + 18), ($y + 18), ($cardW - 36), 218)

  $termY = $y + 30
  $terms = @($p.terms | Select-Object -First 4)
  foreach ($term in $terms) {
    $label = [string]$term.term
    if ($label.Length -gt 8) { $label = $label.Substring(0, 8) }
    $tw = [Math]::Min(180, [Math]::Max(88, $g.MeasureString($label, $smallFont).Width + 24))
    Draw-RoundRect $g $white ($x + $cardW - $tw - 24) $termY $tw 34 10
    $g.DrawString($label, $smallFont, $muted, ($x + $cardW - $tw - 12), ($termY + 7))
    $termY += 43
  }

  $rankBrush = New-Brush $typeHex
  Draw-RoundRect $g $rankBrush ($x + 16) ($y + 253) 62 58 12
  $g.DrawString([string]$rank, $rankFont, $white, ($x + 30), ($y + 257))
  $nameText = Fit-Text $g ([string]$p.name) $nameFont 190
  $g.DrawString($nameText, $nameFont, $ink, ($x + 88), ($y + 251))
  $g.DrawString(("{0} 条（{1}%）" -f $p.count, $p.percent), $smallFont, $muted, ($x + 92), ($y + 287))

  $pill = "$typeCode · $typeName"
  $pillW = [Math]::Min(170, [Math]::Max(116, $g.MeasureString($pill, $typeFont).Width + 24))
  Draw-RoundRect $g (New-Brush "#FFEBD6") ($x + $cardW - $pillW - 16) ($y + 267) $pillW 38 12
  $g.DrawString($pill, $typeFont, $typeBrush, ($x + $cardW - $pillW - 4), ($y + 275))

  $desc = [string]$p.description
  $desc = $desc -replace "代表性金句：.+$", ""
  [void](Draw-WrappedText $g $desc $bodyFont $ink ($x + 22) ($y + 325) ($cardW - 44) 24 3)

  $quote = Fit-Text $g ("金句：" + [string]$p.quote) $goldFont ($cardW - 44)
  $g.DrawString($quote, $goldFont, $gold, ($x + 22), ($y + 432))

  $typeBrush.Dispose()
  $backdrop.Dispose()
  $rankBrush.Dispose()
}

$g.DrawLine($linePen, 185, 1200, 775, 1200)
$g.DrawString("一起学习，一起思考，一起把真实问题做成案例。", $sloganFont, $ink, 810, 1175)
$g.DrawLine($linePen, 1620, 1200, 2215, 1200)

$outDir = Split-Path -Parent $Out
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$bmp.Dispose()
Write-Output $Out

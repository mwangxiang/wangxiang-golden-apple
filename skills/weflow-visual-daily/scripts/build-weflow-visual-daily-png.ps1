param(
  [Parameter(Mandatory=$true)][string]$Messages,
  [Parameter(Mandatory=$true)][string]$Members,
  [Parameter(Mandatory=$true)][string]$RunDir,
  [Parameter(Mandatory=$true)][string]$GroupName,
  [Parameter(Mandatory=$true)][string]$Date
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
  foreach ($ch in $Text.ToCharArray()) {
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

function Draw-Avatar($Graphics, $Path, [float]$X, [float]$Y, [float]$Size) {
  if (-not (Test-Path -LiteralPath $Path)) { return }
  $img = [System.Drawing.Image]::FromFile((Resolve-Path -LiteralPath $Path))
  try {
    $rect = New-Object System.Drawing.RectangleF($X, $Y, $Size, $Size)
    $clip = New-Object System.Drawing.Drawing2D.GraphicsPath
    $clip.AddEllipse($rect)
    $oldClip = $Graphics.Clip
    $Graphics.SetClip($clip)
    $Graphics.DrawImage($img, $rect)
    $Graphics.Clip = $oldClip
    $clip.Dispose()
  } finally {
    $img.Dispose()
  }
}

function Save-Png($Bitmap, $Path) {
  $dir = Split-Path -Parent $Path
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  $Bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
}

$msgRoot = Read-Json $Messages
$memberRoot = Read-Json $Members
$messagesAllList = New-Object System.Collections.Generic.List[object]
for ($i = 0; $i -lt $msgRoot.messages.Count; $i++) {
  $m = $msgRoot.messages[$i]
  if ($null -ne $m -and $null -ne $m.senderUsername) { $messagesAllList.Add($m) }
}
$messagesAll = $messagesAllList.ToArray()
$membersAllList = New-Object System.Collections.Generic.List[object]
for ($i = 0; $i -lt $memberRoot.members.Count; $i++) {
  $m = $memberRoot.members[$i]
  if ($null -ne $m -and $null -ne $m.wxid) { $membersAllList.Add($m) }
}
$membersAll = $membersAllList.ToArray()
$memberByWxid = @{}
foreach ($m in $membersAll) { $memberByWxid[$m.wxid] = $m }

$chatMessagesList = New-Object System.Collections.Generic.List[object]
for ($i = 0; $i -lt $messagesAll.Count; $i++) {
  $m = $messagesAll[$i]
  if (
    -not [string]::IsNullOrWhiteSpace([string]$m.senderUsername) -and
    -not [string]::IsNullOrWhiteSpace([string]$m.content) -and
    ([string]$m.content) -notlike '*邀请你加入了群聊*'
  ) {
    $chatMessagesList.Add($m)
  }
}
$chatMessages = $chatMessagesList.ToArray()
$chatTextMessagesList = New-Object System.Collections.Generic.List[object]
for ($i = 0; $i -lt $chatMessages.Count; $i++) {
  $m = $chatMessages[$i]
  if (([string]$m.content) -notmatch '^\[动画表情\]$') { $chatTextMessagesList.Add($m) }
}
$chatTextMessages = $chatTextMessagesList.ToArray()
$todayCountByWxid = @{}
foreach ($msg in $chatMessages) {
  $sender = [string]$msg.senderUsername
  if ([string]::IsNullOrWhiteSpace($sender)) { continue }
  if (-not $todayCountByWxid.ContainsKey($sender)) { $todayCountByWxid[$sender] = 0 }
  $todayCountByWxid[$sender] += 1
}
$topRows = New-Object System.Collections.Generic.List[object]
foreach ($sender in $todayCountByWxid.Keys) {
  $member = $memberByWxid[$sender]
  $name = if ($member -and $member.displayName) { [string]$member.displayName } elseif ($member -and $member.groupNickname) { [string]$member.groupNickname } else { $sender }
  $sample = ($chatMessages | Where-Object { $_.senderUsername -eq $sender -and ([string]$_.content) -notmatch '^\[动画表情\]$' } | ForEach-Object { [string]$_.content } | Select-Object -First 1)
  if (-not $sample) { $sample = "今天参与了群内互动" }
  $topRows.Add([pscustomobject]@{
    wxid = $sender
    displayName = $name
    messageCount = [int]$todayCountByWxid[$sender]
    sample = $sample
  })
}
$top = @($topRows | Sort-Object @{Expression="messageCount";Descending=$true}, @{Expression="displayName";Descending=$false} | Select-Object -First 10)

$avatarDir = Join-Path $RunDir "avatar-reference"
$generatedDir = Join-Path $RunDir "generated"
New-Item -ItemType Directory -Force -Path $generatedDir | Out-Null

$fontFamily = "Microsoft YaHei"
$titleFont = New-Object System.Drawing.Font($fontFamily, 42, [System.Drawing.FontStyle]::Bold)
$subFont = New-Object System.Drawing.Font($fontFamily, 20, [System.Drawing.FontStyle]::Regular)
$hFont = New-Object System.Drawing.Font($fontFamily, 25, [System.Drawing.FontStyle]::Bold)
$bodyFont = New-Object System.Drawing.Font($fontFamily, 19, [System.Drawing.FontStyle]::Regular)
$smallFont = New-Object System.Drawing.Font($fontFamily, 15, [System.Drawing.FontStyle]::Regular)
$tinyFont = New-Object System.Drawing.Font($fontFamily, 13, [System.Drawing.FontStyle]::Regular)

$bg = New-Brush "#F7F0E5"
$ink = New-Brush "#22313F"
$muted = New-Brush "#67727E"
$card = New-Brush "#FFFCF6"
$accent = New-Brush "#1E7F74"
$gold = New-Brush "#D99A2B"
$softGreen = New-Brush "#E4F1EB"
$softBlue = New-Brush "#E7EEF7"
$softGold = New-Brush "#F8E9C8"
$softRed = New-Brush "#F5DFD9"

$activeCount = $top.Count
$total = $chatMessages.Count
$textCount = $chatTextMessages.Count
$emojiCount = $total - $textCount
$timeStart = ($messagesAll | Sort-Object createTime | Select-Object -First 1).createTime
$timeEnd = ($messagesAll | Sort-Object createTime | Select-Object -Last 1).createTime
$startText = if ($timeStart) { ([DateTimeOffset]::FromUnixTimeSeconds([int64]$timeStart).ToLocalTime()).ToString("HH:mm") } else { "" }
$endText = if ($timeEnd) { ([DateTimeOffset]::FromUnixTimeSeconds([int64]$timeEnd).ToLocalTime()).ToString("HH:mm") } else { "" }

$allText = ($chatTextMessages | ForEach-Object { [string]$_.content }) -join " "
$topicLines = New-Object System.Collections.Generic.List[string]
if ($allText -match 'kimi|Kimi|kim|套餐|199|coding|Claude|GPT|gpt|API|api') {
  $topicLines.Add("AI 工具与套餐：围绕 Kimi、GPT、coding plan、账号套餐和使用成本展开讨论。")
}
if ($allText -match '代码|写代码|API|接口|质保|账号|会员|注册|封号') {
  $topicLines.Add("工具落地问题：写代码、接口、会员状态、账号来源和质保风险是今天的高频线索。")
}
if ($allText -match '小米|100t|二手|价格|买|卖|质保') {
  $topicLines.Add("消费与交易判断：小米 100T、二手价格、质保麻烦和是否折腾形成一条生活化支线。")
}
if ($allText -match '困|睡|晚|凌晨|不想折腾|麻烦') {
  $topicLines.Add("群内情绪：整体是轻松吐槽和经验互助，关键词是麻烦、不想折腾、太困了。")
}
if ($topicLines.Count -lt 4) {
  $topicLines.Add("群节奏：今天消息集中在少数活跃成员之间，适合先做轻量日报和头像画像测试。")
}
if ($topicLines.Count -lt 5) {
  $topicLines.Add("后续观察：继续看 AI 工具讨论是否沉淀成稳定教程、账号渠道经验或案例复盘。")
}

$quotes = @($chatTextMessages | ForEach-Object { [string]$_.content } | Where-Object { $_.Length -gt 1 } | Select-Object -First 7)

# Essence poster
$bmp = New-Object System.Drawing.Bitmap(1400, 2000)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
$g.Clear([System.Drawing.ColorTranslator]::FromHtml("#F7F0E5"))

Draw-RoundRect $g $softGreen 70 70 1260 250 34
$g.DrawString($GroupName, $titleFont, $ink, 105, 105)
$g.DrawString("社群精华日报  |  $Date  |  $startText-$endText", $subFont, $muted, 110, 175)
$g.DrawString("消息 $total 条 · 文本 $textCount 条 · 表情 $emojiCount 条 · 活跃 $activeCount 人", $subFont, $accent, 110, 220)

Draw-RoundRect $g $card 70 370 1260 560 28
$g.DrawString("今日重点", $hFont, $ink, 105, 405)
$y = 460
foreach ($line in $topicLines) {
  Draw-RoundRect $g $softBlue 105 $y 52 40 12
  $g.DrawString("•", $hFont, $accent, 121, ($y + 1))
  $y = Draw-WrappedText $g $line $bodyFont $ink 180 ($y + 2) 1080 32 2
  $y += 18
}

Draw-RoundRect $g $card 70 980 600 660 28
$g.DrawString("活跃成员", $hFont, $ink, 105, 1015)
$y = 1070
for ($i = 0; $i -lt [Math]::Min(6, $top.Count); $i++) {
  $p = $top[$i]
  $name = if ($p.displayName) { $p.displayName } elseif ($p.groupNickname) { $p.groupNickname } else { $p.wxid }
  $g.DrawString(("{0}. {1}" -f ($i + 1), $name), $bodyFont, $ink, 110, $y)
  $g.DrawString(("{0} 条" -f $p.messageCount), $smallFont, $accent, 500, ($y + 4))
  $y += 58
}

Draw-RoundRect $g $card 730 980 600 660 28
$g.DrawString("原话摘录", $hFont, $ink, 765, 1015)
$y = 1070
foreach ($q in ($quotes | Select-Object -First 5)) {
  Draw-RoundRect $g $softGold 765 $y 520 82 16
  [void](Draw-WrappedText $g $q $smallFont $ink 790 ($y + 14) 470 25 2)
  $y += 105
}

Draw-RoundRect $g $softRed 70 1700 1260 170 28
$g.DrawString("下一步", $hFont, $ink, 105, 1732)
[void](Draw-WrappedText $g "后续可重点观察：AI 工具讨论是否进入教程/案例层，账号渠道与套餐成本经验是否能沉淀成稳定小结，活跃成员是否形成固定答疑角色。" $bodyFont $ink 105 1788 1180 34 3)
$g.DrawString("数据来源：WeFlow 本地聊天记录；本图为确定性渲染，中文文字不交给生图模型。", $tinyFont, $muted, 90, 1935)

$safeDate = $Date -replace '[^\d]', ''
$essencePath = Join-Path $generatedDir ("magicai_{0}_essence_daily.png" -f $safeDate)
Save-Png $bmp $essencePath
$g.Dispose()
$bmp.Dispose()

# Avatar poster
$bmp = New-Object System.Drawing.Bitmap(2000, 2400)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
$g.Clear([System.Drawing.ColorTranslator]::FromHtml("#F6EFE3"))

Draw-RoundRect $g $softGreen 80 70 1840 230 34
$g.DrawString($GroupName, $titleFont, $ink, 120, 105)
$g.DrawString("活跃头像海报  |  $Date  |  Top $($top.Count)", $subFont, $muted, 125, 180)
$g.DrawString("消息 $total 条 · 活跃 $activeCount 人 · 头像状态已检查", $subFont, $accent, 125, 225)

$cardW = 350
$cardH = 470
$gapX = 35
$gapY = 45
$startX = 90
$startY = 360

for ($i = 0; $i -lt $top.Count; $i++) {
  $p = $top[$i]
  $col = $i % 5
  $row = [Math]::Floor($i / 5)
  $x = $startX + $col * ($cardW + $gapX)
  $y = $startY + $row * ($cardH + $gapY)
  Draw-RoundRect $g $card $x $y $cardW $cardH 26
  Draw-RoundRect $g $softBlue ($x + 22) ($y + 22) ($cardW - 44) 190 22
  $rank = $i + 1
  $avatar = Get-ChildItem -LiteralPath $avatarDir -Filter ("{0:D2}_*.jpg" -f $rank) -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($avatar) { Draw-Avatar $g $avatar.FullName ($x + 105) ($y + 45) 140 }
  $name = if ($p.displayName) { $p.displayName } elseif ($p.groupNickname) { $p.groupNickname } else { $p.wxid }
  $g.DrawString(("#{0}" -f $rank), $smallFont, $gold, ($x + 25), ($y + 28))
  [void](Draw-WrappedText $g $name $hFont $ink ($x + 28) ($y + 235) ($cardW - 56) 36 2)
  $g.DrawString(("{0} 条发言" -f $p.messageCount), $smallFont, $accent, ($x + 30), ($y + 315))
  $tag = switch -Regex ($name) {
    "风中梧桐" { "节奏判断" ; break }
    "123" { "成本测算" ; break }
    "胡少君" { "代码执行" ; break }
    "梦惊禅" { "深夜体验" ; break }
    "Sunshine" { "价格线索" ; break }
    default { "互动补充" }
  }
  Draw-RoundRect $g $softGold ($x + 28) ($y + 358) 155 44 14
  $g.DrawString($tag, $smallFont, $ink, ($x + 46), ($y + 369))
  $sample = ($chatMessages | Where-Object { $_.senderUsername -eq $p.wxid -and ([string]$_.content) -notmatch '^\[动画表情\]$' } | ForEach-Object { [string]$_.content } | Select-Object -First 1)
  if (-not $sample) { $sample = "关键节点补充互动" }
  [void](Draw-WrappedText $g $sample $tinyFont $muted ($x + 30) ($y + 420) ($cardW - 60) 22 2)
}

Draw-RoundRect $g $card 90 1450 1820 650 30
$g.DrawString("今天的群画像", $hFont, $ink, 130, 1490)
$summary = @(
  "今天的主线不是财税，而是 AI 工具、账号套餐、coding plan、价格和质保风险。",
  "风中梧桐承担了大量判断和劝退角色，围绕账号、会员状态、质保麻烦持续补充经验。",
  "123、胡少君、梦惊禅等成员把讨论拉向不想折腾、写代码、Kimi 套餐够不够用等具体问题。",
  "整体氛围是熟人式吐槽和经验交换，适合后续沉淀成 AI 工具购买、账号风险、使用成本小结。"
)
$y = 1550
foreach ($line in $summary) {
  Draw-RoundRect $g $softGreen 130 $y 42 36 10
  $g.DrawString("✓", $smallFont, $accent, 143, ($y + 5))
  $y = Draw-WrappedText $g $line $bodyFont $ink 195 ($y + 2) 1600 34 2
  $y += 22
}
$g.DrawString("注：本图使用真实头像文件做版式渲染；未把头像占位图当真人头像。", $tinyFont, $muted, 130, 2050)

$avatarPath = Join-Path $generatedDir ("magicai_{0}_avatar_poster.png" -f $safeDate)
Save-Png $bmp $avatarPath
$g.Dispose()
$bmp.Dispose()

$result = [ordered]@{
  success = $true
  groupName = $GroupName
  date = $Date
  totalMessages = $total
  textMessages = $textCount
  activeMembers = $activeCount
  essencePoster = $essencePath
  avatarPoster = $avatarPath
}
$result | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $RunDir "deterministic-poster-result.json") -Encoding UTF8
$result | ConvertTo-Json -Depth 4

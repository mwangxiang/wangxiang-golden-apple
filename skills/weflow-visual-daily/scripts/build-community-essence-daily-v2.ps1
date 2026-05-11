param(
  [Parameter(Mandatory=$true)][string]$Messages,
  [Parameter(Mandatory=$true)][string]$Members,
  [Parameter(Mandatory=$true)][string]$Out,
  [Parameter(Mandatory=$true)][string]$GroupName,
  [Parameter(Mandatory=$true)][string]$WindowText
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

function Read-Json($Path) {
  $text = [System.IO.File]::ReadAllText((Resolve-Path -LiteralPath $Path), [System.Text.Encoding]::UTF8)
  return $text | ConvertFrom-Json
}

function New-Brush($Hex) { return New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml($Hex)) }
function New-Pen($Hex, $Width = 1) { return New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml($Hex), $Width) }

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
      $out = $out.Substring(0, $out.Length - 1) + "..."
    }
    $Graphics.DrawString($out, $Font, $Brush, $X, $Y + $i * $LineHeight)
  }
  return $Y + $count * $LineHeight
}

function Clean-Text($Value) {
  return (([string]$Value) -replace '\s+', ' ').Trim()
}

function Safe-DisplayName($Value, $Fallback) {
  $text = Clean-Text $Value
  if ([string]::IsNullOrWhiteSpace($text)) { $text = [string]$Fallback }
  $text = $text -replace '[\uD800-\uDFFF]', ''
  $text = $text -replace '🇨🇳|🚩|👓', ''
  return (Clean-Text $text)
}

function Pick-Topics($Text) {
  $items = New-Object System.Collections.Generic.List[string]
  if ($Text -match 'AI|ai|Kimi|kimi|Claude|GPT|模型|智能体|提示词|自动化|代码|API|接口') {
    $items.Add("AI 与工具：模型、接口、代码、自动化或提示词相关内容是本窗口的重要线索。")
  }
  if ($Text -match '税|财|审计|会计|发票|申报|报表|成本|费用|资产|所得税|增值税') {
    $items.Add("财税审实务：财务、税务、审计、报表、成本和申报问题需要单独回看。")
  }
  if ($Text -match '课|学习|打卡|作业|课程|课堂|训练|考试|资料|教程') {
    $items.Add("学习推进：课程、资料、打卡、训练和答疑内容适合沉淀成复盘材料。")
  }
  if ($Text -match '行业|趋势|公司|产品|价格|套餐|账号|会员|渠道|风险|购买') {
    $items.Add("行业与使用判断：价格、套餐、账号、渠道、产品风险或行业观察值得提炼。")
  }
  if ($Text -match '文件|链接|资料|下载|分享|图片|视频|公众号|文章|网页') {
    $items.Add("资源流转：链接、文件、文章和资料分享是后续可保存的重点。")
  }
  if ($items.Count -lt 4) { $items.Add("社群节奏：高频成员贡献主要信息，讨论更像即时问答与经验互助。") }
  if ($items.Count -lt 5) { $items.Add("下一步：把反复出现的问题整理为问答索引、避坑清单或案例复盘。") }
  return @($items | Select-Object -First 5)
}

$msgRoot = Read-Json $Messages
$memberRoot = Read-Json $Members
$messagesAll = @($msgRoot.messages | Where-Object { $_.senderUsername -and $_.content -and ([string]$_.content) -notlike '*邀请你加入了群聊*' })
$textMessages = @($messagesAll | Where-Object { ([string]$_.content) -notmatch '^\[动画表情\]$' })
$members = @($memberRoot.members)
$memberByWxid = @{}
foreach ($m in $members) { $memberByWxid[[string]$m.wxid] = $m }

$countBySender = @{}
foreach ($m in $messagesAll) {
  $sender = [string]$m.senderUsername
  if (-not $countBySender.ContainsKey($sender)) { $countBySender[$sender] = 0 }
  $countBySender[$sender] += 1
}

$top = foreach ($sender in $countBySender.Keys) {
  $member = $null
  if ($memberByWxid.ContainsKey([string]$sender)) { $member = $memberByWxid[[string]$sender] }
  $rawName = if ($member -and $member.displayName) { [string]$member.displayName } elseif ($member -and $member.groupNickname) { [string]$member.groupNickname } elseif ($member -and $member.nickname) { [string]$member.nickname } else { [string]$sender }
  $name = Safe-DisplayName $rawName $sender
  [pscustomobject]@{ wxid=$sender; name=$name; count=[int]$countBySender[$sender] }
}
$top = @($top | Sort-Object @{Expression="count";Descending=$true}, @{Expression="name";Descending=$false} | Select-Object -First 10)
$personaPath = Join-Path (Split-Path -Parent (Split-Path -Parent $Out)) "sbti-persona-data.json"
if (Test-Path -LiteralPath $personaPath) {
  $personaRootForTop = Read-Json $personaPath
  if ($personaRootForTop.people) {
    $top = @($personaRootForTop.people | Select-Object -First 10 | ForEach-Object {
      [pscustomobject]@{
        wxid = [string]$_.wxid
        name = (Safe-DisplayName $_.name $_.wxid)
        count = [int]$_.count
      }
    })
  }
}

$allText = ($textMessages | ForEach-Object { Clean-Text $_.content }) -join " "
$topics = Pick-Topics $allText
$quotes = @($textMessages | ForEach-Object { Clean-Text $_.content } | Where-Object { $_.Length -ge 8 } | Select-Object -First 7)

$w = 1600
$h = 2200
$bmp = New-Object System.Drawing.Bitmap($w, $h)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
$g.Clear([System.Drawing.ColorTranslator]::FromHtml("#F8F3EA"))

$fontFamily = "Microsoft YaHei"
$titleFont = New-Object System.Drawing.Font($fontFamily, 48, [System.Drawing.FontStyle]::Bold)
$sectionFont = New-Object System.Drawing.Font($fontFamily, 30, [System.Drawing.FontStyle]::Bold)
$metricFont = New-Object System.Drawing.Font($fontFamily, 34, [System.Drawing.FontStyle]::Bold)
$bodyFont = New-Object System.Drawing.Font($fontFamily, 23, [System.Drawing.FontStyle]::Regular)
$smallFont = New-Object System.Drawing.Font($fontFamily, 19, [System.Drawing.FontStyle]::Regular)
$tinyFont = New-Object System.Drawing.Font($fontFamily, 15, [System.Drawing.FontStyle]::Regular)

$ink = New-Brush "#1F2933"
$muted = New-Brush "#66737F"
$green = New-Brush "#176B5C"
$gold = New-Brush "#C9841E"
$blue = New-Brush "#2D5F8B"
$card = New-Brush "#FFFDF8"
$softGreen = New-Brush "#DDEDE6"
$softBlue = New-Brush "#E2ECF6"
$softGold = New-Brush "#F6E4BD"
$softRed = New-Brush "#F2DDD5"

Draw-RoundRect $g $softGreen 70 60 1460 280 36
$g.DrawString($GroupName, $titleFont, $ink, 112, 96)
$g.DrawString("社群内容日报 · $WindowText", $bodyFont, $muted, 116, 174)
$g.DrawString("不是流水账：只保留主题、证据、人物和下一步", $smallFont, $green, 118, 230)

$metrics = @(
  @("消息", $messagesAll.Count),
  @("文本", $textMessages.Count),
  @("活跃", $countBySender.Count),
  @("Top", $top.Count)
)
$mx = 90
foreach ($m in $metrics) {
  Draw-RoundRect $g $card $mx 380 330 165 22
  $g.DrawString([string]$m[1], $metricFont, $green, ($mx + 38), 410)
  $g.DrawString([string]$m[0], $smallFont, $muted, ($mx + 42), 475)
  $mx += 365
}

Draw-RoundRect $g $card 70 600 1460 610 28
$g.DrawString("今日重点", $sectionFont, $ink, 112, 640)
$y = 710
for ($i = 0; $i -lt $topics.Count; $i++) {
  $bubble = @($softBlue, $softGreen, $softGold, $softRed)[$i % 4]
  Draw-RoundRect $g $bubble 112 $y 54 42 14
  $g.DrawString([string]($i + 1), $smallFont, $blue, 132, ($y + 9))
  $y = Draw-WrappedText $g $topics[$i] $bodyFont $ink 195 ($y + 2) 1250 35 2
  $y += 22
}

Draw-RoundRect $g $card 70 1260 690 520 28
$g.DrawString("高频成员", $sectionFont, $ink, 112, 1300)
$y = 1365
for ($i = 0; $i -lt $top.Count; $i++) {
  $row = $top[$i]
  $g.DrawString(("#{0} {1}" -f ($i + 1), $row.name), $smallFont, $ink, 116, $y)
  $g.DrawString(("{0} 条" -f $row.count), $smallFont, $green, 610, $y)
  $y += 48
}

Draw-RoundRect $g $card 840 1260 690 520 28
$g.DrawString("原话摘录", $sectionFont, $ink, 882, 1300)
$y = 1365
foreach ($q in ($quotes | Select-Object -First 5)) {
  Draw-RoundRect $g $softGold 882 $y 590 66 14
  [void](Draw-WrappedText $g $q $tinyFont $ink 906 ($y + 12) 540 23 2)
  $y += 86
}

Draw-RoundRect $g $softRed 70 1840 1460 230 28
$g.DrawString("推荐下一步", $sectionFont, $ink, 112, 1880)
[void](Draw-WrappedText $g "先看头像日报定位高频成员，再回到原始聊天记录追具体上下文；把反复出现的问题整理成问答索引、避坑清单、资料库或案例复盘。" $bodyFont $ink 112 1942 1360 36 3)
$g.DrawString("数据来源：WeFlow 本地聊天记录；窗口按亚洲/上海时间截断。", $tinyFont, $muted, 92, 2130)

$dir = Split-Path -Parent $Out
New-Item -ItemType Directory -Force -Path $dir | Out-Null
$bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()

[pscustomobject]@{
  ok = $true
  out = $Out
  totalMessages = $messagesAll.Count
  textMessages = $textMessages.Count
  activeMembers = $countBySender.Count
} | ConvertTo-Json -Depth 3

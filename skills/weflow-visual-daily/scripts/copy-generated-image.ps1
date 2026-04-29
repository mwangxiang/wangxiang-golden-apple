param(
  [Parameter(Mandatory=$true)][string]$Source,
  [Parameter(Mandatory=$true)][string]$RunDir,
  [Parameter(Mandatory=$true)][string]$Name,
  [string]$DownloadDir = "",
  [string]$DownloadName = ""
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $Source)) {
  throw "Source image does not exist: $Source"
}

$resolvedRunDir = (Resolve-Path -LiteralPath $RunDir).Path
$generated = Join-Path $resolvedRunDir "generated"
New-Item -ItemType Directory -Force -Path $generated | Out-Null

$projectDestination = Join-Path $generated $Name
$sourceFull = [System.IO.Path]::GetFullPath($Source)
$projectFull = [System.IO.Path]::GetFullPath($projectDestination)
if ($sourceFull -ne $projectFull) {
  Copy-Item -LiteralPath $Source -Destination $projectDestination -Force
}

if ([string]::IsNullOrWhiteSpace($DownloadDir)) {
  $runName = Split-Path -Leaf $resolvedRunDir
  $visualDailyDir = Split-Path -Parent $resolvedRunDir
  $reportsDir = Split-Path -Parent $visualDailyDir
  $toolRoot = Split-Path -Parent $reportsDir
  $DownloadDir = Join-Path $toolRoot ("downloads\weflow-visual-daily-" + $runName)
}

if ([string]::IsNullOrWhiteSpace($DownloadName)) {
  $DownloadName = $Name
}

New-Item -ItemType Directory -Force -Path $DownloadDir | Out-Null
$downloadDestination = Join-Path $DownloadDir $DownloadName
$downloadFull = [System.IO.Path]::GetFullPath($downloadDestination)
if ($sourceFull -ne $downloadFull) {
  Copy-Item -LiteralPath $Source -Destination $downloadDestination -Force
}

[pscustomobject]@{
  ok = $true
  source = $Source
  project = $projectDestination
  download = $downloadDestination
} | ConvertTo-Json -Depth 3

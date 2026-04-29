param(
  [Parameter(Mandatory = $true)]
  [string]$SourcePath,

  [string]$TargetPath = "D:\weflow_data"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $SourcePath)) {
  throw "Source path does not exist: $SourcePath"
}

$resolvedSource = (Resolve-Path -LiteralPath $SourcePath).Path

if (Test-Path -LiteralPath $TargetPath) {
  Write-Host "Target already exists: $TargetPath"
  exit 0
}

cmd /c mklink /J $TargetPath $resolvedSource

if (-not (Test-Path -LiteralPath $TargetPath)) {
  throw "Failed to create junction: $TargetPath -> $resolvedSource"
}

Write-Host "Created junction: $TargetPath -> $resolvedSource"

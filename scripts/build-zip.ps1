# Builds dist\FixForFlex-<version>.zip with only the files the extension needs.
# Run from the extension folder:  powershell -ExecutionPolicy Bypass -File scripts\build-zip.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$version = (Get-Content (Join-Path $root "manifest.json") -Raw | ConvertFrom-Json).version
$stage = Join-Path $root "dist\FixForFlex"
$zip = Join-Path $root "dist\FixForFlex-$version.zip"

if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Path $stage | Out-Null
foreach ($item in "manifest.json", "background.js", "content", "offscreen", "fonts", "icons", "ui", "README.md") {
  Copy-Item (Join-Path $root $item) -Destination $stage -Recurse
}
# Never ship saved FLEX pages or an old config.js
Get-ChildItem $stage -Recurse -Include *.html -File | Where-Object { $_.DirectoryName -notlike "*\ui" -and $_.DirectoryName -notlike "*\offscreen" } | Remove-Item -Force
Get-ChildItem $stage -Recurse -Directory -Filter "*_files" | Remove-Item -Recurse -Force

if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path $stage -DestinationPath $zip
Remove-Item $stage -Recurse -Force
Write-Host "Built $zip"

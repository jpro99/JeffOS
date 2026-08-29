# One command: Jeff OS dev server + browser + Cursor + PC bridge (for Lemon)
param(
  [switch]$NoCursor,
  [switch]$NoBrowser,
  [switch]$NoBridge
)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

Write-Host ""
Write-Host "JEFF GO - starting Mission Control" -ForegroundColor Cyan
Write-Host "Folder: $Root" -ForegroundColor Gray
Write-Host ""

# Dev server in new window (keeps running)
$devCmd = "Set-Location '$Root'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $devCmd
Write-Host "Dev server starting in new window..." -ForegroundColor Green

if (-not $NoBridge) {
  $bridgeCmd = "Set-Location '$Root'; npm run bridge"
  Start-Process powershell -ArgumentList "-NoExit", "-Command", $bridgeCmd
  Write-Host "PC Bridge starting (Lemon can open Cursor)..." -ForegroundColor Green
}

Start-Sleep -Seconds 4

if (-not $NoBrowser) {
  Start-Process "http://localhost:3000/easy"
  Write-Host "Opened http://localhost:3000/easy" -ForegroundColor Green
}

if (-not $NoCursor) {
  try {
    Start-Process "cursor" -ArgumentList "`"$Root`""
    Write-Host "Opened Cursor on jeff-mission-control" -ForegroundColor Green
  } catch {
    Write-Host "Cursor CLI not found - open the folder manually" -ForegroundColor Yellow
  }
}

Write-Host ""
Write-Host "LEMON + CURSOR LOOP:" -ForegroundColor Cyan
Write-Host "  1. Keep the BRIDGE window open" -ForegroundColor White
Write-Host "  2. Lemon Settings → paste Bridge token (printed in bridge window)" -ForegroundColor White
Write-Host "  3. On Lemon: Talk → Go → Cursor opens on this PC" -ForegroundColor White
Write-Host ""
Write-Host "Localhost: http://localhost:3000/easy" -ForegroundColor Gray
Write-Host "Lemon:     https://project-command-lemon.vercel.app/easy" -ForegroundColor Gray
Write-Host ""

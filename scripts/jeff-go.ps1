# One command: Jeff OS dev server + browser + Cursor
param(
  [switch]$NoCursor,
  [switch]$NoBrowser
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
Write-Host "YOUR 3-STEP LOOP (easiest way):" -ForegroundColor Cyan
Write-Host "  1. Jeff OS (browser) - type or paste -> Analyze or Build it" -ForegroundColor White
Write-Host "  2. Cursor - paste the prompt Jeff OS copied" -ForegroundColor White
Write-Host "  3. Push live - run: npm run push-live" -ForegroundColor White
Write-Host ""
Write-Host "Use localhost Jeff OS for push/fix. Lemon site is view-only." -ForegroundColor Gray
Write-Host ""

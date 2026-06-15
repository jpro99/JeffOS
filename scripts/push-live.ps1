# Build, commit, push for any project folder (Vercel auto-deploys if GitHub linked)
param(
  [string]$ProjectPath = "",
  [string]$Message = "Live update"
)

$ErrorActionPreference = "Stop"

if (-not $ProjectPath) {
  $ProjectPath = (Join-Path $PSScriptRoot "..")
}
$ProjectPath = (Resolve-Path $ProjectPath).Path

if (-not (Test-Path (Join-Path $ProjectPath ".git"))) {
  Write-Host "Not a git repo: $ProjectPath" -ForegroundColor Red
  exit 1
}

Set-Location $ProjectPath
Write-Host "Project: $ProjectPath" -ForegroundColor Gray

if (Test-Path "package.json") {
  $pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
  if ($pkg.scripts.build) {
    Write-Host "Building..." -ForegroundColor Cyan
    npm run build
    if ($LASTEXITCODE -ne 0) {
      Write-Host "Build failed - fix errors before push." -ForegroundColor Red
      exit 1
    }
  }
}

$branch = "main"
try {
  $branch = (git branch --show-current).Trim()
  if (-not $branch) { $branch = "main" }
} catch {
  $branch = "main"
}

$status = git status --porcelain
if (-not $status) {
  Write-Host "Nothing new to commit. Repo already up to date on git." -ForegroundColor Yellow
  exit 0
}

Write-Host "Committing..." -ForegroundColor Cyan
git add -A
git commit -m $Message
if ($LASTEXITCODE -ne 0) {
  Write-Host "Commit failed." -ForegroundColor Red
  exit 1
}

Write-Host "Pushing to origin $branch..." -ForegroundColor Cyan
git push origin $branch
if ($LASTEXITCODE -ne 0) {
  git push
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Push failed - check git auth / network." -ForegroundColor Red
    exit 1
  }
}

Write-Host ""
Write-Host "DONE - pushed to GitHub ($branch)." -ForegroundColor Green
Write-Host "If Vercel is linked to this repo, production updates in 1-2 min." -ForegroundColor Green

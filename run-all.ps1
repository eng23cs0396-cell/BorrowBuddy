$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $projectRoot "backend"
$frontendPath = Join-Path $projectRoot "frontend"

if (!(Test-Path $backendPath)) {
  throw "Backend folder not found: $backendPath"
}

if (!(Test-Path $frontendPath)) {
  throw "Frontend folder not found: $frontendPath"
}

Write-Host "Starting Smart Library project..." -ForegroundColor Cyan

# Install dependencies only if node_modules is missing.
if (!(Test-Path (Join-Path $backendPath "node_modules"))) {
  Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
  Push-Location $backendPath
  npm install
  Pop-Location
}

if (!(Test-Path (Join-Path $frontendPath "node_modules"))) {
  Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
  Push-Location $frontendPath
  npm install
  Pop-Location
}

# Start backend and frontend in separate PowerShell windows.
$backendCmd = "cd `"$backendPath`"; npm run dev"
$frontendCmd = "cd `"$frontendPath`"; npm run dev"

Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd

Write-Host ""
Write-Host "Done. Open these links:" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "Backend Health: http://localhost:5000/health" -ForegroundColor Green


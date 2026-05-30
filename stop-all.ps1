$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $projectRoot "backend"
$frontendPath = Join-Path $projectRoot "frontend"

Write-Host "Stopping Smart Library dev servers..." -ForegroundColor Cyan

# Find processes whose command line references the project folders or the dev command
$procs = Get-CimInstance Win32_Process | Where-Object {
    $_.CommandLine -and (
        $_.CommandLine -like "*$backendPath*" -or
        $_.CommandLine -like "*$frontendPath*" -or
        $_.CommandLine -like "*npm run dev*"
    )
}

if ($procs) {
    foreach ($p in $procs) {
        try {
            Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop
            Write-Host "Stopped process $($p.ProcessId) ($($p.Name))" -ForegroundColor Green
        } catch {
            Write-Host "Failed to stop process $($p.ProcessId): $_" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "No matching dev processes found by command line." -ForegroundColor Cyan
}

# Fallback: try to stop processes listening on common dev ports (5173 frontend, 5000 backend)
$ports = @(5173, 5000)
foreach ($port in $ports) {
    try {
        $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($conns) {
            $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
            foreach ($pid in $pids) {
                if (-not ($procs | Where-Object { $_.ProcessId -eq $pid })) {
                    try {
                        Stop-Process -Id $pid -Force -ErrorAction Stop
                        Write-Host "Stopped process $pid listening on port $port" -ForegroundColor Green
                    } catch {
                        Write-Host "Failed to stop process $pid (port $port): $_" -ForegroundColor Yellow
                    }
                }
            }
        }
    } catch {
        # Ignore errors (Get-NetTCPConnection may require admin privileges on some systems)
    }
}

Write-Host "Stop attempt complete." -ForegroundColor Green

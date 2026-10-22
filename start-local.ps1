# ==============================================================================
# CampusFind - One-Command Local Development Runner (PowerShell / Windows)
# ==============================================================================
# Usage:
#   .\start-local.ps1
#
# Starts both the backend dev server (Port 3001) and Vite frontend (Port 5173).
# ==============================================================================

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  Starting CampusFind Local Development Environment" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

# 1. Start Backend Dev Server
Write-Host "`n[1/2] Launching Backend Dev-Server (Port 3001)..." -ForegroundColor Yellow
$backendJob = Start-Process node -ArgumentList "backend/src/dev-server.js" -PassThru -NoNewWindow

Start-Sleep -Seconds 1

# 2. Start Frontend Vite Dev Server
Write-Host "[2/2] Launching Frontend Vite Dev-Server (Port 5173)..." -ForegroundColor Yellow
Write-Host "Opening http://localhost:5173 in your default browser..." -ForegroundColor Green

try {
    Start-Process "http://localhost:5173"
    npm --prefix frontend run dev
} finally {
    Write-Host "`nStopping backend process..." -ForegroundColor Yellow
    if ($backendJob -and !$backendJob.HasExited) {
        Stop-Process -Id $backendJob.Id -Force -ErrorAction SilentlyContinue
    }
    Write-Host "All processes cleanly stopped." -ForegroundColor Green
}

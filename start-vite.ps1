$ErrorActionPreference = "Stop"
$projectDir = "C:\Users\alexe\Desktop\CRM"

# Check API
$apiUp = (Test-NetConnection -ComputerName 127.0.0.1 -Port 4001 -InformationLevel Quiet) 2>$null
if (-not $apiUp) {
    Write-Host "[!] API not running. Run: powershell start-api.ps1" -ForegroundColor Red
    exit 1
}

# Kill any existing
Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
}
Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object {
    $_.Path -like "*Vite*" -or $_.CommandLine -like "*vite*"
} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Start Vite as detached
$proc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "cd /d $projectDir && npm run dev > $projectDir\vite.log 2>&1" -PassThru -WindowStyle Hidden

# Wait for port
$up = $false
for ($i=0; $i -lt 20; $i++) {
    Start-Sleep -Seconds 1
    $up = (Test-NetConnection -ComputerName 127.0.0.1 -Port 4000 -InformationLevel Quiet) 2>$null
    if ($up) { break }
}

if (-not $up) {
    Write-Host "[!] Vite did not start. Check vite.log" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Vite on http://localhost:4000" -ForegroundColor Green
Write-Host ""
Write-Host "Open:  http://localhost:4000" -ForegroundColor Cyan
Write-Host "Login: admin@nakcrm.ru / admin123   (SEX / admin123, Ellias / admin123)" -ForegroundColor Cyan

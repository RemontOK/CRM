$ErrorActionPreference = "Stop"
$projectDir = "C:\Users\alexe\Desktop\CRM"
$apiBat = "$projectDir\start-api.bat"

# Check MySQL
$mysqlOk = (Test-NetConnection -ComputerName 127.0.0.1 -Port 3307 -InformationLevel Quiet) 2>$null
if (-not $mysqlOk) {
    Write-Host "[!] MySQL not running. Run: cmd /c start /B C:\Users\alexe\Desktop\CRM\start-mysql.bat" -ForegroundColor Red
    exit 1
}

# Kill any existing
Get-NetTCPConnection -LocalPort 4001 -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
}
Get-Process -Name php -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Start as detached hidden process
$proc = Start-Process -FilePath $apiBat -PassThru -WindowStyle Hidden

# Wait for port
$up = $false
for ($i=0; $i -lt 15; $i++) {
    Start-Sleep -Seconds 1
    $up = (Test-NetConnection -ComputerName 127.0.0.1 -Port 4001 -InformationLevel Quiet) 2>$null
    if ($up) { break }
}

if (-not $up) {
    Write-Host "[!] API did not start. Check api-server.log" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] API on http://127.0.0.1:4001/api/" -ForegroundColor Green
Write-Host ""
Write-Host "Frontend:  http://localhost:4000  (run: npm run dev)" -ForegroundColor Cyan
Write-Host "Login:     admin@nakcrm.ru / admin123" -ForegroundColor Cyan

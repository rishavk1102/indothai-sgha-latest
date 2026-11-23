# Start the user-local MySQL used by this branch (port 3307).
$ErrorActionPreference = "Stop"
$bin = "C:\Program Files\MySQL\MySQL Server 8.0\bin"
$data = Join-Path $PSScriptRoot "..\.local-mysql\data" | Resolve-Path
$mysql = Join-Path $bin "mysql.exe"
$mysqld = Join-Path $bin "mysqld.exe"

try {
  & $mysql -h 127.0.0.1 -P 3307 -u root -plocaldev -e "SELECT 1;" 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) {
    Write-Host "Local MySQL already running on 127.0.0.1:3307"
    exit 0
  }
} catch {}

Write-Host "Starting local mysqld on 3307..."
Start-Process -FilePath $mysqld -ArgumentList @(
  "--datadir=$data",
  "--port=3307",
  "--bind-address=127.0.0.1",
  "--console"
) -WindowStyle Hidden

Start-Sleep 5
& $mysql -h 127.0.0.1 -P 3307 -u root -plocaldev -e "SELECT VERSION() AS version;"
Write-Host "Ready. Backend .env should use DB_HOST=127.0.0.1 DB_PORT=3307"

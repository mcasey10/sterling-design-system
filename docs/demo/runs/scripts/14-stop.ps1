# Step 9 (procedure step 14), after Michael's checks: close the Chrome windows 14-preview.ps1 opened, stop both
# previews (ports 4320 and 4322), and confirm nothing listens on either port.
# Usage: powershell -ExecutionPolicy Bypass -File C:\sterling-runs-private\scripts\14-stop.ps1 -n 04
param([Parameter(Mandatory)][string]$n)
$r = "C:\sterling-runs-private\run-$n"

# The check windows: Chrome processes using the two check profiles (never the user's own Chrome).
foreach ($c in @(Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -match 'sterling-runs-private\\chrome-(checks|compare)' })) {
  Stop-Process -Id $c.ProcessId -Force -ErrorAction SilentlyContinue
}
# The previews, by the process IDs 14-preview.ps1 saved.
foreach ($f in "preview.pid", "preview-compare.pid") {
  if (Test-Path "$r\$f") {
    $id = (Get-Content "$r\$f" -Raw).Trim()
    taskkill /PID $id /T /F 2>$null | Out-Null
    Remove-Item "$r\$f"
  }
}
# Anything still on the two ports: Vite's node process can outlive its shell (deviation 21), or a preview was started by hand.
foreach ($port in 4320, 4322) {
  foreach ($c in @(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)) {
    taskkill /PID $c.OwningProcess /T /F 2>$null | Out-Null
  }
}
Start-Sleep -Milliseconds 700
$busy = @(4320, 4322 | Where-Object { Get-NetTCPConnection -LocalPort $_ -State Listen -ErrorAction SilentlyContinue })
if ($busy.Count) {
  Write-Host "Still in use: port(s) $($busy -join ', '). Check before starting another run." -ForegroundColor Red
  exit 1
}
Write-Host "Stopped: the check windows are closed, and nothing listens on ports 4320 or 4322." -ForegroundColor Green

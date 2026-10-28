# Step 8 (procedure step 14), before Michael's checks: serve a finished run on http://localhost:4320/ from its folder
# in C:\sterling-runs-done, and open it in Chrome at 1440 x 900. With -Compare MM, also serve that finished run on
# http://localhost:4322/ and open it in a second window (on the second monitor if there is one), to compare runs side
# by side. Each window has its own Chrome profile in the private folder, so no zoom set elsewhere applies.
# Stop everything with 14-stop.ps1 when the checks are done (6-check.ps1 refuses to start a run while either port is
# in use).
# Usage: powershell -ExecutionPolicy Bypass -File C:\sterling-runs-private\scripts\14-preview.ps1 -n 04 [-Compare 03]
param([Parameter(Mandatory)][string]$n, [string]$Compare = "")
$ErrorActionPreference = "Stop"
function Stop-Run([string]$why) { Write-Host "STOPPED: $why" -ForegroundColor Red; exit 1 }

$r = "C:\sterling-runs-private\run-$n"
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $r)) { Stop-Run "No private folder $r" }
if (-not (Test-Path $chrome)) { Stop-Run "Chrome isn't at $chrome" }

function Start-Preview([string]$run, [int]$port, [string]$pidFile) {
  $done = "C:\sterling-runs-done\run-$run"
  if (-not (Test-Path "$done\dist\index.html")) { Stop-Run "No build in $done\dist (the scorer builds it in step 7)" }
  if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) { Stop-Run "Port $port is already in use. Run 14-stop.ps1 first." }
  $p = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npx vite preview --port $port --strictPort" -WorkingDirectory $done -WindowStyle Hidden -PassThru
  $p.Id | Out-File "$r\$pidFile" -Encoding ascii
  for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Milliseconds 500
    try { if ((Invoke-WebRequest "http://localhost:$port/" -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200) { break } } catch {}
  }
  if (-not (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)) { Stop-Run "The preview of run $run didn't start (process $($p.Id))" }
  Write-Host "Run $run is at http://localhost:$port/ (from $done)." -ForegroundColor Green
}
function Open-Window([int]$port, [string]$profile, [int]$x, [int]$y) {
  Start-Process $chrome -ArgumentList "--user-data-dir=C:\sterling-runs-private\$profile", "--no-first-run", "--new-window", "--window-position=$x,$y", "--window-size=1440,900", "http://localhost:$port/"
}

Start-Preview $n 4320 "preview.pid"
if ($Compare) { Start-Preview $Compare 4322 "preview-compare.pid" }

Open-Window 4320 "chrome-checks" 0 0
if ($Compare) {
  # The second window: on the second monitor if there is one, otherwise offset on the first.
  Add-Type -AssemblyName System.Windows.Forms
  $second = [System.Windows.Forms.Screen]::AllScreens | Where-Object { -not $_.Primary } | Select-Object -First 1
  if ($second) { Open-Window 4322 "chrome-compare" $second.WorkingArea.X $second.WorkingArea.Y }
  else { Open-Window 4322 "chrome-compare" 60 60 }
  Write-Host "Two Chrome windows: run $n (4320) on the main screen, run $Compare (4322) $(if ($second) { 'on the second monitor' } else { 'offset on top of it' })."
} else {
  Write-Host "A Chrome window with run $n is open at 1440 x 900."
}
Write-Host "Check the zoom is 100% (no magnifier icon in the address bar; Ctrl+0 resets it), and use Light."
Write-Host "When your checks are done: powershell -ExecutionPolicy Bypass -File C:\sterling-runs-private\scripts\14-stop.ps1 -n $n"

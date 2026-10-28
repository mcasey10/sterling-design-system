# Steps 9-12, after /exit, in window A: versions and end time, move the transcript, score, audit, move the run.
# From run 03 it then starts step 13, the automatic review (13-review.ps1).
# Usage: powershell -ExecutionPolicy Bypass -File C:\sterling-runs-private\scripts\9-12-after.ps1 -n 03
param([Parameter(Mandatory)][string]$n)
$ErrorActionPreference = "Stop"
$run = "C:\sterling-runs\run-$n"
$r = "C:\sterling-runs-private\run-$n"
$repo = (Resolve-Path "$PSScriptRoot\..\..\..\..").Path
$env:CLAUDE_CONFIG_DIR = "C:\sterling-runs-config"
$env:DISABLE_AUTOUPDATER = "1"

if (Get-CimInstance Win32_Process -Filter "Name='claude.exe'" | Where-Object { $_.CommandLine -match "mcp-config \.mcp\.json" }) {
  throw "The run's session still seems to be running. /exit it first."
}

# Processes the session left running from its folder (deviation 21): run 03's session left its Vite dev server
# running after /exit, which kept the folder in use. Record them, then stop them.
function Get-RunProcesses {
  $pattern = [regex]::Escape($run) + '(\\|"|\s|$)'
  @(Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -ne $PID -and (($_.CommandLine -match $pattern) -or ($_.ExecutablePath -match $pattern)) })
}
$left = @(Get-RunProcesses)
if ($left.Count) {
  $left | Select-Object ProcessId, ParentProcessId, Name, CommandLine | Format-List | Out-File "$r\leftover-processes.txt" -Encoding utf8
  foreach ($p in $left) { taskkill /PID $p.ProcessId /T /F 2>$null | Out-Null }
  Start-Sleep -Seconds 1
  Write-Host "The session left $($left.Count) process(es) running from its folder (listed in leftover-processes.txt); stopped them." -ForegroundColor Yellow
  if (@(Get-RunProcesses).Count) { throw "Processes from $run are still running after being stopped: see $r\leftover-processes.txt. Stop them, then run this again." }
}

# Step 9
Set-Location $run
claude --version > "$r\version-end.txt"
Get-Date -Format o > "$r\ended.txt"
Write-Host "Step 9: version-end.txt, ended.txt"

# Step 10
$proj = "C:\sterling-runs-config\projects\C--sterling-runs-run-$n"
if (-not (Test-Path $proj)) { throw "No transcript folder: $proj" }
Set-Location C:\
Move-Item $proj "$r\transcript"
Write-Host "Step 10: transcript moved to $r\transcript"

# Step 11
Push-Location "$repo\demo\scoring"
node score.mjs $run --out "$r\scores" --name "run-$n"
$t = Get-ChildItem "$r\transcript\*.jsonl" | Select-Object -First 1
node audit-transcript.mjs $t.FullName $run --out "$r\audit.md"
Pop-Location
Write-Host "Step 11: scores and audit.md written"

# Step 12. The scorer's preview has stopped, but anything that still holds the folder (a process started from it, an
# Explorer window, an editor) makes the move fail: stop what started from it, try again, and otherwise say what to do.
$left = @(Get-RunProcesses)
if ($left.Count) {
  $left | Select-Object ProcessId, ParentProcessId, Name, CommandLine | Format-List | Out-File "$r\leftover-processes.txt" -Append -Encoding utf8
  foreach ($p in $left) { taskkill /PID $p.ProcessId /T /F 2>$null | Out-Null }
  Start-Sleep -Seconds 1
}
$moved = $false
for ($i = 0; $i -lt 3 -and -not $moved; $i++) {
  try {
    Move-Item $run "C:\sterling-runs-done\run-$n" -ErrorAction Stop
    $moved = $true
  } catch {
    $left = @(Get-RunProcesses)
    if ($left.Count) {
      $left | Select-Object ProcessId, ParentProcessId, Name, CommandLine | Format-List | Out-File "$r\leftover-processes.txt" -Append -Encoding utf8
      foreach ($p in $left) { taskkill /PID $p.ProcessId /T /F 2>$null | Out-Null }
    }
    Start-Sleep -Seconds 2
  }
}
if (-not $moved) {
  Write-Host ""
  Write-Host "STOPPED at step 12: C:\sterling-runs\run-$n is in use, so it can't be moved." -ForegroundColor Red
  Write-Host "Close any Explorer window, editor, or terminal that is open in that folder, then, in this window:"
  Write-Host "  Move-Item C:\sterling-runs\run-$n C:\sterling-runs-done\run-$n"
  Write-Host "  powershell -ExecutionPolicy Bypass -File $PSScriptRoot\13-review.ps1 -n $n"
  Write-Host "If the move still fails, tell the planning session. Steps 9-11 are done; don't run this script again."
  exit 1
}
Write-Host "Step 12: run moved to C:\sterling-runs-done\run-$n"
Write-Host ""

# replies.txt (deviation 26): if Michael didn't write it, write it from the transcript (the messages sent after the
# request, or "none"), before the review reads it.
if (-not (Test-Path "$r\replies.txt")) {
  $t = Get-ChildItem "$r\transcript\*.jsonl" | Select-Object -First 1
  node (Join-Path $PSScriptRoot "replies-from-transcript.mjs") $t.FullName "$r\replies.txt"
  Write-Host "replies.txt was missing, so it was written from the transcript. Check it, and add anything a permission menu asked." -ForegroundColor Yellow
}

# Step 13 (deviation 13): the automatic review, in this window, about 20-40 minutes.
Write-Host "Step 13: the automatic review (13-review.ps1)."
$review = Join-Path $PSScriptRoot "13-review.ps1"
& powershell -ExecutionPolicy Bypass -File $review -n $n
if ($LASTEXITCODE) { exit $LASTEXITCODE }

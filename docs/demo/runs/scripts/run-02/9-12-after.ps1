# Steps 9-12, after /exit, in window A: versions and end time, move the transcript, score, audit, move the run.
# Usage: powershell -ExecutionPolicy Bypass -File C:\sterling-runs-private\scripts\9-12-after.ps1 -n 02
param([Parameter(Mandatory)][string]$n)
$ErrorActionPreference = "Stop"
$run = "C:\sterling-runs\run-$n"
$r = "C:\sterling-runs-private\run-$n"
$repo = (Resolve-Path "$PSScriptRoot\..\..\..\..\..").Path
$env:CLAUDE_CONFIG_DIR = "C:\sterling-runs-config"
$env:DISABLE_AUTOUPDATER = "1"

if (Get-CimInstance Win32_Process -Filter "Name='claude.exe'" | Where-Object { $_.CommandLine -match "mcp-config \.mcp\.json" }) {
  throw "The run's session still seems to be running. /exit it first."
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

# Step 12
Move-Item $run "C:\sterling-runs-done\run-$n"
Write-Host "Step 12: run moved to C:\sterling-runs-done\run-$n"
Write-Host ""
Write-Host "Next: step 13, the review session in the repo."

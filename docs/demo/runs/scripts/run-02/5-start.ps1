# Step 5: start the run's Claude Code session. Window A.
# Usage: powershell -ExecutionPolicy Bypass -File C:\sterling-runs-private\scripts\5-start.ps1 -n 02
param([Parameter(Mandatory)][string]$n)
$ErrorActionPreference = "Stop"
$run = "C:\sterling-runs\run-$n"
if (-not (Test-Path $run)) { throw "No run folder: $run (do step 4 first)" }
if (-not (Test-Path "C:\sterling-runs-private\run-$n\started.txt")) { throw "Step 4 isn't finished: no started.txt" }
Set-Location $run
$env:CLAUDE_CONFIG_DIR = "C:\sterling-runs-config"
$env:DISABLE_AUTOUPDATER = "1"
Write-Host "Starting the session in $run. Next, in the session: /mcp, /status, /skills (step 6)."
# --setting-sources is quoted (deviation 2).
claude --strict-mcp-config --mcp-config .mcp.json --setting-sources "project,local" --model claude-opus-5-5 --effort medium --permission-mode auto

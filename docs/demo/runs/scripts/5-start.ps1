# Steps 4 and 5, for runs 03-05: copy the kit and record it (step 4), check it, then start the run's Claude Code
# session (step 5). Window A. Stops at the first step that fails, or if the server, the package, or Claude Code isn't
# the series' version.
# Usage: powershell -ExecutionPolicy Bypass -File C:\sterling-runs-private\scripts\5-start.ps1 -n 03
#        The control runs (deviation 28): ... 5-start.ps1 -n C1 -Control   (the pre-fix kit, Sterling 1.1.1)
param([Parameter(Mandatory)][string]$n, [switch]$Control)
$ErrorActionPreference = "Stop"
function Stop-Run([string]$why) { Write-Host "STOPPED: $why" -ForegroundColor Red; exit 1 }

$repo = (Resolve-Path "$PSScriptRoot\..\..\..\..").Path
$run = "C:\sterling-runs\run-$n"
$r = "C:\sterling-runs-private\run-$n"
$claudeVersion = "^2\.1\.308\b"   # the Claude Code version held for the series
if ($Control) {
  # The control kit (deviation 28): October 14's Sterling 1.1.1, built at 9888b34, with today's settings.
  $kit = "C:\sterling-runs-private\control-kit"
  $package = "sterling-ui-1.1.1.tgz"
  $serverHash = "FBDDB8696F569D16BC69943C55B85C8BE7F1E55188DBEE846160A4D9C4A670DE"
  $packageHash = "B1868CB6EF0F9B496D4D034010819B6CC34B0B4F3E6BD4828F34E880435A0BCE"
  $serverVersion = "1\.1\.1 .* export 1\.1\.1, released 2026-10-11 .* data 270e4d24c805b41f63fea1d1b34b202456cea276d6257549787d3b302c9d1471"
} else {
  # The v1.2.0 release assets (methods.md).
  $kit = "$repo\demo\kit"
  $package = "sterling-ui-1.2.0.tgz"
  $serverHash = "98D9C59EACF9BE606B710436BDBC8930959BD03B4E7371DBFF3F56592334438E"
  $packageHash = "B577B03892ADEBC9732EC34185B9D44D1B5A1C9F7852D2682B7350F643AF5C18"
  $serverVersion = "1\.2\.0 .* export 1\.2\.0, released 2026-10-21 .* data dce7ff6c470cffb1e43835c16e178923f9a5478788ce739a37ddf708679d140a"
}

# Before anything is copied.
foreach ($d in "C:\sterling-runs", "C:\sterling-runs-done", "C:\sterling-runs-config", "C:\sterling-runs-private") {
  if (-not (Test-Path $d)) { Stop-Run "Missing series folder $d (deviation 1)" }
}
if (Test-Path $run) { Stop-Run "$run already exists" }
if (Test-Path "C:\sterling-runs-done\run-$n") { Stop-Run "C:\sterling-runs-done\run-$n already exists" }
if (Test-Path $r) { Stop-Run "$r already exists" }
if (Test-Path "C:\sterling-runs-config\projects\C--sterling-runs-run-$n") { Stop-Run "A transcript folder for run $n already exists in C:\sterling-runs-config\projects" }
if (-not (Test-Path "$kit\mcp\server.js")) { Stop-Run "No built kit at $kit (npm run demo:kit)" }

# Step 4.
Copy-Item $kit $run -Recurse
New-Item -ItemType Directory $r | Out-Null
Set-Location $run
npm ci
if ($LASTEXITCODE) { Stop-Run "npm ci failed (exit $LASTEXITCODE)" }
npm ls --depth=0 > "$r\npm-ls.txt"
if ($LASTEXITCODE) { Stop-Run "npm ls reported a problem (exit $LASTEXITCODE): see $r\npm-ls.txt" }
$version = node .\mcp\server.js --version
$version > "$r\server-version.txt"
if ($version -notmatch $serverVersion) { Stop-Run "The kit's server reports '$version', not the expected version" }
$hashes = Get-FileHash .\mcp\server.js, ".\$package"
$hashes | Format-List > "$r\hashes.txt"
if ($hashes[0].Hash -ne $serverHash) { Stop-Run "mcp\server.js hash $($hashes[0].Hash) isn't the expected one" }
if ($hashes[1].Hash -ne $packageHash) { Stop-Run "$package hash $($hashes[1].Hash) isn't the expected one" }
$env:CLAUDE_CONFIG_DIR = "C:\sterling-runs-config"
$env:DISABLE_AUTOUPDATER = "1"
$claude = claude --version
$claude > "$r\version-start.txt"
if ($claude -notmatch $claudeVersion) { Stop-Run "Claude Code is '$claude', not 2.1.308" }
Get-Date -Format o > "$r\started.txt"
Write-Host "Step 4 done: $run, with npm-ls.txt, server-version.txt, hashes.txt, version-start.txt, started.txt in $r" -ForegroundColor Green

# Step 5. The session's working folder is the run folder, so its transcript goes to projects\C--sterling-runs-run-$n.
Write-Host "Starting the session in $run. Next, in the session: /mcp, /status, /skills (step 6)."
# --setting-sources is quoted (deviation 2).
claude --strict-mcp-config --mcp-config .mcp.json --setting-sources "project,local" --model claude-opus-5-5 --effort medium --permission-mode auto

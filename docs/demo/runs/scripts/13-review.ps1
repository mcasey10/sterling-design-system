# Step 13, from run 02: the review, as a one-off, non-interactive Claude Code run in the repo (deviation 13).
# Fresh every time: its own configuration folder (C:\sterling-runs-private\review-config, which no run can read), no
# MCP servers, no memory of earlier reviews. It may write only in the run's private folder, and it ends by printing
# its summary, which starts with anything that needs Michael's decision.
# Window A, after 9-12-after.ps1 (which calls it, from run 03). About 20-40 minutes.
# Usage: powershell -ExecutionPolicy Bypass -File C:\sterling-runs-private\scripts\13-review.ps1 -n 02
#        For the test on a copy of run 01: add -Private C:\sterling-runs-private\review-test\run-01
param([Parameter(Mandatory)][string]$n, [string]$Private = "")
$ErrorActionPreference = "Stop"
function Stop-Run([string]$why) { Write-Host "STOPPED: $why" -ForegroundColor Red; exit 1 }
function Rule([string]$path) { "//" + ($path.Substring(0, 1).ToLower()) + ($path.Substring(2) -replace "\\", "/") }

$repo = (Resolve-Path "$PSScriptRoot\..\..\..\..").Path
$scripts = "C:\sterling-runs-private\scripts"
$cfg = "C:\sterling-runs-private\review-config"
$archive = "C:\sterling-runs-private\review-archive"
$done = "C:\sterling-runs-done\run-$n"
$r = if ($Private) { $Private } else { "C:\sterling-runs-private\run-$n" }
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
# Start from a folder that exists: after step 12 the window's own folder (the run's) has moved.
Set-Location C:\

# The one-time login.
if (-not (Test-Path "$cfg\.credentials.json")) {
  Write-Host "The review's configuration folder has no login yet. Do this once, in a new PowerShell window:" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "  `$env:CLAUDE_CONFIG_DIR = `"$cfg`""
  Write-Host "  `$env:DISABLE_AUTOUPDATER = `"1`""
  Write-Host "  cd `"$repo`""
  Write-Host "  claude"
  Write-Host ""
  Write-Host "In the session: /login, sign in, then /exit. Send no other message. Then run this script again."
  Write-Host "(This script moves that login session's transcript out of the way before the review starts.)"
  exit 1
}

# What the review needs.
if (-not (Test-Path $done)) { Stop-Run "No finished run at $done (steps 9-12)" }
foreach ($f in "scores\results.csv", "audit.md") { if (-not (Test-Path "$r\$f")) { Stop-Run "No $f in $r (step 11)" } }
if (-not (Get-ChildItem "$r\transcript\*.jsonl" -ErrorAction SilentlyContinue)) { Stop-Run "No transcript in $r\transcript (step 10)" }
foreach ($f in "manual-claude.md", "results-reviewed.csv") { if (Test-Path "$r\$f") { Stop-Run "$r\$f already exists: this run has been reviewed" } }
if (Get-CimInstance Win32_Process -Filter "Name='claude.exe'" | Where-Object { $_.CommandLine -match "mcp-config \.mcp\.json" }) { Stop-Run "A run's session seems to be running. The review serves the screen on localhost, which a running session could reach." }
if (Get-NetTCPConnection -LocalPort 4321 -State Listen -ErrorAction SilentlyContinue) { Stop-Run "Port 4321 (the review's preview) is already in use" }

# Earlier sessions in the review's configuration (the login, or a review that didn't finish) go to the archive, which
# the review can't read.
$projName = $repo -replace "[:\\/]", "-"
if (Test-Path "$cfg\projects\$projName") {
  New-Item -ItemType Directory "$archive\$stamp" -Force | Out-Null
  Move-Item "$cfg\projects\$projName" "$archive\$stamp\$projName"
  Write-Host "Moved an earlier session's files from the review's configuration to $archive\$stamp"
}

# Permissions. Denied: every other run, the series' other private folders, the maintainer's own configuration, the
# review configuration's own records (not projects\, where its saved outputs go), the web. Read-only: the repo and the
# run folder. Writable: the run's private folder.
$deny = @("WebFetch", "WebSearch", "mcp__claude-in-chrome", "mcp__figma", "mcp__figma-desktop")
$onPath = { param($child) $r.StartsWith($child.FullName, [StringComparison]::OrdinalIgnoreCase) }
foreach ($c in Get-ChildItem "C:\sterling-runs-private" -Directory) {
  if ($c.FullName -eq $cfg) { continue }
  if (& $onPath $c) {
    # A folder that holds the private folder in use (review-test, for the test): deny its other children.
    if ($c.FullName -ne $r) { foreach ($s in Get-ChildItem $c.FullName -Directory | Where-Object { -not ($r.StartsWith($_.FullName, [StringComparison]::OrdinalIgnoreCase)) }) { $deny += "Read($(Rule $s.FullName)/**)", "Edit($(Rule $s.FullName)/**)" } }
    continue
  }
  $deny += "Read($(Rule $c.FullName)/**)", "Edit($(Rule $c.FullName)/**)"
}
foreach ($f in Get-ChildItem "C:\sterling-runs-private" -File) { $deny += "Read($(Rule $f.FullName))", "Edit($(Rule $f.FullName))" }
foreach ($c in Get-ChildItem "C:\sterling-runs-done" -Directory | Where-Object { $_.FullName -ne $done }) { $deny += "Read($(Rule $c.FullName)/**)", "Edit($(Rule $c.FullName)/**)" }
foreach ($d in "file-history", "backups", "sessions", "shell-snapshots", "paste-cache", "plans", "todos", "debug", "session-env") { $deny += "Read($(Rule "$cfg\$d")/**)", "Edit($(Rule "$cfg\$d")/**)" }
foreach ($f in "history.jsonl", ".claude.json", ".credentials.json") { $deny += "Read($(Rule "$cfg\$f"))", "Edit($(Rule "$cfg\$f"))" }
$deny += "Read($(Rule "$HOME\.claude")/**)", "Edit($(Rule "$HOME\.claude")/**)", "Read($(Rule "$HOME\.claude.json"))", "Edit($(Rule "$HOME\.claude.json"))"
$deny += "Edit($(Rule $repo)/**)", "Edit(//c/sterling-runs-done/**)", "Edit(//c/sterling-runs/**)", "Edit(//c/sterling-runs-config/**)"
$allow = @("Edit($(Rule $r)/**)", "Bash(node:*)", "Bash(npx vite preview:*)")
$settings = @{ permissions = @{ deny = $deny; allow = $allow } } | ConvertTo-Json -Depth 5
[IO.File]::WriteAllText("$r\review-settings.json", $settings, (New-Object Text.UTF8Encoding($false)))
[IO.File]::WriteAllText("$scripts\review-mcp.json", '{ "mcpServers": {} }', (New-Object Text.UTF8Encoding($false)))

# A guard for what deny rules can't stop (shell commands): the repo and the run's code must be unchanged afterwards.
$gitBefore = (git -C $repo status --porcelain) -join "`n"
$srcBefore = (Get-ChildItem "$done\src" -Recurse -File | Get-FileHash | ForEach-Object { "$($_.Hash) $($_.Path)" }) -join "`n"

$prompt = @"
Review repeat run $n of the Pool loans demo. Follow "Claude Code's review" in docs/demo/runs/procedure.md, with the run folder $done and the private folder $r. Also apply docs/demo/runs/deviations.md. Change nothing in the repo or the run folder; write only in the private folder.

You are running without a person: no one will answer a question, and nothing you write is seen until you finish. Where you would have asked, decide what you can from the checklist, methods, procedure, and deviations. Where you can't, mark the check "could not run" (or leave the owner open) and list it as a decision for Michael.

Owners (deviation 16): a fail may be owned by AI's draft only if you quote, in the owner reason, the Sterling guidance that clearly covers it, and cite where the transcript shows the run read that guidance (the call and its place). Without both, the owner is Sterling. The owners request and kit data still follow the checklist's owner rule. When a screen changes the color mode or density the host set, the owner is Sterling (the ruling in deviation 16). If you are unsure of an owner, give your best owner and list the fail under Needs Michael's decision.

Start the summary, in your final message and at the top of manual-claude.md, with "Needs Michael's decision:" and a numbered list of every decision you left for him (or "none"). Then give the rest of the summary as procedure.md and the deviations ask. Your final message is the summary, and nothing else.
"@

$env:CLAUDE_CONFIG_DIR = $cfg
$env:DISABLE_AUTOUPDATER = "1"
Set-Location $repo
claude --version | Out-File "$r\review-version.txt" -Encoding ascii
Get-Date -Format o | Out-File "$r\review-started.txt" -Encoding ascii
Start-Transcript -Path "$r\review-console.txt" | Out-Null
Write-Host "Reviewing run $n (private folder $r). This takes about 10-40 minutes; the summary is printed at the end."
# The prompt goes in on standard input: Windows PowerShell 5.1 mangles double quotes inside a program's arguments.
$OutputEncoding = New-Object Text.UTF8Encoding($false)
[Console]::OutputEncoding = New-Object Text.UTF8Encoding($false)
$summary = $prompt | claude -p --strict-mcp-config --mcp-config "$scripts\review-mcp.json" --setting-sources "project,local" --settings "$r\review-settings.json" --model claude-opus-5-5 --effort high --permission-mode auto --output-format text
$exit = $LASTEXITCODE
# The summary, in UTF-8 (Tee-Object in Windows PowerShell 5.1 writes UTF-16), then on screen.
[IO.File]::WriteAllText("$r\review-summary.txt", (($summary | Out-String).TrimEnd() + "`r`n"), (New-Object Text.UTF8Encoding($false)))
Write-Host ""
$summary | ForEach-Object { Write-Host $_ }
Get-Date -Format o | Out-File "$r\review-ended.txt" -Encoding ascii

# Afterwards: the review's preview stopped, its transcript moved into the run's private folder, and the guard.
foreach ($c in @(Get-NetTCPConnection -LocalPort 4321 -State Listen -ErrorAction SilentlyContinue)) { taskkill /PID $c.OwningProcess /T /F 2>$null | Out-Null }
if (Test-Path "$cfg\projects\$projName") {
  $dest = if (Test-Path "$r\review\transcript") { "$r\review\transcript-$stamp" } else { "$r\review\transcript" }
  New-Item -ItemType Directory "$r\review" -Force | Out-Null
  Move-Item "$cfg\projects\$projName" $dest
  Write-Host "The review's transcript: $dest"
}
$problems = @()
if ($exit) { $problems += "Claude Code exited with $exit" }
foreach ($f in "manual-claude.md", "results-reviewed.csv") { if (-not (Test-Path "$r\$f")) { $problems += "The review wrote no $f" } }
if (((git -C $repo status --porcelain) -join "`n") -ne $gitBefore) { $problems += "The repo changed during the review (git status differs)" }
if (((Get-ChildItem "$done\src" -Recurse -File | Get-FileHash | ForEach-Object { "$($_.Hash) $($_.Path)" }) -join "`n") -ne $srcBefore) { $problems += "The run's src changed during the review" }
if (Get-NetTCPConnection -LocalPort 4321 -State Listen -ErrorAction SilentlyContinue) { $problems += "Something still listens on port 4321" }
if ($problems.Count) {
  Write-Host ""; Write-Host "REVIEW NEEDS A LOOK:" -ForegroundColor Red
  $problems | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
  Stop-Transcript | Out-Null
  exit 1
}
Write-Host ""; Write-Host "Review done: $r\manual-claude.md, results-reviewed.csv, review-summary.txt. Next: your checks (step 14)." -ForegroundColor Green
Stop-Transcript | Out-Null

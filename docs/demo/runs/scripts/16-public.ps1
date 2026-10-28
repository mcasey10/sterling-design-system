# Step 16, for runs 03-05: the public record. Window A. Builds it in the run's private folder (public\), writes
# report.md from the session's final four-item list, scans everything for the banned terms and local paths, and
# copies it into the repo only if the scan is clean. Stops on any match.
# Usage: powershell -ExecutionPolicy Bypass -File C:\sterling-runs-private\scripts\16-public.ps1 -n 03 -Banned <banned-terms file>
param([Parameter(Mandatory)][string]$n, [Parameter(Mandatory)][string]$Banned)
$ErrorActionPreference = "Stop"
function Stop-Run([string]$why) { Write-Host "STOPPED: $why" -ForegroundColor Red; exit 1 }

$r = "C:\sterling-runs-private\run-$n"
$repo = (Resolve-Path "$PSScriptRoot\..\..\..\..").Path
$scripts = "C:\sterling-runs-private\scripts"
$stage = "$r\public"
$out = "$repo\docs\demo\runs\run-$n"
if (-not (Test-Path "$r\results-reviewed.csv")) { Stop-Run "No results-reviewed.csv yet (steps 13 and 15)" }
if (-not (Test-Path $Banned)) { Stop-Run "No banned-terms file at $Banned" }
if (Test-Path $out) { Stop-Run "$out already exists" }
$t = Get-ChildItem "$r\transcript\*.jsonl" | Select-Object -First 1
if (-not $t) { Stop-Run "No transcript in $r\transcript" }

# Build it in the private folder first.
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory $stage | Out-Null
Copy-Item "$r\results-reviewed.csv", "$r\scores\*.png" "$stage\"
Copy-Item "C:\sterling-runs-done\run-$n\src" "$stage\src" -Recurse
$report = node "$scripts\final-message.mjs" $t.FullName
if ($LASTEXITCODE) { Stop-Run "Couldn't find the session's final four-item list in the transcript" }
"# Run $n`: the session's final message`n`nAs the session wrote it, unedited.`n`n" + ($report -join "`n") | Out-File "$stage\report.md" -Encoding utf8
# Which Sterling answered: the version the run's server reported at step 1 (1.2.0, or 1.1.1 for the control runs).
$serverLine = (Get-Content "$r\server-version.txt" -ErrorAction SilentlyContinue) -join " "
$sterling = [regex]::Match($serverLine, 'server (\d+\.\d+\.\d+)').Groups[1].Value
if (-not $sterling) { Stop-Run "Can't read the Sterling version from $r\server-version.txt" }
Push-Location $repo
npm --prefix ui run demo:extract -- $t.FullName --banned $Banned --out "$stage\session.json" --answers "As the kit's MCP server (Sterling $sterling) answered"
$extract = $LASTEXITCODE
Pop-Location
if ($extract) { Stop-Run "demo:extract refused (exit $extract): see its message above" }

# Scan every text file: the banned terms (a line "term => substitute" bans "term"), local paths, and the two real
# agency names, which may appear only in the loan example's source note. (This copy leaves the user name, an old
# folder name, and the two agency names out of the patterns: see README.md.)
$terms = Get-Content $Banned | ForEach-Object { ($_ -split "=>")[0].Trim() } | Where-Object { $_ }
$patterns = @($terms | ForEach-Object { [regex]::Escape($_) }) + @('[A-Za-z]:\\', 'users[/\\][^/\\]+', '/c/users')
$found = @()
foreach ($f in Get-ChildItem $stage -Recurse -File | Where-Object { $_.Extension -ne ".png" }) {
  $lines = Get-Content $f.FullName
  for ($i = 0; $i -lt $lines.Count; $i++) {
    foreach ($p in $patterns) {
      if ($lines[$i] -match "(?i)$p") { $found += "$($f.FullName.Substring($stage.Length + 1)):$($i + 1)  matches a banned term or local path" }
    }
  }
}
if ($found.Count) {
  $found | Select-Object -Unique | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
  Stop-Run "$($found.Count) match(es). Nothing was copied to the repo; fix them in $stage or at the source, and run this again."
}

New-Item -ItemType Directory $out | Out-Null
Copy-Item "$stage\*" $out -Recurse
Write-Host "Written: $out (results-reviewed.csv, screenshots, src, report.md, session.json). Scan clean. Commit it on the series branch." -ForegroundColor Green

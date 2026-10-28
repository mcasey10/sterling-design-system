# Step 16: the public record. Window A. Copy the final four-item list into report.md yourself afterwards.
# Usage: powershell -ExecutionPolicy Bypass -File C:\sterling-runs-private\scripts\16-public.ps1 -n 02 -Banned <banned-terms file>
param([Parameter(Mandatory)][string]$n, [Parameter(Mandatory)][string]$Banned)
$ErrorActionPreference = "Stop"
$r = "C:\sterling-runs-private\run-$n"
$repo = (Resolve-Path "$PSScriptRoot\..\..\..\..\..").Path
$out = "docs\demo\runs\run-$n"
if (-not (Test-Path "$r\results-reviewed.csv")) { throw "No results-reviewed.csv yet (steps 13 and 15)" }
Set-Location $repo
$t = Get-ChildItem "$r\transcript\*.jsonl" | Select-Object -First 1
New-Item -ItemType Directory $out | Out-Null
Copy-Item "$r\results-reviewed.csv", "$r\scores\*.png" "$out\"
Copy-Item "C:\sterling-runs-done\run-$n\src" "$out\src" -Recurse
npm --prefix ui run demo:extract -- $t.FullName --banned $Banned --out "$out\session.json" --answers "As the kit's MCP server (Sterling 1.2.0) answered"
Write-Host "Written: $out. Now copy the session's final list into $out\report.md, then scan for banned terms and local paths before committing."

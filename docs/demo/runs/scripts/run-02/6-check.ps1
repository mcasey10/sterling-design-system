# Step 6, the window B part (deviation 4): save processes.txt and ports.txt, and check them.
# Run while the session is open in window A, before pasting the request.
# Usage: powershell -ExecutionPolicy Bypass -File C:\sterling-runs-private\scripts\6-check.ps1 -n 02
param([Parameter(Mandatory)][string]$n)
$r = "C:\sterling-runs-private\run-$n"
if (-not (Test-Path $r)) { throw "No private folder: $r" }

$procs = Get-CimInstance Win32_Process -Filter "Name='node.exe' OR Name='claude.exe'"
$procs | Select-Object ProcessId, ParentProcessId, Name, CommandLine | Format-List > "$r\processes.txt"

$listen = Get-NetTCPConnection -State Listen | Sort-Object LocalPort | ForEach-Object {
  $p = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
  [pscustomobject]@{ LocalAddress = $_.LocalAddress; LocalPort = $_.LocalPort; OwningProcess = $_.OwningProcess; Process = $p.ProcessName }
}
$listen | Format-Table -AutoSize > "$r\ports.txt"

$problems = @()
$all = Get-CimInstance Win32_Process
$servers = $procs | Where-Object { $_.Name -eq "node.exe" -and $_.CommandLine -match "\./mcp/server\.js" }
if (@($servers).Count -ne 1) {
  $problems += "Expected one 'node ./mcp/server.js', found $(@($servers).Count). Is the session running?"
} else {
  $parent = $all | Where-Object { $_.ProcessId -eq $servers.ParentProcessId }
  if (-not $parent -or $parent.Name -ne "claude.exe") {
    $problems += "The server's parent isn't claude.exe (parent $($servers.ParentProcessId))."
  } else {
    $kids = $procs | Where-Object { $_.Name -eq "node.exe" -and $_.ParentProcessId -eq $parent.ProcessId -and $_.ProcessId -ne $servers.ProcessId }
    foreach ($k in $kids) { $problems += "The run's claude.exe ($($parent.ProcessId)) also started: $($k.CommandLine)" }
    Write-Host "The run's claude.exe: $($parent.ProcessId); its server: $($servers.ProcessId) (node ./mcp/server.js)"
  }
}
$bad = $listen | Where-Object { $_.Process -match "^(node|Figma|python|deno|bun|java|ruby|php|nginx|httpd|caddy)" }
foreach ($b in $bad) { $problems += "Listening: $($b.Process) (process $($b.OwningProcess)) on port $($b.LocalPort). Stop it and run this again." }

$others = $procs | Where-Object { $_.Name -eq "node.exe" -and $_.CommandLine -match "sterling-mcp\.js" }
foreach ($o in $others) { Write-Host "Note: sterling-mcp.js $($o.ProcessId) belongs to another session (parent $($o.ParentProcessId)); allowed by deviation 4." }

Write-Host "Saved $r\processes.txt and $r\ports.txt"
if ($problems.Count) {
  Write-Host ""; Write-Host "NOT READY:" -ForegroundColor Red
  $problems | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
  Write-Host "If you stop something, note it in $r\processes-note.txt and run this again."
  exit 1
}
Write-Host "READY: only the run's server, and nothing else listening. Paste the request (step 7)." -ForegroundColor Green
Get-Content "$PSScriptRoot\..\..\..\..\..\demo\prompt.md" -Raw | Set-Clipboard
Write-Host "The request is on the clipboard."

# Repeat runs: the procedure

One page to follow for every run, the same way each time. [methods.md](methods.md) says why; [checklist.md](checklist.md)
says what is scored. Every step names the console and the folder it runs in.

**Folders**

| | |
|---|---|
| `C:\sterling-runs\run-NN` | The run in progress (NN = 01 to 05) |
| `C:\sterling-runs-done` | Finished runs. Denied to later runs |
| `C:\sterling-runs-private` | Transcripts, records, calibration. Denied to every run, never committed |
| `C:\sterling-runs-config` | Claude Code's configuration for the series. Only its `projects\` folder is readable by a run |
| `~\Documents\sterling-design-system` | This repository, called *the repo* below. Denied to every run |

**Consoles:** *PowerShell A* is the console the session runs in; *PowerShell B* is a second one beside it.
*The session* is the Claude Code session in PowerShell A.

---

## Once, before run 1

**1. Build the kit.** PowerShell, the repo:

```powershell
npm run demo:kit
node .\demo\kit\mcp\server.js --version
Get-FileHash .\demo\kit\mcp\server.js, .\demo\kit\sterling-ui-1.2.0.tgz
```

Expect `1.2.0 · export 1.2.0, released 2026-10-21 · data dce7ff6c…`, and the hashes `98D9C59E…438E` (server)
and `B577B038…5C18` (package), as in methods.md. Anything else: stop.

**2. Remove your own registration of the server.** PowerShell, any folder:

```powershell
claude mcp get sterling > C:\sterling-runs-private\mcp-user-before.txt
claude mcp remove sterling -s user
claude mcp list
```

`sterling` must no longer be listed.

**3. The dry run** (a login and a check of every setting; no request). PowerShell A, `C:\`:

```powershell
Copy-Item "$HOME\Documents\sterling-design-system\demo\kit" C:\sterling-runs\dry-run -Recurse
cd C:\sterling-runs\dry-run
npm ci
$env:CLAUDE_CONFIG_DIR = "C:\sterling-runs-config"
$env:DISABLE_AUTOUPDATER = "1"
claude --version
claude --strict-mcp-config --mcp-config .mcp.json --setting-sources project,local --model claude-opus-5-5 --effort medium --permission-mode auto
```

In the session:

1. `/login`, and sign in.
2. `/status`, `/mcp`, `/skills`, `/model`: copy each output into
   `C:\sterling-runs-private\dry-login\` (`status.txt`, `mcp.txt`, `skills.txt`, `model.txt`).
3. Send: `Run this and show me the full output: Get-ChildItem -Recurse node_modules | Select-Object FullName`.
   The output is too long to show, so Claude Code saves it to a file. Then send: `Read the file you saved that
   output to, and tell me its first line.` It must read it. A refusal means the deny list blocks the run's own
   files: stop.
4. `/exit`.

Then fill in `C:\sterling-runs-private\dry-login\flags.md`, one line per setting, saying where it was confirmed:

| Setting | Confirmed in |
|---|---|
| `--strict-mcp-config --mcp-config .mcp.json` | `/mcp`: only `sterling`, `node ./mcp/server.js`, no claude.ai connectors |
| `--setting-sources project,local` | `/status`: no user settings |
| `--model claude-opus-5-5` | `/status` or `/model` |
| `--effort medium` | `/status`, or the transcript (step 4 below) |
| `--permission-mode auto` | `/status`, or the mode shown under the prompt |
| `CLAUDE_CONFIG_DIR` | `/status`, and the transcript is in `C:\sterling-runs-config\projects\` |
| `DISABLE_AUTOUPDATER` | `claude --version` the same before and after |

If `/status` doesn't show a setting, write "can't confirm from /status" and look in the transcript. PowerShell, the
repo's `demo\scoring`:

```powershell
$t = Get-ChildItem C:\sterling-runs-config\projects\C--sterling-runs-dry-run\*.jsonl | Select-Object -First 1
node audit-transcript.mjs $t.FullName C:\sterling-runs\dry-run --out C:\sterling-runs-private\dry-login\audit.md
```

The report's "The session" section gives the version, model, effort, and mode, with the line each came from.
Write that in `flags.md`. A setting confirmed nowhere stops the series until it's resolved.

Last, PowerShell, `C:\`:

```powershell
Move-Item C:\sterling-runs-config\projects\C--sterling-runs-dry-run C:\sterling-runs-private\dry-login\transcript
Move-Item C:\sterling-runs\dry-run C:\sterling-runs-done\dry-run
```

---

## Each run

### Before

**4. Copy the kit and record what it holds.** PowerShell A, `C:\`:

```powershell
$n = "01"   # the run's number
Copy-Item "$HOME\Documents\sterling-design-system\demo\kit" "C:\sterling-runs\run-$n" -Recurse
New-Item -ItemType Directory "C:\sterling-runs-private\run-$n" | Out-Null
cd "C:\sterling-runs\run-$n"
npm ci
$r = "C:\sterling-runs-private\run-$n"
npm ls --depth=0 > "$r\npm-ls.txt"
node .\mcp\server.js --version > "$r\server-version.txt"
Get-FileHash .\mcp\server.js, .\sterling-ui-1.2.0.tgz | Format-List > "$r\hashes.txt"
$env:CLAUDE_CONFIG_DIR = "C:\sterling-runs-config"
$env:DISABLE_AUTOUPDATER = "1"
claude --version > "$r\version-start.txt"
Get-Date -Format o > "$r\started.txt"
```

**5. Start the session.** PowerShell A, the run folder:

```powershell
claude --strict-mcp-config --mcp-config .mcp.json --setting-sources project,local --model claude-opus-5-5 --effort medium --permission-mode auto
```

**6. Record the setup.** In the session: `/mcp`, `/status`, `/skills`. Copy each into the run's private folder
(`mcp.txt`, `status.txt`, `skills.txt`). If `/mcp` shows any server other than `sterling`, or any claude.ai
connector: `/exit`, and the run doesn't count. Then PowerShell B, any folder:

```powershell
Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Select-Object ProcessId, CommandLine | Format-List > "C:\sterling-runs-private\run-01\processes.txt"
```

(Change `run-01` to the run's number.) It must show `./mcp/server.js`, and nothing with `sterling-mcp.js`.

### During

**7. Paste the request.** Open `demo\prompt.md` in the repo, copy all of it, and paste it into the session as the
first message. Nothing else.

**8. Fixed replies.** Send nothing unprompted. If the session:

- asks a question: reply `Decide for yourself, and list it as a guess.`
- stops before its final list (an error, a limit): reply `Continue.`
- asks permission for something inside its folder: allow it. Outside its folder, or on the network: deny it.

Write each reply, and when, in `C:\sterling-runs-private\run-NN\replies.txt`.

**9. The end.** When the session has given its four-item list: `/exit`. Then PowerShell A, the run folder:

```powershell
claude --version > "$r\version-end.txt"
Get-Date -Format o > "$r\ended.txt"
```

### After

**10. Move the transcript out of reach.** PowerShell A, `C:\`:

```powershell
Move-Item "C:\sterling-runs-config\projects\C--sterling-runs-run-$n" "$r\transcript"
```

**11. Score.** PowerShell A, the repo's `demo\scoring`:

```powershell
node score.mjs "C:\sterling-runs\run-$n" --out "$r\scores" --name "run-$n"
$t = Get-ChildItem "$r\transcript\*.jsonl" | Select-Object -First 1
node audit-transcript.mjs $t.FullName "C:\sterling-runs\run-$n" --out "$r\audit.md"
```

**12. Move the run out of reach.** PowerShell A, `C:\`:

```powershell
Move-Item "C:\sterling-runs\run-$n" "C:\sterling-runs-done\run-$n"
```

From here on the run's folder is `C:\sterling-runs-done\run-NN`.

**13. Claude Code's review.** A new Claude Code session, started in the repo the usual way (not with the run's
settings). Paste this, with the run's number in place of NN:

```
Review repeat run NN of the Pool loans demo. Follow "Claude Code's review" in docs/demo/runs/procedure.md, with
the run folder C:\sterling-runs-done\run-NN and the private folder C:\sterling-runs-private\run-NN. Change nothing
in the repo or the run folder; write only in the private folder.
```

It writes `manual-claude.md` and `results-reviewed.csv` in the private folder, and ends with a list of anything it
wants you to look at. Keep the session open for step 15.

**14. Your checks.** Below, under "Your checks". Write the results in `$r\manual-michael.md`.

**15. Owners for your checks.** In the review session from step 13, send:

```
My checks are in manual-michael.md. Add them to results-reviewed.csv, with the actual owner and reason for each fail.
```

**16. The public record.** PowerShell A, the repo (`<banned-terms file>` is the list kept outside the repo):

```powershell
New-Item -ItemType Directory "docs\demo\runs\run-$n" | Out-Null
Copy-Item "$r\results-reviewed.csv", "$r\scores\*.png" "docs\demo\runs\run-$n\"
Copy-Item "C:\sterling-runs-done\run-$n\src" "docs\demo\runs\run-$n\src" -Recurse
npm --prefix ui run demo:extract -- $t.FullName --banned <banned-terms file> --out "docs\demo\runs\run-$n\session.json" --answers "As the kit's MCP server (Sterling 1.2.0) answered"
```

Copy the session's final four-item list into `docs\demo\runs\run-$n\report.md`. Before committing anything, grep
for the banned terms and for local paths, as for any commit.

---

## Your checks

Three checks, about 20 minutes. PowerShell B, the run's folder (`C:\sterling-runs-done\run-NN`):

```powershell
npx vite preview --port 4320 --strictPort
```

Open `http://localhost:4320/` in Chrome at 1440 × 900, in Light. Reload before each check. In `manual-michael.md`
write one line per check: its ID, `pass`, `fail`, or `not done`, and what you saw.

**SCREEN-keyboard.** Keep your hand off the mouse. Click the address bar, then use Tab, Shift+Tab, Enter, Space,
the arrow keys, and Escape only:

1. Change the Lender filter to another lender, and Apply.
2. Remove a filter chip.
3. Sort by Loan ID.
4. Select one row, then Shift-select a range of rows.
5. Select LN-204389 (reload first), Sign off, type a note, confirm.
6. Open Sign off again on any exception and close it with Escape.

Pass when every step works, focus is always visible, and focus is never lost (after a dialog closes it returns to
where you were).

**SCREEN-design.** Open `design\pool-loans.png` in the run's folder beside the browser. Pass when the layout matches
(filters on the left, the grid in the middle, the summary on the right) and the same content is there. List each
difference you see, even when it passes.

**SCREEN-reader** (optional; write `not done` if you skip it). Start NVDA, then in Chrome:

1. Tab to LN-204389's row checkbox, and move to its LTV cell with NVDA+Ctrl+Alt+Right arrow.
2. Select the row (Space), and listen.
3. Tab to Sign off and press Enter.

Pass when the LTV cell is read with its reason, the selection count is announced, and the dialog's title and note
field are read.

---

## Claude Code's review

For the review session in step 13. Read first: `docs/demo/runs/checklist.md` (the checks, the owner rule),
`docs/demo/runs/methods.md`, and from the private folder: `scores/results.csv`, `scores/*.png`, `audit.md`,
`transcript/*.jsonl` (the run's transcript, including every MCP answer it got), and `mcp.txt`, `processes.txt`,
`replies.txt`. The run's code is in the run folder's `src/`.

To see the screen, serve it (PowerShell, the run folder): `npx vite preview --port 4321 --strictPort`, and use the
session's browser, or Playwright from `demo/scoring/node_modules` in a script kept in the private folder. Don't
edit the run's files.

**The checks.** One line each in `manual-claude.md`: the ID, `pass`, `fail`, or `note`, and the evidence.

| ID | Steps | Pass when |
|---|---|---|
| STATE-loading | Find in `src/` and the run's report how loading is shown (a delay, a control, a prop), and trigger it. If nothing triggers it: fail, "no way to see it" | Skeleton rows under the real header, text such as "Loading", and `aria-busy="true"` on the grid while it lasts |
| STATE-error | The same, for a failed load | The failure is said, a Retry button is there, the header and filters stay, and Retry recovers |
| DATA-fictional | Read the screen and `src/` | No real company, person, or brand: only names from the data file, or obviously made up |
| SCREEN-numeric | The UPB, FICO, and LTV columns: computed `text-align` and `font-variant-numeric`, and whether any value overflows its cell | Right-aligned, tabular figures, no number cut off |
| SCREEN-flag | LN-204389's LTV cell, in color and in a grayscale screenshot | A border and an icon, and the cell still stands out in grayscale |
| SCREEN-status | The Status column | Each status is a chip with a tone and an icon: Ready, Exception, Signed off |
| SCREEN-summary | The summary panel | Balance against the target, loans by status, the issues; a compact value (such as $42.6M) has its full value somewhere (a tooltip, a label, or a detail) |
| SCREEN-undo | Remove one loan | Note whether it can be undone, and how |
| SCREEN-density, SCREEN-theme | The scorer's screenshots (`light-default-*`, `dark-default-*`) | Nothing broken in Dark or at another density (the scorer measured the row heights; this is the look) |
| HONEST-report | The session's last message | The four items: components, MCP tools, gaps, guesses |
| HONEST-gaps | Each gap it reported, against what Sterling has (the MCP answers in the transcript, `ai/components.json`) | Each gap is real. Note any that Sterling does have |
| HONEST-guesses | Its guesses | Listed. Note any guess the request or the data answers |
| SESSION-mcp | `mcp.txt`, `processes.txt`, and the audit's "MCP calls, by server" | Only `sterling`, from `./mcp/server.js` |
| SESSION-files | The audit's "File tools outside the run folder", "Shell commands to review", and "Reads of the package's built files" | Nothing outside the folder other than the session's own files. Note the package reads |
| SESSION-network | The audit's shell commands and "Web tools" | No network call, other than to its own local server |

Every check the scorer recorded as `could not run`, other than SCREEN-keyboard, SCREEN-design, and SCREEN-reader, is
done here too: follow its row in the checklist, and say how.

**Owners.** For every fail (the scorer's and your own), apply the owner rule in checklist.md: the actual owner and
a one-line reason, from the transcript and the MCP answers it got.

**`results-reviewed.csv`.** Every row of `scores/results.csv`, with the manual results filled in, `could not run`
rows resolved where you could, and the `actual owner` and `owner reason` columns filled for every fail.

**End with a summary**, in your last message and at the top of `manual-claude.md`:

1. The headline results.
2. Each fail, with its actual owner.
3. What Michael should look at: anything you couldn't judge, anything that looked wrong but didn't fail a check,
   and anything to watch for in his three checks.

---

## After the series

**17. Put your server back.** PowerShell, any folder:

```powershell
claude mcp add --scope user sterling -- node C:/Users/<you>/tools/sterling-mcp.js
claude mcp list
```

(Use the path saved in `C:\sterling-runs-private\mcp-user-before.txt`.)

**18.** Commit `demo\scoring\` and the public record on the series branch, and open a pull request.

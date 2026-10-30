# Run steps

The one current set of steps for a run. Follow only this sheet. When a deviation or a script changes a step, the
planning session updates this sheet in the same change and tells you what changed.

**Replace NN with the run's number (03, 04, 05) everywhere.** Nothing else changes between runs.

| Name | What it is |
|---|---|
| **The session window** | A plain PowerShell window (not the desktop app). You start the run's Claude Code session in it, and later run the after-run scripts in it |
| **The other window** | A second plain PowerShell window, for the checks beside the session |
| **The session** | The run's Claude Code session, inside the session window |
| **The planning session** | Your Claude Code conversation about the series (the one that keeps this sheet) |
| **The private folder** | `C:\sterling-runs-private\run-NN` |

Every script below sets its own folder, so each command can be typed in any folder.

---

## Before the run

**B1. Stop Figma and its helper.** The other window:

```powershell
Stop-Process -Name Figma, figma_agent -Force -ErrorAction SilentlyContinue
```

- **Why both:** the Figma app keeps a server on port 3845, and its font helper, `figma_agent`, listens on its own
  ports (44950 and 44960 in run 03) even with the app closed. Stopping Figma doesn't stop the helper.
- **You should see:** nothing (no output means both are stopped, or weren't running).
- **To stop them coming back for the series:** Task Manager > Startup apps: disable Figma and Figma Agent. Turn them
  back on after the series.

**B2. Check nothing is left over.** The other window:

```powershell
Get-NetTCPConnection -LocalPort 4320 -State Listen -ErrorAction SilentlyContinue
Get-ChildItem C:\sterling-runs-config\projects
Test-Path C:\sterling-runs\run-NN
```

- **You should see:** nothing from the first two lines, and `False` from the third.
- **If the first line shows something:** a finished run's preview is still running. Do step 9, then B2 again.
- **If the second line shows a folder:** a transcript wasn't moved out. Don't go on; tell the planning session.
- **If the third says `True`:** the run's folder already exists. Tell the planning session.

---

## The run

**1. Start the session.** The session window:

```powershell
powershell -ExecutionPolicy Bypass -File C:\sterling-runs-private\scripts\5-start.ps1 -n NN
```

- **You should see:** the `npm ci` output, then a green line "Step 4 done: …", then "Starting the session in
  C:\sterling-runs\run-NN" and Claude Code's welcome box showing v2.1.308, Opus 5.5 with medium effort, and
  `C:\sterling-runs\run-NN`.
- **If Claude Code asks at start-up whether to keep browser tools off:** keep them off.
- **If it asks any other start-up question about tools or settings:** don't answer. Tell the planning session what it
  asks.
- **If you see a red "STOPPED: …" line:** it says why (a missing folder, a failed `npm ci`, a version or hash that
  isn't the series'). Don't work around it: tell the planning session the line.

(The script copies the kit, records its versions and hashes, and starts Claude Code with exactly these settings:
`--strict-mcp-config --mcp-config .mcp.json --setting-sources "project,local" --model claude-opus-5-5 --effort medium
--permission-mode auto`, with its own configuration folder and automatic updates off.)

**2. Record the setup.** In the session, type each command below, then press Esc to close it. Save each one's text in
the private folder (select it, copy, paste into Notepad, save under the name shown):

| Command | Save as | You should see |
|---|---|---|
| `/mcp` | `mcp.txt` | One server, `sterling`, with 8 tools. Nothing else, and no claude.ai connectors |
| `/status` | `status.txt` | Version 2.1.308, model claude-opus-5-5, and "Setting sources: Shared project settings" and nothing more |
| `/skills` | `skills.txt` | "No skills found" |

**If `/mcp` or `/status` shows anything else:** type `/exit`. The run doesn't count; tell the planning session.

**3. Check processes and ports.** The other window (the session stays open):

```powershell
powershell -ExecutionPolicy Bypass -File C:\sterling-runs-private\scripts\6-check.ps1 -n NN
```

- **You should see:** green "READY: only the run's server, and nothing else listening", then "The request is on the
  clipboard." Lines saying "Note: sterling-mcp.js … belongs to another session" are fine.
- **If you see red "NOT READY":** it lists what to stop.
  - **Figma:** quit it (B1).
  - **A `node` process on port 4320:** stop the preview (step 9).
  - **Anything else:** stop it if you know what it is; otherwise ask the planning session.

  Then add one line to `processes-note.txt` in the private folder (what you stopped, and the time), and run step 3
  again. Don't paste the request until it says READY.

**4. Paste the request.** In the session, press Ctrl+V. Before pressing Enter, check the pasted text begins "Build the
Pool loans screen for our loan pooling tool" and ends "4. Guesses you made." Then press Enter.

- **You should see:** the session starts reading files and calling `sterling` tools.

**5. Watch.** Don't type anything in the session unless one of these happens:

| What you see in the session | What you type or choose |
|---|---|
| It asks you a question and waits | `Decide for yourself, and list it as a guess.` |
| It stops before its final four-item list (an error, a usage limit) | `Continue.` |
| A permission menu for something inside `C:\sterling-runs\run-NN` | Allow |
| A permission menu for anything outside that folder, or on the internet | Deny |

Write each one in `replies.txt` in the private folder: the time, what it asked, what you answered. If nothing happens,
write `none`. Expect 10–15 minutes.

**6. End the session.** When its last message ends with the four-item list (components, MCP tools, gaps, guesses),
type `/exit` in the session.

- **You should see:** the session window back at a PowerShell prompt.

**7. Record, score, move, review.** The session window:

```powershell
powershell -ExecutionPolicy Bypass -File C:\sterling-runs-private\scripts\9-12-after.ps1 -n NN
```

This records the end, stops anything the session left running from its folder (such as its dev server), moves the
transcript and the run out of reach, scores the run, and then reviews it automatically.

- **If you see a yellow "The session left N process(es) running … stopped them":** that's fine. It's recorded in
  `leftover-processes.txt` in the private folder; carry on.
- **If you see a yellow "replies.txt was missing, so it was written from the transcript":** after the review, open
  `replies.txt` in the private folder, check it, and add anything a permission menu asked (those aren't in the
  transcript).
- **If you see red "STOPPED at step 12: … is in use":** close any Explorer window, editor, or terminal open in
  `C:\sterling-runs\run-NN`, then type the two commands it prints (the move, then the review). Don't run step 7 again.
  If the move still fails, tell the planning session.

- **You should see:** "Step 9: …", "Step 10: transcript moved …", the scorer's lines (about 4 minutes), "Step 11: …",
  "Step 12: run moved to C:\sterling-runs-done\run-NN", "Step 13: the automatic review", "Reviewing run NN …". Then
  nothing for 10–40 minutes, then the review's summary and a green "Review done: …".
- **The summary starts with "Needs Michael's decision:"** and a numbered list, or "none". Note your answers for step 10.
- **If it stops with an error before step 12:** don't run it again. Tell the planning session the last lines it printed.
- **If the window shows nothing during the review:** wait until the prompt comes back, then open `review-console.txt`
  and `review-summary.txt` in the private folder. If `manual-claude.md` and `results-reviewed.csv` are there, the
  review ran. Tell the planning session either way.
- **If you see "has no login yet":** in the other window, run these four lines, then `/login` in that session, sign in,
  `/exit`, close that window, and run the review on its own (below):

  ```powershell
  $env:CLAUDE_CONFIG_DIR = "C:\sterling-runs-private\review-config"
  $env:DISABLE_AUTOUPDATER = "1"
  cd <the repository's folder>
  claude
  ```

- **To run the review on its own** (after a login, or if the planning session asks): the session window,
  `powershell -ExecutionPolicy Bypass -File C:\sterling-runs-private\scripts\13-review.ps1 -n NN`
- **If you see red "REVIEW NEEDS A LOOK" or "STOPPED":** give the lines to the planning session.

---

## Your checks

**8. Serve the finished run and open it.** The other window:

```powershell
powershell -ExecutionPolicy Bypass -File C:\sterling-runs-private\scripts\14-preview.ps1 -n NN
```

To compare it with an earlier run side by side, add `-Compare` and that run's number, for example
`... 14-preview.ps1 -n NN -Compare 03`.

- **You should see:** green "Run NN is at http://localhost:4320/" and a new Chrome window at the top left of the main
  screen, 1440 × 900, showing the run. With `-Compare`, also "Run MM is at http://localhost:4322/" and a second window
  on your second monitor (or offset on top of the first if there's only one).
- Each window has its own Chrome profile (in the private folder), so no zoom you set elsewhere carries over. Check
  there's no magnifier icon at the right of the address bar (that icon means the zoom isn't 100%).
- **If the zoom isn't 100%:** press Ctrl+0.
- **If you see "STOPPED: Port 4320 is already in use" (or 4322):** do step 9, then step 8 again.
- **If it opens in Dark:** switch it to Light. In the Chrome window, press F12, then Ctrl+Shift+P, type "Rendering",
  press Enter, and set "Emulate CSS media feature prefers-color-scheme" to light. Close DevTools before the keyboard
  check.
- Your Windows display is at 150%, so the window is 1440 × 900 in screen points; the page lays out at 1440 CSS pixels
  wide, as the scorer and review see it.

Reload before each check. Write your results in `manual-michael.md` in the private folder: one line per check, with
its ID, `pass`, `fail`, or `not done`, and what you saw. The review's summary may list things to watch for.

**SCREEN-keyboard.** Hands off the mouse. Click the address bar, then use only Tab, Shift+Tab, Enter, Space, the arrow
keys, and Escape:

1. Change the Lender filter to another lender, and Apply.
2. Remove a filter chip.
3. Sort by Loan ID.
4. Select one row, then Shift-select a range.
5. Reload. Select LN-204389, Sign off, type a note, confirm.
6. Open Sign off again on an exception and close it with Escape.

Pass when every step works, focus is always visible, and focus is never lost (after a dialog closes it returns to
where you were).

**SCREEN-design.** Open `C:\sterling-runs-done\run-NN\design\pool-loans.png` beside the browser. Pass when the layout
matches (filters left, grid in the middle, summary right) and every task the request asks for can be done. List every
missing or added element (for example Export, "+ Add filter", "Edit criteria", a settings strip): each is a note, not
a fail, recorded for the table across runs.

**SCREEN-reader** (optional: write `not done` if you skip it). Start NVDA, then in Chrome:

1. Tab to LN-204389's row checkbox, and move to its LTV cell with NVDA+Ctrl+Alt+Right arrow.
2. Select the row (Space), and listen.
3. Tab to Sign off and press Enter.

Pass when the LTV cell is read with its reason, the selection count is announced, and the dialog's title and note
field are read.

**9. Stop the preview.** The other window (this also closes the Chrome windows step 8 opened):

```powershell
powershell -ExecutionPolicy Bypass -File C:\sterling-runs-private\scripts\14-stop.ps1 -n NN
```

- **You should see:** green "Stopped: the check windows are closed, and nothing listens on ports 4320 or 4322."
  Always do this: the next run's step 3 refuses to
  start while 4320 is in use.

---

## After your checks

**10. Your checks, with owners.** Tell the planning session:

*"My checks for run NN are in manual-michael.md."*

If the review's summary listed decisions for you, add your answers in the same message, numbered as the review
numbered them.

The planning session then:
- adds your checks to `results-reviewed.csv`, with the owner and reason for each fail;
- checks every owner against the series' rules, and tells you any owner it changed. The rules:
  - a fail is owned by AI's draft only if the review quotes the Sterling guidance that covers it and cites where the
    run read it; otherwise Sterling;
  - a screen that changes the host's color mode or density: Sterling;
  - the summary's "full value" part: a note, owner Sterling, with the panel's width;
  - starting a browser to view the run's own app isn't a SESSION-files fail.

**11. The public record.** The session window:

```powershell
powershell -ExecutionPolicy Bypass -File C:\sterling-runs-private\scripts\16-public.ps1 -n NN -Banned C:\sterling-runs-private\banned-terms.txt
```

It builds the record in the private folder: the reviewed results, the screenshots, the run's code, the session record,
and `report.md` (the session's final message). It scans everything for your banned terms, local paths, and the two
agency names, and copies it into the repo only if the scan is clean.

- **You should see:** green "Written: …\docs\demo\runs\run-NN … Scan clean."
- **If you see red "STOPPED" with matches:** nothing was copied into the repo. Give the lines to the planning session.
- **If it stops because the session record contains a banned term:** only one term in `banned-terms.txt` has a
  substitute (a line `term => substitute`). Choose a substitute, add the line to the file, and run step 11 again.

**12. Commit the record.** Tell the planning session:

*"Run NN is finished; commit its record."*

It scans the record and commits it locally (no push). The run is done.

---

## Stopping and resuming

- **Safe places to stop:** before step 1; after step 7 has finished; after step 9; after step 10; after step 12.
- **Don't stop between step 1 and the end of step 7.** If you must, end the session first (step 6, `/exit`) and run
  step 7. A session left open, or a transcript left in `C:\sterling-runs-config\projects`, is reachable by the next run.
- **Never leave the preview running** when you stop: do step 9.
- **To resume,** tell the planning session: *"I'm resuming run NN at step X."* It checks where things stand and says
  whether anything needs doing first.

## After run 05

Run 05 is the last run. The control runs and the cloud runs are skipped (deviations 30 and 31, 2026-10-28); the
control kit stays in the private folder, unused.

To close the series, tell the planning session: *"Close the series."* It gives you the steps to put your own
`sterling` server back and to turn Figma and Figma Agent back on at startup, and commits the record, with this sheet
and the scripts going into the repo.

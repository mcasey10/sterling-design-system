# Repeat runs: calibration

Before run 1 the scorer (`demo/scoring/`) was run on five versions of the Pool loans screen whose answers were known,
to show that it gets them right. All five were scored by the same, final version of the scorer, the one used for
every run.

| Case | What it is | Built with |
|---|---|---|
| **Oct 14** | The screen as the October 14 session delivered it | Its own folder's sterling-ui 1.1.1 |
| **Corrected** | Examples › Pool loans, after the six corrections | The kit's sterling-ui 1.2.0 |
| **On 6e5aa99** | The corrected screen, on the package from just before the empty-state fix (7e9ca3a) | sterling-ui built at 6e5aa99 |
| **On e180193** | The corrected screen, on the package from just before the row-descriptions fix (a92a520) | sterling-ui built at e180193. Its code doesn't type-check against this package (`descriptions` doesn't exist yet), so it was built with `vite build` alone |
| **Ready 16** | The corrected screen, with the page's "181" changed to "16" in the browser before the number checks (no file changed) | The kit's sterling-ui 1.2.0 |

## Results

`cnr` = could not run.

| Check | Oct 14 | Corrected | On 6e5aa99 | On e180193 | Ready 16 |
|---|---|---|---|---|---|
| RULE-typecheck | pass | pass | pass | cnr | pass |
| RULE-tokens | pass | pass | pass | pass | pass |
| STERLING-internal | **fail** | pass | pass | pass | pass |
| STERLING-table | **fail** | pass | pass | pass | pass |
| RULE-deps | pass | pass | pass | pass | pass |
| NUM-186 | pass | pass | pass | pass | pass |
| NUM-62 | pass | pass | pass | pass | pass |
| NUM-181 | pass | pass | pass | pass | **fail** |
| NUM-2 | pass | pass | pass | pass | pass |
| NUM-3 | pass | pass | pass | pass | pass |
| NUM-32 | pass | pass | pass | pass | pass |
| NUM-issues | pass | pass | pass | pass | pass |
| NUM-upb | pass | pass | pass | pass | pass |
| NUM-58 | pass | pass | pass | pass | pass |
| NUM-12 | pass | pass | pass | pass | pass |
| SCREEN-header | pass | pass | pass | pass | pass |
| STATE-disabled (Submit pool) | pass | pass | pass | pass | pass |
| SCREEN-tabs | pass | pass | pass | pass | pass |
| SCREEN-view | pass | pass | pass | pass | pass |
| SCREEN-columns | pass | pass | pass | pass | pass |
| SCREEN-pagination | **fail** | pass | pass | pass | pass |
| FIX-a mechanism | **fail** | pass | pass | **fail** | pass |
| FIX-a outcome | pass | pass | pass | **fail** | pass |
| **FIX-a** | **fail** | pass | pass | **fail** | pass |
| FIX-b mechanism | **fail** | pass | pass | pass | pass |
| FIX-b outcome | **fail** | pass | pass | pass | pass |
| **FIX-b** | **fail** | pass | pass | pass | pass |
| FIX-c mechanism | **fail** | pass | pass | pass | pass |
| FIX-c outcome | **fail** | pass | **fail** | **fail** | pass |
| **FIX-c** | **fail** | pass | **fail** | **fail** | pass |
| STATE-empty | pass | pass | pass | pass | pass |
| EDGE-samplegap | note | note | note | note | note |
| EDGE-any | pass | pass | pass | pass | pass |
| SCREEN-chips | pass | pass | pass | pass | pass |
| SCREEN-sort | pass | pass | pass | pass | pass |
| STATE-disabled (Sign off) | pass | pass | pass | pass | pass |
| STATE-selected | pass | pass | pass | pass | pass |
| STATE-bulkbar | pass | pass | pass | pass | pass |
| SCREEN-remove | pass | pass | pass | pass | pass |
| STATE-signoff | pass | pass | pass | pass | pass |
| EDGE-longnames | pass | pass | pass | pass | pass |
| RULE-axe-light | pass | pass | pass | pass | pass |
| RULE-axe-dark | pass | pass | pass | pass | pass |
| SCREEN-theme | pass | pass | pass | pass | pass |
| SCREEN-density | pass | pass | pass | pass | pass |
| DATA-invented | pass | **fail** | **fail** | **fail** | **fail** |

No page threw an error in any case.

## Every result against its prediction

All as predicted.

- **Oct 14 fails the three fix checks.**
  - FIX-a: its code renders its own table, not `DataGrid`. Its outcome passes, because it put the reason in the
    cell's label itself.
  - FIX-b: Reset emptied every filter, so no chips and no 58.
  - FIX-c: its empty message isn't `DataGrid`'s, and at 390px it is outside the visible area.
- **Oct 14 also fails STERLING-internal and STERLING-table** (Sterling checks, not asked). Its table reuses
  Sterling's internal class names, which is what correction a replaced.
- **SCREEN-pagination, Oct 14: a finding about the screen, not the scorer.** On page 2 of the Harbor Point view
  none of the loans are in the sample, and the screen hides its pagination, so there is no way back to page 1. The
  case study didn't record this; the scorer measured it correctly.
- **The corrected screen passes everything but DATA-invented.** Correction e generated the rest of the pool (marked
  in its code as added after delivery), so it shows loan IDs that aren't in the kit's data file.
- **On 6e5aa99: FIX-c's mechanism passes and its outcome fails.** The same code passes `empty` to `DataGrid`, but
  that package's empty state is centered across the whole table, and at 390px the message is outside the visible
  area. This shows the outcome measurement detects the bug the fix removed.
- **On e180193: FIX-a's mechanism and outcome both fail.** The package ignores `descriptions`, so the cell's
  accessible name is only "Warning 93.0%". The same code on the next package passes both parts, so the outcome
  measurement turns from fail to pass on the fix alone. FIX-c's outcome fails too: this package also predates the
  empty-state fix.
- **Ready 16: NUM-181 fails** ("16 beside Ready"), and every other number still passes. The scorer reads the number
  beside its word in its region, not anywhere on the page.

## Wording

The October 14 and corrected screens word several things differently: the header checkbox ("Select all loans on
this page" and "Select all rows"), the flagged cell's name ("93.0%, breaks a rule: …" and "Warning 93.0% ,
breaks a rule: …"), the signed-off loan's reason, and the summary's separators. Every check where they differ is
explained above by behavior. None differs because of wording.

## What calibration changed in the scorer

Each change was made before the final scoring of all five cases.

1. **Settling.** Both screens simulate a slow server, so the scorer read some pages mid-load. A page now counts as
   settled when nothing is busy and its text hasn't changed for 0.8 s.
2. **The bulk bar's count.** The bar was taken as the smallest container holding Sign off and Remove, which left out
   the count. It is now the smallest container that also holds a number outside any button.
3. **Clear all.** The corrected screen shows Clear all only with two or more chips, as many screens might. FIX-b now
   tries Clear all from the view plus a Status filter.
4. **The mechanism parts.** The October 14 table reuses Sterling's class names, so in the page it looked like
   `DataGrid`. The mechanism of FIX-a and FIX-c now also requires the run's own code to render `<DataGrid>` (and pass
   it `empty`, for FIX-c).
5. **Missing controls.** A control that disappears (Previous, on Oct 14's page 2) stalled a check for 30 s. Waits
   are now 5 s, and a check the scorer couldn't finish is recorded as "could not run", never left blank.

6. **Owner columns.** Two empty columns, `actual owner` and `owner reason`, for the review to fill. Output only; all
   five cases were scored again with this version, the one frozen for the series, with the results above.

## The other tools

- **The token check** (`check-css.mjs`): both screens pass, as on October 14. A planted file with five raw values (a
  hex color, a px length, a plain z-index, a token that doesn't exist, a px value in an inline style) fails with
  all five named.
- **The transcript audit** (`audit-transcript.mjs`), on the October 14 transcript:
  - **The session:** Claude Code 2.1.299, Opus 5.5, effort medium (found in the transcript's `effort` field), auto
    mode, started from the CLI.
  - **MCP:** 40 calls, all to `sterling`.
  - **Outside the folder:** nothing; no network calls.
  - **Listed on their own:** its reads of the package's built files (3 file reads, 6 shell commands); its own
    temporary files and saved tool output (5); one call to its own dev server on localhost.

  A made-up transcript with an outside read, a `../` path, a web request, an `npm install`, a home-folder listing,
  a web tool, and two refusals is caught in full.

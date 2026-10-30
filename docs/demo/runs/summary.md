# Repeat runs: the five main runs

*The series' technical record. The planned control runs and cloud runs were skipped (deviations 30 and 31).*

Five fresh Claude Code sessions (Opus 5.5, medium effort, auto mode, Claude Code 2.1.308) each built the Pool loans
screen from the same request, kit, and Sterling 1.2.0 (package and MCP server), on one computer, between October 23
and October 24, 2026. Each was scored by the frozen scorer, reviewed by a separate Claude Code session (interactively
for run 1; automatically from run 2), and checked by Michael by hand. [methods.md](methods.md) says how;
[checklist.md](checklist.md) what was scored; [deviations.md](deviations.md) every change and ruling since the freeze.

## What kind of test this is

**A best case.** The screen is the one Sterling's components were scoped for: the loan-pooling example in Sterling's
own Figma file, from which the grid, the bulk action bar, the filter chips, and the summary metric were designed. The
design picture the runs were given is a picture of that example. So the runs show how well an AI tool builds the screen
a design system was made around, from its package and MCP server; they don't show how it does on a screen the system
wasn't built for.

**How the request was made.** `demo/prompt.md` was drafted by a Claude Code session on October 13 from the CLAUDE.md
summary of the example and parts of `loanData.ts`, not from the example's full spec (the About frame and its screen
steps). Michael asked for a product request, and reviewed and approved it with two additions, without comparing it
against the example. The parts it left out were never discussed. Three changes came from the drafting, not from a
decision: the example's "reversible" became "this can be undone"; the Remove confirmation rule shifted in the rewording;
and "for layout and content", describing the design picture, was the session's own wording.

**A finding about AI-drafted requirements.** A request an AI tool drafts from a summary, and a person approves without
checking it against the source, carries the summary's gaps and the rewording's shifts into everything built from it.
It's the same lesson as Reset one step earlier: Sterling's pattern said "Reset clears it" because guidance was written
from memory, not checked against the screen; the October 14 session followed it literally (the case study's correction
d). Here the request was written from a summary and followed literally, and each run then made its own choices where
the request and the design picture disagree (below).

## The fix checks

The three corrections made in Sterling after October 14, each scored as mechanism (Sterling's way is used) and outcome
(what a person gets).

| | Run 1 | Run 2 | Run 3 | Run 4 | Run 5 |
|---|---|---|---|---|---|
| FIX-a, DataGrid row descriptions | pass | pass | pass | pass | pass |
| FIX-b, Reset returns to the view | pass | pass | pass | pass | pass |
| FIX-c, the empty state stays in view | pass | pass | pass | pass | could not run at 390 px |

- **FIX-a and FIX-b passed in all 5 runs**, both parts each.
- **FIX-c passed in 4 of 5 runs; run 5 couldn't be measured at 390 px because its own layout gave the grid no width.**
  At 768 px its DataGrid empty state stayed in view (pass), and its mechanism passed. Runs 1–4 left the grid 216–357 px
  at 390 px; run 5's left it 1 px (deviation 27; evidence: side-by-side screenshots of runs 4 and 5 at 390 and 768 px,
  in run 5's private folder).

**Run 5's main visible defect:** at narrow widths its three-column layout (filters, grid, summary) doesn't stack the way
runs 1–4 did, so the grid gets no width and nothing in it can be seen at 390 px. A note owned by Sterling: Sterling has
no narrow-width layout guidance (backlog: "A narrow-width layout rule").

October 14, for comparison, would fail all three (the calibration in [calibration.md](calibration.md)).

**What differs from October 14, and what explains the fix checks.** The runs differ from the October 14 session in
two ways: Sterling's fixes, and the runs opening a browser to check their own screens (all five did; deviation 18).
The second doesn't explain the fix-check results, because each check passes only through Sterling's own mechanism,
which the pre-fix version (1.1.1) lacks, contradicts in its guidance, or breaks:
- **FIX-a** needs DataGrid's `descriptions`, which 1.1.1 doesn't have: on a package without it, the same code fails
  both parts (calibration, on e180193).
- **FIX-b** needs Reset to return to the view, which 1.1.1's guidance contradicts: its pattern said "Reset clears it",
  and the October 14 session followed it.
- **FIX-c** needs DataGrid's empty state to stay in view, which 1.1.1's breaks: it's centered across the whole table,
  so at 390 px the message is outside the visible area (calibration, on 6e5aa99: mechanism pass, outcome fail).

Seeing the screen can't add a mechanism the package lacks or change what its guidance says. So control runs on 1.1.1,
planned to separate the two differences (deviation 20), would have had their fix-check results decided in advance,
and were skipped (deviation 30). The control kit and its scripts are kept in the series' private folder.

## Every fail, with its owner

| Run | Fail | Owner | Why |
|---|---|---|---|
| 1 | RULE-tokens | Sterling | One raw value: `z-index: 10` on its own popup menu, built because Select can't group options; Sterling has no z-index token |
| 1 | STERLING-internal | Sterling | Uses Sterling's component classes; nothing it was given says they're private |
| 1 | SCREEN-theme | Sterling | Its demo settings remove the host's `data-theme` on load (deviation 16) |
| 1 | SCREEN-density | Sterling | Removes the host's density class from `<body>` (deviation 16) |
| 2 | STERLING-internal | Sterling | `stl-field`, `stl-menu`, `stl-icon`, `stl-filter-chip`, mostly to widen fields |
| 2 | SCREEN-theme | Sterling | Its display settings remove the host's `data-theme` |
| 3 | STERLING-internal | Sterling | `.stl-field`, `.stl-data-grid`, mostly to widen fields |
| 3 | SCREEN-theme | Sterling | Its preview settings remove the host's `data-theme` about 75 ms after load |
| 4 | STERLING-internal | Sterling | `.stl-link`, to keep status links from wrapping |
| 4 | SCREEN-theme | Sterling | Its demo settings remove the host's `data-theme` |
| 4 | SCREEN-density | Sterling | Removes the host's density class from `<html>` (deviation 24) |
| 5 | STERLING-internal | Sterling | 7 component classes: full-width fields, the notice icon, the dialog, the demo controls |
| 5 | SCREEN-theme | Sterling | Its demo controls remove the host's `data-theme` on mount |
| 5 | SESSION-files | AI's draft | Wrote its dev server's log to the user's temp folder, outside the run folder (deviation 25) |

**Of 14 fails, 13 are Sterling's.** The one owned by the AI's draft is a session rule (working only in its folder),
not Sterling guidance. Under deviation 16's rule, no fail was owned by the AI's draft, because none had Sterling
guidance that clearly covered it and that the run had read.

## Patterns across the runs

- **Every run reset the host's color mode.** All five added their own settings strip or panel (demo, display,
  preview, or demo controls) that starts at "follow the system" and removes the host's `data-theme`. Two also removed
  the host's density (runs 1 and 4). The October 14 session did the same; correction (c) turned it into Storybook
  controls. Sterling's guidance says how a host sets these, never that a screen mustn't change them.
- **Every run used Sterling's internal component classes**, mostly to make fields full width, which the Form layout
  pattern asks for and TextInput and Select can't do.
- **Four runs left out Export** (which the request doesn't mention: see "In the design, not in the request"); run 2
  built it. Three left out "+ Add filter" (runs 3–5); two left out "Edit criteria" (runs 3, 5), and the other three
  made it a placeholder.
  All five added a settings strip that isn't in the design. Each is a note, not a fail (deviation 23).
- **The design's lender name** "Harbor Point": runs 2 and 3 used it where the design does; runs 1, 4, and 5 used
  "Harbor Point Lending" in some or all of those places.
- **Focus after Sign off**: runs 2–4 moved it to the status message, because Sign off is disabled once no exception
  is selected; run 5 moved it to the notice's Undo. A note owned by Sterling (deviation 23).
- **Focus after Undo**: runs 1–3 and 5 moved it to the notice; run 4 lost it to the page body. A note owned by
  Sterling (deviation 24).
- **Every run looked at its own screen** in a headless browser (Chrome, or Edge in run 4), started from the shell.
  The October 14 session never did (deviation 18). It doesn't explain the fix checks (see "The fix checks").
- **Build time**: 10 min 6 s to 13 min 32 s from the request to the final list (runs 1–5: 10:53, 11:04, 10:06, 13:32,
  10:30). October 14: 9 min 39 s.
- **MCP calls**: 33 to 46 distinct calls to Sterling's server (43, 46, 33, 40, 36). Every run called `get_pattern` 8
  or 9 times, reading nearly all nine patterns, and `get_component` 9 to 19 times.
- **Summary panel width** at 1440 px: 229, 224, 220, 226.5, and 220 px (a note owned by Sterling, deviation 17).
- **Sample data**: every run showed only the sample's first page for a view and said so on later pages; counts came
  from the totals. No run invented loans. One wording note: run 5's empty state says "None of the 186 loans in Pool
  2026-07 match", which the 21-loan sample can't support (only the sample was filtered); wording is noted, not scored.

## In the design, not in the request

The example's About frame and the design picture show these; the request doesn't ask for them. What each run built,
checked on the rendered screens. None of them counts as a fail, whether built or not.

| | Run 1 | Run 2 | Run 3 | Run 4 | Run 5 |
|---|---|---|---|---|---|
| Export (in the bulk action bar) | left out | built (a CSV of the selected loans) | left out | left out | left out |
| "+ Add filter" | built | built | left out | left out | left out |
| Edit criteria | placeholder (shows a message) | placeholder (shows a message) | left out | placeholder (shows a message) | left out |
| The View menu and Save view | built (3 views) | built | built | built | built |
| Summary shortcuts (status counts and issue links add a filter) | built | built | built | built | built |

**Fails that sit on these elements.** No fail is for building or leaving one out, but three fails are in the code of
one of them, scored by checks that apply to any code (how it's styled), not to whether it was asked for:
- **Run 1, RULE-tokens** rests entirely on them: its one raw value, `z-index: 10`, is on its own popup list for the View
  menu and the "+ Add filter" menu, built because Select can't group options (which the Saved views pattern asks for).
- **Run 4, STERLING-internal** rests entirely on them: its one internal class, `.stl-link`, keeps the summary
  shortcuts ("181 Ready · 2 Exception · 3 Signed off") on one line.
- **Runs 1 and 2, STERLING-internal** rest partly on them (run 1's summary status links; run 2's "+ Add filter" menu);
  each also uses internal classes elsewhere, so each fails without them.

These three fails stand (Michael's decision). The rule above covers building or leaving out one of these elements,
not how a built element was made. A raw `z-index` and an internal class measure Sterling gaps (no z-index token;
internal classes that aren't declared private), whatever element they're on.

No Sterling-owned note rests on these elements.

**What the runs did where the request was silent.** The request doesn't ask for any of these elements, so each run
had to decide. Where Sterling defines the behavior, the runs built it: all five built the View menu and Save view
(the Saved views and Filter panel and chips patterns), and all five built the summary shortcuts (Link's guidance:
"applying a shortcut such as a filter … from within text or a summary panel"). Where Sterling defines nothing, they
mostly held back: no pattern says what Export does (the Bulk action bar pattern only names it as an example action),
and four runs left it out and said so in their reports. Run 2 built it, as a CSV download of the selected loans,
said so in its report, and its notice says when the export holds only the sample's first page. This is evidence that
Sterling's patterns let an AI fill gaps in a request sensibly: it built what the patterns describe, and mostly didn't
invent behavior where none is described. Run 2 is the exception, and it disclosed what it invented.

## Where the example and the request disagree

| | The example (About frame, screen steps) | The request (`demo/prompt.md`) | What the runs did |
|---|---|---|---|
| Removing loans | Reversible: loans return to Available. No Undo | "This can be undone" | All five built an Undo |
| Remove confirmation | Only when all matching loans are selected | "Only when the selection goes beyond the loans on screen" | All five confirmed for all 58 matching, none for the page |
| Export, "+ Add filter", Edit criteria, View menu and Save view, summary shortcuts | Shown | Not mentioned (the saved view is; its menu isn't) | See the table above |
| Loading, error, and empty states; Dark; three densities | Not drawn (the example pins Light and Default density; its only extra state is a read-only submitted pool) | Asked for | All five built them (all pass loading, error, and empty), and each added its own settings strip to show them, which is also what reset the host's color mode |
| The design picture | The example itself | "For layout and content" | Followed it for layout, and for content where the request was silent |

**Focus after Undo** (deviation 24) comes from a feature that entered through the request's rewording: the example has
no Undo. It's still a Sterling gap: Sterling has no guidance on where focus goes after a short-lived action.

## Rulings and deviations that affected scoring

- **Deviation 6**: a reviewer may override a scorer result only when the scorer read the wrong region (NUM-upb in
  runs 1 and 5: the scorer read the filter panel's `<aside>`).
- **Deviation 7**: theme and density are set before the app loads (the scorer sets them after, so it can't see a
  screen that overrides them).
- **Deviation 8**: STATE-error's "Retry recovers" means Retry runs the load again without a page reload.
- **Deviation 16**: a fail is owned by the AI's draft only if the review quotes Sterling guidance that clearly covers
  it and cites where the run read it; otherwise Sterling. A screen that changes the host's color mode or density is a
  Sterling fail.
- **Deviations 17 and 29**: a summary that shows no full value is a note owned by Sterling (Sterling's rule and its own
  example disagree; runs 2–4); one that shows the exact full value passes (runs 1 and 5: "$42,600,000", the kit's
  `upb` of 42600000).
- **Deviation 18**: starting a browser to view the run's own app isn't a SESSION-files fail.
- **Deviation 23**: SCREEN-design passes when the layout matches and every requested task can be done; missing or
  added elements are notes. Focus after a disabled Sign off is a note owned by Sterling.
- **Deviation 24**: density is checked with the host's class on `<html>` and on `<body>`; focus after Undo is a note.
- **Deviation 25**: writing outside the run folder through a temp folder fails SESSION-files, owner AI's draft.
- **Deviation 27**: if the grid's visible width at a test width is too small to show any message, FIX-c's outcome at
  that width is "could not run" (run 5 at 390 px; no change for runs 1–4).
- **Deviations 30 and 31**: the control runs and the cloud runs are skipped (see "The fix checks"; the cloud runs
  would test Claude Code's cloud environment, not Sterling).

## Sterling's findings, and the backlog

| Finding | Runs | Backlog item (docs/reference.md) |
|---|---|---|
| No guidance that the host owns color mode and density | all 5 | "Say who sets color mode and density" (one sentence for the server's instructions and the README) |
| Nothing says component class names are private; TextInput and Select have no width or full-width option | all 5 | "Say that component class names are private" |
| No z-index or layer token | 1 | "A z-index token" |
| Select can't group options or show descriptions (the Saved views pattern asks for both) | 1–5 (reported) | "Components a session building a real screen missed": grouped options in Select |
| No toast or inline message | 1–5 (reported) | the same item: a toast or inline message |
| Where focus goes after a short-lived action (Undo, a disabled trigger) | 2–5 | the same item: "With the toast: where focus goes after a short-lived action" |
| No card or panel, no screen-reader-only class, no layout tokens | 1–5 (reported) | the same item |
| No narrow-width layout guidance (run 5's grid had no width at 390 px) | 5 | "A narrow-width layout rule"; layout tokens are in "Components a session … missed" |
| No tooltip (the exception-cell pattern mentions one) | 1–5 (reported) | "Tooltip component" |
| The summary metric's rule and Sterling's own example disagree | all 5 | "The summary metric's numbers" |
| DataGrid's loading label truncates at 1440 px | 1, 5 | "DataGrid's loading label truncates" |
| `numericColumnWidth` ignores the header label (FICO cut off in Comfortable) | 1, 4 (reported) | "`numericColumnWidth` ignores the header label" |

Not Sterling's, but on the same list: correct the three public passages that say the October 14 session had no
browser available (it didn't try one from the shell).

## After the series

- **Align the request with the example** (`demo/prompt.md` against the About frame and its screen steps), in one
  direction or the other, and check them against each other.
- **A second consumer test, outside Sterling's library**: a screen Sterling wasn't built around (for example an MBS or
  dealers screen), with a mockup and a request written together and checked against each other before any run.
- The other items are in the backlog in `docs/reference.md`, under "From the repeat runs".

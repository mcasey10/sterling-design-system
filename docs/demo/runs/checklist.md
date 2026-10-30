# Repeat runs: the checklist

Fixed before run 1 and not changed during the series. Every run is scored against it, by the scorer
(`demo/scoring/`) where it can and by the steps in [procedure.md](procedure.md) where it can't.
[methods.md](methods.md) explains how the runs are set up.

## How each check is scored

- **Result:** `pass`, `fail`, `note` (recorded, not scored), or `could not run` (the scorer couldn't decide;
  the check goes to manual and is scored there).
- **Source:** where the requirement comes from. `request` quotes [demo/prompt.md](../../../demo/prompt.md);
  `kit` is the kit's `CLAUDE.md`; a pattern or guideline is named as the MCP server serves it; `design` is
  the designer's picture; `not asked` means no source asks for it.
- **Not asked:** the check is still scored, as a check of Sterling, and marked "not asked".
- **Owner** (whose problem a failure is): `Sterling`, `request`, `kit data`, or `AI's draft`. The column below is
  the default. For every fail, the review records the **actual owner** and a one-line **reason**, from the
  transcript and the MCP answers the run got. It asks two questions:
  - **Did Sterling's guidance cover it clearly?** If not, the owner is `Sterling`. That includes guidance that is
    missing, wrong, or ambiguous, and a component that can't do what's needed.
  - **Did the run read that guidance?** If the guidance was clear and the run read it, or could have and didn't,
    the owner is `AI's draft`.

  The owner is `request` when the request is silent or contradicts itself, and `kit data` when the data can't
  support a correct screen. The reason names the guidance, and whether and where the run read it (for example,
  "Filter panel and chips step 1 says Reset returns to the view; get_pattern returned it at the session's fourth
  call").
- **Results columns:** `run, check, part, result, headline, source, owner, actual owner, owner reason, how,
  evidence`. The scorer leaves `actual owner` and `owner reason` empty; the review fills them for every fail
  (`results-reviewed.csv`).
- **Who does the checks marked `manual`:** Michael does SCREEN-keyboard, SCREEN-design, and SCREEN-reader by hand
  (optional; `not done` if skipped). A separate Claude Code review session, following written steps, does every other
  `manual` check and the audit checks, after the run's folder and transcript are out of the run's reach. See [procedure.md](procedure.md).
- **How:** `auto` (the scorer, in a browser), `static` (the scorer, reading the run's files), `manual` (not the
  scorer: Michael by hand, or the review session, as above), or `audit` (reading the transcript).
- **★** marks the headline set, reported first in the summary.

### Matching rules for the scorer

- Elements are found by role and accessible name, never by the run's CSS classes. The scorer may read
  Sterling's own classes to see whether Sterling's mechanism is in use (the fix checks); a run may not use them.
- Content, never wording: numbers, loan IDs, and names from the data file ("Harbor Point"). Never a sentence or
  label the run wrote. A button is pressed only when its name contains a verb fixed by the request or a pattern:
  Reset, Clear all, Sign off, Remove, Submit pool, Apply, Next.
- Each number is tied to its place: the scorer finds the region first, then looks for the number in it. Found
  with a different number: `fail`. Found only outside its region, or the region not found: `could not run`.
- Whatever the scorer can't decide is `could not run`, never `pass` or `fail`.

## The three fix checks ★

Each has two parts, both measured and reported even when the first fails. The check passes only if both pass.

| ID | Part | Pass when | Source | Owner | How |
|---|---|---|---|---|---|
| FIX-a | mechanism | LN-204389's row is in Sterling's `DataGrid`, and its LTV cell holds `DataGrid`'s description for that cell | `DataGrid` documentation, `rows`: "its `descriptions` give each cell text a screen reader hears after the value"; pattern Warning and exception cells, step 3 | Sterling | auto |
| FIX-a | outcome | That cell's accessible name or description contains both 93 and 90 | Same; request: "announced sensibly by a screen reader" | Sterling | auto |
| FIX-b | mechanism | With the Harbor Point loans view active and a Status filter applied, Reset puts the panel back to the view's filters: Lender is Harbor Point, every other field empty or "Any …" | Patterns Filter panel and chips (1), Filters, grid, and bulk actions (1), Saved views (2); design (the Reset button). Not in the request | Sterling | auto |
| FIX-b | outcome | After Reset: 58 loans, exactly one chip, naming Harbor Point. After Clear all: no chips, 186 loans | Same | Sterling | auto |
| FIX-c | mechanism | The empty state is `DataGrid`'s own (passed as `empty`) | Pattern Loading, empty, and error states (2); `DataGrid` documentation, `empty` | Sterling | auto |
| FIX-c | outcome | At 390px and 768px wide, the whole empty-state message is inside the viewport and the grid's visible area | Not asked (no width is named): scored as a check of Sterling | Sterling | auto |

## The request's numbers ★

The data file holds 21 of the pool's 186 loans. These numbers come from its totals, or from the request and
the design, and must be shown as given. Computing them from the 21 loans gives wrong numbers (16 Ready; 45.4%
for Harbor Point).

| ID | Region | Expected | Source | How |
|---|---|---|---|---|
| NUM-186 | The tab list: the Pool loans tab | 186 | request: "Pool loans (186)"; design; `totals.loansInPool` | auto |
| NUM-62 | The tab list: the Add loans tab | 62 | request: "Add loans (62 candidates)"; design; `totals.candidatesToAdd` | auto |
| NUM-181 | Loans by status: beside Ready | 181 | design; `totals.loansByStatus` | auto |
| NUM-2 | Loans by status: beside Exception | 2 | design; request: "two exceptions"; `totals.loansByStatus` | auto |
| NUM-3 | Loans by status: beside Signed off | 3 | design; `totals.loansByStatus` | auto |
| NUM-32 | The issues: beside Harbor Point | 32, with the cap 30 | request: "Harbor Point at 32%"; design; `totals.lendersOverTheCap` | auto |
| NUM-issues | The header (beside Submit pool) and the summary's issues | 3 in each | request: "Right now there are three"; design | auto |
| NUM-upb | The summary: the pool's balance | 42.6 and 50 | design: "$42.6M", "85% of $50.0M target"; `pool.upb`, `pool.targetUpb` | auto |
| NUM-58 | The view control, the grid's count, or the pagination | 58 | request: "it shows the 58 loans from Harbor Point Lending"; design; `savedViews` | auto |
| NUM-12 | The grid | 12 body rows, counted | request: "Twelve to a page"; `pageSize` | auto |

Owner of a failure: AI's draft. Numbers that need no region of their own (85%, Page 1 of 5) are checked by eye
in the manual visual check.

## Data ★

| ID | Pass when | Source | Owner | How |
|---|---|---|---|---|
| DATA-invented | Every loan ID the screen shows, in every state the scorer reaches, is in the data file; no count is shown that the data can't support | request: "Use the totals for counts; don't invent more loans" | AI's draft | auto |
| DATA-fictional | No real company, person, or brand appears in the code or on screen | request: "All of it is fictional"; kit: "Keep the data fictional" | AI's draft | manual |

## States ★

| ID | Pass when | Source | Owner | How |
|---|---|---|---|---|
| STATE-loading | A loading state shows skeleton rows under the real header, with text, and the grid is marked busy | request: "The list loading"; pattern Loading, empty, and error states (1) | AI's draft | manual |
| STATE-empty | A filter that matches nothing shows an empty state that says why and offers a way out | request: "a filter that matches nothing"; same pattern (2) | AI's draft | auto + manual |
| STATE-error | The list failing to load shows what failed and a Retry, keeping the header and filters | request: "the list failing to load"; same pattern (3) | AI's draft | manual |
| STATE-disabled | Submit pool is disabled while there are issues; Sign off is disabled when no exception is selected, with a reason linked to it (`aria-describedby`) | request: "Submit pool is available only when there are no issues", "signing off isn't available, and the screen says why"; pattern Bulk action bar (3); design | AI's draft | auto |
| STATE-selected | One row, a Shift range, the page (header checkbox), and all 58 matching can be selected; selected rows are checked | request: "Select loans, one at a time, a range, the page, or all 58 that match"; pattern Bulk action bar (1, 2) | AI's draft | auto |
| STATE-bulkbar | The bar appears only while rows are selected, gives the count, and changes for all matching selected | request: "Nothing selected; some selected; everything matching selected"; patterns Bulk action bar, Filters, grid, and bulk actions (3) | AI's draft | auto |
| STATE-signoff | Signing off needs a note; it can be cancelled (and Escape closes a dialog, if one is used); afterwards the counts change and Submit pool stays disabled, since Harbor Point is still over the cap | request: "A note is required"; Overlay/Dialog documentation and pattern Confirmation dialog (1) for the dialog's behavior. A dialog isn't required | AI's draft | auto |

## Rules ★

| ID | Pass when | Source | Owner | How |
|---|---|---|---|---|
| RULE-axe-light | No axe violations in Light, in each density, in four states: as opened, rows selected, sign-off open, empty | request: "Light and dark", keyboard and screen reader; guideline Accessibility | AI's draft | auto |
| RULE-axe-dark | The same, in Dark | Same | AI's draft | auto |
| RULE-tokens | No raw colors, lengths, font values, or z-indexes in the run's CSS or inline styles | kit: "Style only with Sterling's tokens"; the server's instructions; guideline Color | AI's draft | static |
| RULE-typecheck | `npm run build` (type-check and build) exits 0 | kit: "`npm run build` … must pass before you finish" | AI's draft | static |

## Edge cases

| ID | Pass when | Source | Owner | How |
|---|---|---|---|---|
| EDGE-zero | Covered by STATE-empty; the wording is noted | request | AI's draft | note |
| EDGE-any | Choosing "Any lender" (or emptying the field) adds no Lender condition and no chip; no rows or totals are invented. The wording is noted, not scored | pattern Filter panel and chips (1) | AI's draft | auto |
| EDGE-clearall | Covered by FIX-b's outcome | patterns | AI's draft | auto |
| EDGE-samplegap | A filter whose loans aren't in the sample (Lender Pinecrest Funding, Status Signed off) shows no invented rows or totals. The wording is noted, not scored | request: "don't invent more loans" | kit data | auto |
| EDGE-longnames | A lender name made long in the page truncates with an ellipsis, and the row keeps its height. Not asked | guideline Data display ("Truncate text, never numbers"); guideline Principles (edge cases) | Sterling | auto |

## The rest of the screen

| ID | Pass when | Source | Owner | How |
|---|---|---|---|---|
| SCREEN-header | The pool's name, Draft, its criteria, the issue count, Save draft, Submit pool | request | AI's draft | auto + manual |
| SCREEN-tabs | Two tabs; Add loans can't be opened | request: "Add loans is a tab you can't open yet" | AI's draft | auto |
| SCREEN-view | Opens on the Harbor Point loans view with its chip; changing a filter marks the view edited; Save view is disabled while the view is unchanged | request; pattern Saved views (2, 3); design | AI's draft | auto + manual |
| SCREEN-chips | Every applied filter is a chip; removing a chip clears its field | request: "each can be removed there"; pattern Filter panel and chips (2) | AI's draft | auto |
| SCREEN-columns | ID, lender, unpaid balance, FICO, LTV, status, and the rule an exception breaks | request | AI's draft | auto |
| SCREEN-sort | Columns sort; the sorted header carries `aria-sort`; at most one sort icon shows at rest | request: "Sortable"; guideline Data display | AI's draft | auto |
| SCREEN-pagination | Under the grid; Previous disabled on page 1; Next goes to page 2 without inventing rows | request; pattern Filters, grid, and bulk actions (5) | AI's draft | auto |
| SCREEN-numeric | Numeric columns right-aligned with tabular figures; numbers never truncated | guideline Data display | AI's draft | manual |
| SCREEN-flag | A value that breaks a rule shows a border and an icon, not color alone | request: "must stand out in the list without relying on color"; pattern Warning and exception cells (1) | AI's draft | manual |
| SCREEN-status | Status chips have a tone and an icon; Ready, Exception, Signed off | pattern Status chips | AI's draft | manual |
| SCREEN-summary | Balance against target, loans by status, issues; compact values with the full value available | request; guideline Data display (compact notation) | AI's draft | manual |
| SCREEN-remove | Removing the page's loans asks nothing; removing all 58 matching asks for confirmation | request: "ask for confirmation only when the selection goes beyond the loans on screen"; pattern Confirmation dialog (2) | AI's draft | auto |
| SCREEN-undo | Some way to undo a removal. Noted: the request says it "can be undone" but doesn't ask for Undo | request; pattern Confirmation dialog | request | note |
| SCREEN-density | Compact, Default, Comfortable all usable, set from outside the app (`stl-density-*` on a parent) | request; the package's documented contract | AI's draft | auto + manual |
| SCREEN-theme | Light and Dark follow `data-theme` on the root element | request; the package's documented contract | AI's draft | auto + manual |
| SCREEN-keyboard | Everything usable with the keyboard alone, with visible focus | request | AI's draft | manual |
| SCREEN-reader | Announced sensibly by a screen reader (spot check) | request | AI's draft | manual |
| SCREEN-design | Layout and content follow the design picture | request: "for layout and content" | AI's draft | manual |

## Sterling, not asked

| ID | Pass when | Source | Owner | How |
|---|---|---|---|---|
| STERLING-internal | The run's code uses no Sterling class names except the documented ones (`stl-text-*`, `stl-density-*`) and token custom properties | not asked; nearest: the server's instructions, "Use only the components … listed" | Sterling | static |
| STERLING-table | The run renders no table of its own (no `<table>` or `role="grid"` in its code) | not asked | Sterling | static |

## Session and report

| ID | Pass when | Source | Owner | How |
|---|---|---|---|---|
| HONEST-report | The run ends with the four-item list | request; kit | AI's draft | manual |
| HONEST-gaps | Each gap reported is real (compared with what Sterling has) | request: "tell me what was missing" | AI's draft | manual |
| HONEST-guesses | Guesses are listed | request | AI's draft | manual |
| RULE-deps | `package.json` dependencies unchanged from the kit | request: "Don't install other UI libraries or add dependencies" | AI's draft | static |
| SESSION-mcp | Only the kit's server answered (the `/mcp` view, the process list) | methods | — | audit |
| SESSION-files | No file tool or shell command read, listed, or wrote outside the run folder. Reads of the package's built files in `node_modules` are listed separately | kit: "Work only in this folder" | AI's draft | audit |
| SESSION-network | No network call, from the shell or a tool | kit: "Don't use the web" | AI's draft | audit |

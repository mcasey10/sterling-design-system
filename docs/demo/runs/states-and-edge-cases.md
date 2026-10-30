# States and edge cases, in plain language

Five follow-up runs each built the Pool loans screen from Sterling 1.2.0. This page explains the eleven states and
edge cases each screen was checked for: what someone using the screen sees, why it matters here, how it was tested,
and how the five runs did. All five runs handled all eleven.

"Scored automatically" means a script, written before the first run and used unchanged on every run, worked the screen
in a browser. "Checked by hand" means a manual check during each run's review: the reviewer set off the state and
looked at the screen.

## Requested states

### Loading

- **What you see:** while the loans load, gray placeholder rows sit under the real column headers, with a short
  "Loading" message, and the list is marked as busy for screen readers.
- **Why it matters:** the headers, filters and summary stay put, so the screen doesn't jump when the loans arrive,
  and nobody mistakes a slow load for an empty pool.
- **How tested:** checked by hand. Each run simulated a slow load; the reviewer set one off and looked.
- **Result:** handled in all five runs. In runs 01 and 05 the loading text sits in the last column and is cut off
  at 1440 px wide; the check still passed.

### Empty (a filter with no results)

- **What you see:** when the filters match no loans, the list says so, says why (the filters), and offers a way out,
  such as clearing the filters.
- **Why it matters:** an empty list with no explanation looks broken. Here it tells the trader the pool isn't empty,
  only this filter is.
- **How tested:** scored automatically, with a filter that matches nothing in the sample: Lender is Pinecrest
  Funding and Status is Signed off.
- **Result:** handled in all five runs.

### Error

- **What you see:** when the list fails to load, it says what failed and offers Retry. The headers, filters and
  chips stay.
- **Why it matters:** the trader keeps their filters and can try again without starting over or reloading the page.
- **How tested:** checked by hand. Each run had its own setting to make the load fail; the reviewer used it, pressed
  Retry, and confirmed it loaded again without a page reload.
- **Result:** handled in all five runs.

### Disabled actions

- **What you see:** Submit pool is unavailable while the pool has issues. Sign off is unavailable when no exception
  loan is selected, and the screen says why ("No Exception loans selected"), linked to the button so a screen reader
  reads it too.
- **Why it matters:** a pool with open issues must not be submitted, and a disabled button with no reason leaves
  people guessing.
- **How tested:** scored automatically.
- **Result:** handled in all five runs.

### Selection

- **What you see:** loans can be selected one at a time, as a range (Shift), the whole page (the header checkbox),
  or all 58 loans that match the view.
- **Why it matters:** the trader works on many loans at once, often more than fit on one page.
- **How tested:** scored automatically, all four ways.
- **Result:** handled in all five runs.

### Bulk action bar

- **What you see:** a bar with the selection count and the actions appears only while loans are selected, and
  changes when every matching loan is selected.
- **Why it matters:** actions stay out of the way until there's something to act on, and the count shows exactly
  what an action will touch.
- **How tested:** scored automatically.
- **Result:** handled in all five runs.

### Sign-off

- **What you see:** signing off an exception asks for a note and won't go ahead without one. It can be cancelled,
  and Escape closes the dialog. Afterwards the counts update (one fewer Exception, one more Signed off), and Submit
  pool stays unavailable, because Harbor Point is still over the lender limit.
- **Why it matters:** a sign-off is a decision someone may have to explain later, and the screen must not suggest the
  pool is ready when it isn't.
- **How tested:** scored automatically.
- **Result:** handled in all five runs.

## Edge cases

### Long lender names

- **What you see:** a long lender name is cut short with an ellipsis, and the row keeps its height.
- **Why it matters:** the grid stays even and easy to scan. Sterling's rule is to shorten text, never numbers. The
  request didn't ask for this; it was checked as a test of Sterling.
- **How tested:** scored automatically. The script replaced a lender name on the screen with a much longer one and
  measured the row.
- **Result:** handled in all five runs.

### "Any lender"

- **What you see:** choosing "Any lender" removes the lender condition: no Lender chip, and all 186 loans.
- **Why it matters:** "Any" means no filter. Showing it as a filter would confuse the chips and the counts.
- **How tested:** scored automatically.
- **Result:** handled in all five runs.

### Clear all

- **What you see:** Clear all removes every filter: no chips, and all 186 loans.
- **Why it matters:** it's the quickest way back to the whole pool, and it pairs with Reset, which returns to the
  saved view's filters instead.
- **How tested:** scored automatically, as part of the Reset fix's check.
- **Result:** handled in all five runs.

### Loans not in the sample

- **What you see:** for a filter whose loans aren't in the sample data, the screen shows no rows and doesn't make up
  loans or totals.
- **Why it matters:** the sample holds 21 of the pool's 186 loans, so the true answer is known only for some filters.
  A screen that invents data is worse than one that shows less.
- **How tested:** checked automatically and recorded as a note, not scored: how a screen words this is a judgment
  call.
- **Result:** handled in all five runs: none invented rows or totals. **Run 05's wording is noted:** its empty state
  said "None of the 186 loans in Pool 2026-07 match", but only the 21 sample loans had been filtered, so the sample
  can't support that claim.

## The full detail

Every check, what passes it, where the requirement comes from, and how it's scored: [checklist.md](checklist.md).
Each run's results are in its folder (`run-01` to `run-05`, `results-reviewed.csv`).

Build the Pool loans screen for our loan pooling tool, in this app, with the Sterling design system.

What the screen is for
A trader is assembling Pool 2026-07, a pool of 30-year fixed-rate loans, toward a $50.0M target. The pool is a
draft. Before it can be submitted, every loan that breaks an eligibility rule must be signed off or removed,
and no lender may hold more than 30% of the pool. This screen is where the trader reviews the loans in the
pool, deals with the exceptions, and submits.

What's on it
- The pool's name, that it is a draft, its criteria, and how many issues block submission. Save draft and
  Submit pool. Submit pool is available only when there are no issues.
- Two tabs: Pool loans (186) and Add loans (62 candidates). Build Pool loans. Add loans is a tab you can't
  open yet.
- Filters for the loans in the pool: lender, status, FICO, LTV. The filters in effect are always visible above
  the list, and each can be removed there. The trader has a saved view, "Harbor Point loans", which is the
  starting state: it shows the 58 loans from Harbor Point Lending.
- The loans: ID, lender, unpaid balance, FICO, LTV, status, and, for an exception, what rule it breaks. Twelve
  to a page. Sortable.
- A summary of the pool beside the list: balance against the target, loans by status, and the issues that
  block submission.

Rules
- A loan is Ready when FICO is 680 or more and LTV is 90% or less. It is an Exception when FICO is 660 to 679 or
  LTV is over 90% up to 95%. An exception that has been signed off, with a note, is Signed off.
- The issues that block submission are each open exception and each lender over the 30% limit. Right now there
  are three: two exceptions, and Harbor Point at 32%.

What the trader can do
- Select loans, one at a time, a range, the page, or all 58 that match.
- Sign off the selected exceptions. A note is required. If no exception is selected, signing off isn't
  available, and the screen says why.
- Remove the selected loans from the pool. This can be undone, so ask for confirmation only when the selection
  goes beyond the loans on screen.

States to handle
- Nothing selected; some selected; everything matching selected.
- The list loading, a filter that matches nothing, and the list failing to load.
- A value that breaks a rule must stand out in the list without relying on color.
- Light and dark, and the compact, default, and comfortable densities.
- Everything usable with the keyboard alone, and announced sensibly by a screen reader.

What you have
- data/pool-2026-07.json: the pool, a sample of its loans (the first page of each view), and the pool's
  totals. Use the totals for counts; don't invent more loans. All of it is fictional.
- design/pool-loans.png: the designer's screen, for layout and content.

Constraints
- Don't install other UI libraries or add dependencies. Where Sterling doesn't cover something, build the
  minimum you need from Sterling's tokens and tell me what was missing.

When you're done, finish with a short list:
1. The Sterling components you used.
2. The MCP tools you found most useful.
3. Gaps in Sterling: anything the screen needed that Sterling didn't have.
4. Guesses you made.

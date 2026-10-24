# Run 02: the session's final message

As the session wrote it, unedited.

The Pool loans screen is built, `npm run build` passes, and I tested it in headless Chrome: light, dark, and all three densities, plus keyboard-only runs through the main flows. Run `npm run dev` to try it.

**What works**
- **Header:** the pool name, a Draft chip, the criteria, and the issue count. Submit pool is disabled while issues remain and is linked to the text saying why.
- **Tabs:** Pool loans shows a live count. Add loans is disabled.
- **Filters:** the filter panel has Lender, Status, FICO and LTV, plus Add filter (UPB, Loan ID). A bad range like "abc" shows an error under the field. Applied filters appear as removable chips. The "Harbor Point loans" view loads first and shows "· edited" when you change it. Save view saves your own view.
- **List:** the grid matches the design. It sorts, selects one row, a Shift range, the page, or all 58 matching, and flags open exceptions with a border, an icon and a reason. A screen reader hears the reason too.
- **Sign off:** a dialog with a required note. When no exception is selected the button is disabled, and the reason shown beside it is read out with it.
- **Remove from pool:** shows an Undo message. It asks first only when the selection reaches beyond the page.
- **Summary panel:** the balance against the target, counts by status, and the blocking issues. These update live: signing off LN-204389 drops the count to 2 issues, and removing 3 loans moves Harbor Point to 30.7%.
- **Loading, empty and error states:** a bar at the bottom of the page switches color mode and density, and can make loading fail so you can see the error state.

Two limits come from the data, which only holds page 1 of each view:
- **Pages 2–5:** they show a "This page isn't in the sample data" message rather than invented loans.
- **Sorting** reorders only the loans in the sample.

---

**1. Sterling components used:** DataGrid (which brings in HeaderCell, BodyCell, Row and SkeletonRow), BulkActionBar, Pagination, EmptyState, Button, Link, Checkbox, StatusChip, FilterChip, Select, TextInput, Menu, Option, Tab and TabList, SummaryMetric, Dialog, Icon, and the `numericColumnWidth` and `densityClass` helpers.

**2. Most useful MCP tools:** `get_pattern` was the most useful, especially Bulk action bar, Saved views, Warning and exception cells, and Confirmation dialog. Next were `get_component`, `get_guideline` (Data display, Accessibility) and `get_tokens`.

**3. Gaps in Sterling** (what I built from tokens is in brackets):
- No toast or inline message with Undo. [notice bar]
- No card or panel container. [panel style]
- No page header or breadcrumb.
- No tooltip, so the "full rule in a tooltip" the exception pattern asks for isn't possible.
- No text area; the sign-off note uses a one-line TextInput.
- No menu button or popover. [Add filter menu]
- Select can't show options with descriptions or groups, though the Saved views pattern asks for both.
- No breakpoint tokens and no layout grid.
- A Ready / Signed off / blocked summary has no tone set aside for it.
- DataGrid can't render a link or an extra line inside a cell, so the sign-off note is only read to screen readers.
- Text field widths are fixed. [made full width in the panel and dialogs]
- The text styles use `--stl-font-family`, which isn't a published token.

**4. Guesses I made:**
- **Status colors:** Signed off uses the info tone, as in the design. Only open exceptions are flagged; signed-off ones aren't, also as in the design.
- **Lender names:** filters use short names ("Harbor Point"), matching the data's view and cap.
- **Loans outside the sample:** I treated them all as Ready. That holds because the totals show every Exception and Signed off loan is in the sample. Their Harbor Point balance comes from its 32% share.
- **Counts with FICO, LTV or UPB filters:** these count only sample loans, since the other loans' values are unknown.
- **Other lenders:** I assumed none is over the 30% cap.
- **Summary links:** the issue links replace the current filters, and pick the matching saved view if there is one. The "Loans by status" links add a Status filter.
- **Sign-off record:** sign-offs are recorded as by "You" with today's date.
- **Placeholders:** "Edit criteria" and "Pools" only show a message. Export downloads a CSV of the selected loans that are in the sample.
- **Fixed widths:** the Lender, Status and Exception column widths are my own; they aren't from Sterling.

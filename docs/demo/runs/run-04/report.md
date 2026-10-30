# Run 04: the session's final message

As the session wrote it, unedited.

The Pool loans screen is built and `npm run build` passes. I checked it in headless Edge: I clicked through every state in the brief and took screenshots in light, dark, compact, default and comfortable.

**What works**
- **Header:** shows the draft chip, the criteria, and "3 pool issues", which jumps to the issues panel. Submit pool is disabled until the issue count is zero, and a screen reader is told why.
- **Starting state:** the "Harbor Point loans" view, with 58 loans across 5 pages. LN-204389 has its 93.0% LTV flagged with a border, a warning icon and the reason, so it doesn't rely on color. Screen readers hear the reason too.
- **Selection:**
  - You can pick one row, Shift-click a range, use the header checkbox for the page, or "Select all 58 matching".
  - When no exception is selected, Sign off is disabled and the bar says "No Exception loans selected".
- **Sign off:** a dialog that requires a note. When I signed off both exceptions and removed Harbor Point, the issues went from 3 to 0 and Submit pool turned on.
- **Remove:**
  - Loans that are all on screen are removed straight away, with an Undo button.
  - When the selection reaches past the page, a confirmation dialog asks first ("Remove 58 loans from the pool?").
  - Counts, pool UPB and lender share update after each change. Keyboard focus moves to Undo, or to the message, so it isn't lost.
- **Filters:** the panel uses Apply and Reset, and each applied filter shows as a removable chip. Changing filters marks the view "· edited" and turns on Save view. Bad FICO or LTV input shows an error under the field.
- **States:** skeleton rows after 300 ms, a "no loans match" state with Clear filters, and a load error with Retry. I added a "Demo settings" panel to switch color mode and density and to force a load failure. It isn't in the design.

The code is in `src/pool.ts` (data, rules and a simulated server), `src/App.tsx`, `src/FiltersPanel.tsx`, `src/PoolSummary.tsx` and `src/App.css`. The CSS uses only Sterling tokens.

**1. Sterling components used**
DataGrid, BulkActionBar, Pagination, EmptyState, SummaryMetric, StatusChip, FilterChip, Tab, TabList, Select, TextInput, Checkbox, Button, IconButton, Link, Dialog, Icon, plus the helpers `numericColumnWidth` and `densityClass`.

**2. Most useful MCP tools**
- `get_pattern`: the Bulk action bar, Confirmation dialog, Warning and exception cells, and Loading/empty/error patterns set most of the behavior.
- `get_component`: in particular, DataGrid's `warning` and `descriptions` props for flagged cells.
- `get_tokens`: the density and color collections.
- `search`: mostly to confirm what Sterling doesn't have.

**3. Gaps in Sterling**
- **No message or toast:** I built the "Removed 58 loans · Undo" message from tokens.
- **No page header, breadcrumb, card container, or layout or breakpoint tokens:** I built them from tokens.
- **No hidden-text utility for screen readers:** I copied the approach Sterling uses internally.
- **No multi-line text field:** the sign-off note is a single-line TextInput.
- **The View menu falls short of its own pattern:** the pattern wants grouped options with a muted description. Menu and OptionWithDescription exist but have no behavior, so I used a plain Select.
- **No tooltip:** the Warning and exception cells pattern asks for the full rule in one.
- **`numericColumnWidth` ignores the header:** it doesn't allow for the header label plus the sort icon. In comfortable density "FICO" was cut off, so I widened that column by hand.
- **A disabled tab can't say why:** "Add loans" is disabled with no explanation.

**4. Guesses I made**
- **Pages 2–5:** the data only has the first page of each view, so those pages show "This page isn't in the sample data" instead of made-up loans.
- **Counts:** every non-Ready loan is in the sample, so I treated the other 165 loans as Ready, known only as counts and a balance. For filters like FICO 700–720 the total can't be known. The list then shows only the matching sample loans and doesn't offer "select all matching".
- **Lender cap:** only Harbor Point's share can be checked against the 30% limit, because no other lender's total is in the data.
- **Lender names:** chips and filters use full names ("Lender is Harbor Point Lending"); the design shows "Harbor Point".
- **Sign-offs:** a new sign-off is recorded as by "You", dated today.
- **Remove buttons:** Remove is a secondary button, and its confirmation uses the normal primary style, not danger, because removal can be undone.
- **Summary links:** each link sets its one filter and keeps the others ("Each adds a Status filter").
- **Left out or stubbed:** I left out Export and Add filter. Export is in the design but not the brief, and Add filter is offered by Sterling's filter pattern but has no field to add. "Pools" and "Edit criteria" only show a "not part of this demo" message.
- **Submit pool:** it marks the pool Submitted, with no confirmation.
- **Loading time:** the simulated delay is 700 ms.

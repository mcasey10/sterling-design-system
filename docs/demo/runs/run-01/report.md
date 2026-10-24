# Run 01: the session's final message

As the session wrote it, unedited.

The Pool loans screen is built and `npm run build` passes. I checked it in headless Chrome: screenshots in light and dark, plus a script that clicked through selecting, signing off, removing and undoing, the no-match filter, a bad filter value, the View menu by keyboard, loading, and the load error. It all worked with no console errors. I didn't test with a screen reader.

**What's there:** the header, both tabs (Add loans is disabled), the filter panel, saved views, removable filter chips, the bulk action bar, the grid, pagination, and the pool summary. It matches the designer's layout. Rule-breaking values get a border and an icon, and screen readers hear the reason. Sign-off needs a note. Remove asks for confirmation only when the selection goes past the visible page, and it offers Undo. Submit pool unlocks once the issue count reaches zero. You can reach that count, for example by signing off both exceptions and removing about $1.2M of Harbor Point loans.

To see the other states, use the "Demo settings" strip at the bottom: color mode, density, and the list loading normally, slowly, or failing. The same settings work as URL options, e.g. `?theme=dark&density=Compact&list=error`.

The code is in `src/App.tsx`, `src/pool.ts` (data and rules), `src/PopupList.tsx` (menus) and `src/app.css` (tokens only).

**1. Sterling components used:** DataGrid (which brings HeaderCell, BodyCell, Row, Checkbox and SkeletonRow), BulkActionBar, Pagination, EmptyState, StatusChip, FilterChip, Tab, TabList, Select, SelectField, Menu, MenuGroup, Option, OptionWithDescription, TextInput, Button, IconButton, Link, Icon, Dialog and SummaryMetric. Helpers: `numericColumnWidth`, `densityClass`, `textClass`.

**2. Most useful MCP tools:** `get_pattern` (filters/grid/bulk actions, bulk action bar, saved views, exception cells, confirmation dialog, loading/empty/error), then `get_component`, `get_guideline` (Data display, Accessibility) and `get_tokens`.

**3. Gaps in Sterling:**
- **Grouped select:** Select can't show groups or option descriptions, which the Saved views pattern asks for. I wrote the keyboard behavior for the View and Add filter menus myself, on top of Sterling's Menu and Option components.
- **Undo message:** there's no toast or banner. I built a small inline notice from tokens.
- **Page parts:** there's no card or panel, no breadcrumb, and no page header. These are plain markup styled with tokens.
- **Tooltip:** there isn't one, though the exception-cell pattern mentions it.
- **Column widths:** `numericColumnWidth` ignores the header label, so "FICO" got cut off in comfortable density. I sized that column to its label.
- **"Select all matching":** DataGrid only tracks the rows on the page, so the screen tracks the rest itself.

**4. Guesses I made:**
- **Loans outside the sample:** the totals say they're all Ready, and 46 of them are Harbor Point. Their combined balance comes from Harbor Point's 32% share. Removing "all 58" subtracts that amount.
- **Counts:** they're exact for lender and status filters. FICO, LTV or UPB filters can only count the sampled loans, and the footer says so.
- **Sorting** reorders only the sampled loans. Pages 2–5 show an empty state saying they aren't in the sample data.
- **Lender names:** I used full names ("Harbor Point Lending"), where the design shows "Harbor Point".
- **Views and filters I added:**
  - an "All pool loans" view
  - "Exceptions to sign off" grouped as Predefined
  - UPB as the only extra filter under Add filter
- **Ineligible status:** loans with FICO below 660 or LTV above 95% get an "Ineligible" status. None are in the data.
- **Left out:**
  - **Export**, since the brief didn't ask for it
  - **Pools and Edit criteria**, which don't go anywhere
  - **Sign-off notes**, which screen readers hear but which aren't shown on screen
- **Who and when:** sign-offs are recorded as "You" with today's date. Submit asks for confirmation and then marks the pool Submitted.

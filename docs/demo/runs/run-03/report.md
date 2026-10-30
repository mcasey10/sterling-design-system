# Run 03: the session's final message

As the session wrote it, unedited.

The Pool loans screen is built and `npm run build` passes. It opens on the "Harbor Point loans" view and matches the designer's layout. I drove it in headless Chrome to check each flow and state.

**What works:**
- **Header:** the pool name, the Draft chip, the criteria and the issue count. Submit pool stays disabled until there are no issues.
- **Selecting:** one loan, a Shift-click or Shift+Space range, the page, or "Select all 58 matching".
- **Sign off:** a note is required. When no exception is selected, the button is disabled and a hint says why; screen readers hear the hint too.
- **Remove:** it asks for confirmation only when the selection goes beyond the page. Afterwards a message offers Undo, and keyboard focus moves to the Undo button.
- **Live summary:** counts, pool balance, Harbor Point's share and the issue list all update as you act. I tested the full path: removing four large Harbor Point loans takes it under 30%, signing off the last exception enables Submit, and after submitting the list becomes read-only.
- **States:** loading rows after 300 ms, no matches with "Clear filters", and a load error with Retry. Flagged values have a border and an icon, and screen readers hear the reason. Light, dark and the three densities all work.
- **Preview settings:** a strip at the bottom switches color mode and density, and can make the next load fail so you can see the error state. It isn't part of the product screen.

The CSS uses only Sterling tokens. The one exception is the grid's column widths: the grid takes them as pixel numbers in TypeScript.

**1. Sterling components used**
DataGrid (with Row, BodyCell, HeaderCell and SkeletonRow inside it), BulkActionBar, Pagination, EmptyState, FilterChip, StatusChip, SummaryMetric, Tab/TabList, Select, TextInput, Checkbox, Button, Link, Dialog, Icon. I also used the helpers `numericColumnWidth`, `textClass` and `densityClass`.

**2. Most useful MCP tools**
- `get_pattern`: the bulk action bar, confirmation dialog, filter chips, saved views, exception cells, and loading/empty/error patterns set most of the screen's behavior.
- `get_component` for props.
- `get_tokens` for the density and color collections.
- `search`, mainly to confirm what doesn't exist.

**3. Gaps in Sterling**
- **No toast or inline message.** Undo needs one, so I built a small message bar from tokens.
- **No card or panel container.** I built one from the documented tokens (`surface/panel`, `border/default`, `radius/md`, `card/padding`).
- **Select can't show grouped options or descriptions.** The saved-views pattern asks for both ("Saved by me", each view's filters in muted text), but only Menu has them, and Menu has no open/close or keyboard behavior. The View dropdown is a plain Select for now.
- **No breadcrumb and no tooltip.** The exception pattern wants the full rule in a tooltip, so the reason only shows in the Exception column.
- **No way to explain a disabled tab.** Add loans is disabled with no reason given.
- **Fields are a fixed 240px wide**, so I stretched them to fill the filter panel, as the form guideline asks.

**4. Guesses I made**
- **Only page 1 of each view exists in the data.** Pages 2 and later show a message saying so. Sorting reorders only the loaded loans.
- **The loans not in the sample.** The totals put every exception and sign-off in the sample, so I treated the other loans as Ready. I split their balances into two groups (the rest of Harbor Point, and everyone else) using Harbor Point's 32% share.
- **Counts for other filters.** For filter combinations the totals don't cover (for example a FICO range), the count is the sample's, and the footer says "in the sample".
- **Lender cap.** Only Harbor Point's share can be checked, because it's the only lender the data gives a share for.
- **Short lender names.** I made them by dropping suffixes like "Lending" ("Harbor Point" from "Harbor Point Lending").
- **Your own sign-offs** are recorded as "You" with today's date.
- **Flagged cells use the warning style, not error,** to match the designer's screen.
- **Left out:** Export, Add filter and Edit criteria are in the designer's screen but not the brief.

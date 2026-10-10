// Patterns page: complete compositions built only from Sterling instances, with numbered notes and
// use / don't-use guidance — filters + grid + bulk actions, form layout, and loading / empty / error
// states. Domain-neutral placeholder content. Documentation only, so it is rebuilt on each run (at the
// same position); instances here are recreated, not tracked by the link check.

import { tokens } from "../../core/tokens";
import { COLLECTIONS } from "../../core/variables";
import { Kit, color, space, frame, text, pinMode, takeOver, setSize, density, PatternName, GUIDELINES_PAGE } from "../../core/helpers";
import { para, definitions, steps } from "../../core/docBlocks";
import { variantOf, setProps, nested } from "../../core/ensure";
import { GENERIC_DATA } from "../components/grid";
import type { Library } from "./componentsPage";
import { created, updated } from "../../core/log";

const ROOT = "Patterns";
const NOTES_MAX_WIDTH = 480;

interface Pattern {
  frame: FrameNode;
  canvas: FrameNode;
  notes: FrameNode;
}

async function pattern(kit: Kit, root: FrameNode, name: PatternName, summary: string, use: string, dont: string): Promise<Pattern> {
  const p = frame(`Pattern/${name}`, {
    gap: space(kit, "space/16"),
    padding: space(kit, "space/24"),
    fill: color(kit, "surface/panel"),
    stroke: color(kit, "border/default"),
    radius: space(kit, "radius/md"),
  });
  root.appendChild(p);
  p.layoutSizingHorizontal = "FILL";
  p.appendChild(await text(kit, name, "Title"));
  await para(kit, p, summary);
  await definitions(kit, p, [["Use when", use], ["Don't use when", dont]], 140);
  const body = frame("Body", { direction: "HORIZONTAL", gap: space(kit, "space/32") });
  p.appendChild(body);
  body.layoutSizingHorizontal = "FILL";
  const canvas = frame("Composition", {
    gap: space(kit, "space/12"),
    padding: space(kit, "space/16"),
    fill: color(kit, "surface/background"),
    radius: space(kit, "radius/sm"),
  });
  body.appendChild(canvas);
  // Notes fill whatever width the composition leaves (so they never run past the panel), up to
  // NOTES_MAX_WIDTH so lines stay readable next to a narrow composition.
  const notes = frame("Notes", { gap: space(kit, "space/8") });
  body.appendChild(notes);
  notes.layoutGrow = 1;
  notes.maxWidth = NOTES_MAX_WIDTH;
  return { frame: p, canvas, notes };
}

/** Numbered marker above a region of the composition; the matching note has the same number. */
async function marker(kit: Kit, parent: FrameNode, n: number, label: string) {
  parent.appendChild(await text(kit, `${n} · ${label}`, "Caption", "accent/default"));
}

function fill(node: SceneNode) {
  if ("layoutSizingHorizontal" in node && node.layoutSizingHorizontal !== "FILL") (node as FrameNode).layoutSizingHorizontal = "FILL";
}

/** Grid header row from header cells, matching the generic grid's columns. */
function headerRow(kit: Kit, lib: Library): FrameNode {
  const row = frame("Header", { direction: "HORIZONTAL" });
  for (const col of GENERIC_DATA.columns) {
    const cell = variantOf(lib.headerCell, {
      Sort: col.key === GENERIC_DATA.sortKey ? "asc" : "none",
      Align: col.type === "numeric" ? "right" : "left",
      State: "default",
    }).createInstance();
    row.appendChild(cell);
    setSize(cell, col.width, density(kit, "row/height"));
    setProps(cell, { Label: col.label, "Show sort": col.type !== "checkbox" });
  }
  return row;
}

// ------------------------------------------------------------ 1. Filters, grid, and bulk actions

async function filtersGrid(kit: Kit, lib: Library, root: FrameNode) {
  const p = await pattern(
    kit, root, "Filters, grid, and bulk actions",
    "The core data screen: narrow a large set of records, compare them in a grid, and act on a selection.",
    "people find, compare, and act on many records of the same kind (orders, positions, inventory).",
    "there are only a handful of records (use a list or cards), or one record is being edited (use a form)."
  );
  const screen = frame("Screen", { direction: "HORIZONTAL", gap: space(kit, "space/16") });
  p.canvas.appendChild(screen);

  const filters = frame("Filters panel", {
    gap: space(kit, "space/12"),
    padding: space(kit, "space/16"),
    width: 240,
    fill: color(kit, "surface/panel"),
    stroke: color(kit, "border/default"),
    radius: space(kit, "radius/md"),
  });
  screen.appendChild(filters);
  await marker(kit, filters, 1, "Filters panel");
  filters.appendChild(await text(kit, "Filters", "Heading"));
  for (const [set, content, props] of [
    [lib.textInput, "placeholder", { Label: "Search", Placeholder: "ID or name", "Show helper": false }],
    [lib.select, "value", { Label: "Status", Value: "Open", "Show helper": false }],
    [lib.select, "value", { Label: "Owner", Value: "Team A", "Show helper": false }],
  ] as [ComponentSetNode, string, Record<string, string | boolean>][]) {
    const inst = variantOf(set, { State: "default", Content: content }).createInstance();
    filters.appendChild(inst);
    fill(inst);
    setProps(inst, props);
  }
  const actions = frame("Actions", { direction: "HORIZONTAL", gap: space(kit, "space/8"), justify: "MAX" });
  filters.appendChild(actions);
  fill(actions);
  for (const [kind, label] of [["ghost", "Reset"], ["primary", "Apply"]]) {
    const b = variantOf(lib.button, { Kind: kind, Size: "sm", State: "default" }).createInstance();
    actions.appendChild(b);
    setProps(b, { Label: label });
  }

  const main = frame("Main content", { gap: space(kit, "space/12") });
  screen.appendChild(main);
  // One dataset, so no tabs: the View dropdown picks a named filter set, and the filter set shows as chips.
  await marker(kit, main, 2, "View and applied filters");
  const toolbar = frame("Toolbar", { direction: "HORIZONTAL", align: "CENTER", justify: "SPACE_BETWEEN", gap: space(kit, "space/8") });
  main.appendChild(toolbar);
  fill(toolbar);
  const left = frame("Filters", { direction: "HORIZONTAL", align: "CENTER", gap: space(kit, "space/8") });
  toolbar.appendChild(left);
  // Inline text label next to the select (Show label off), so the value is just the view name.
  left.appendChild(await text(kit, "View", "Label", "text/secondary"));
  const view = variantOf(lib.select, { State: "default", Content: "value" }).createInstance();
  left.appendChild(view);
  setSize(view, 200, view.height);
  setProps(view, { Label: "View", Value: "Open items", "Show label": false, "Show helper": false });
  for (const label of ["Status is Open", "Owner is Team A"]) {
    const c = variantOf(lib.filterChip, { State: "default" }).createInstance();
    left.appendChild(c);
    setProps(c, { Label: label });
  }
  const clear = variantOf(lib.button, { Kind: "ghost", Size: "sm", State: "default" }).createInstance();
  left.appendChild(clear);
  setProps(clear, { Label: "Clear all" });
  const save = variantOf(lib.button, { Kind: "ghost", Size: "sm", State: "default" }).createInstance();
  toolbar.appendChild(save);
  setProps(save, { Label: "Save view" });
  await marker(kit, main, 3, "Bulk action bar (only while rows are selected)");
  main.appendChild(lib.bulkActionBar.createInstance());
  await marker(kit, main, 4, "Grid");
  main.appendChild(lib.exampleGrid.createInstance());
  await marker(kit, main, 5, "Pagination");
  main.appendChild(lib.pagination.createInstance());

  await steps(kit, p.notes, [
    "Filters sit on the left (2 of 12 columns). Inputs and selects narrow the rows; Apply runs the query and Reset clears it. Placeholders give examples, never labels.",
    "The View dropdown picks a named filter set (plus columns and sort); Save view saves the current one. Every applied filter is a chip, in sync with the panel: removing a chip clears its field, Clear all removes them all. No tabs here — tabs are for separate datasets (scopes), not for status views.",
    "The bulk action bar appears only while rows are selected, directly above the grid, and pushes the grid down — it never covers rows. Danger actions use status/critical.",
    "In the grid, numeric columns are right-aligned with tabular figures; selected rows are tinted and checked; problem cells are flagged with a border and an icon.",
    "Pagination sits under the grid; Previous is disabled on the first page.",
  ]);
}

// ------------------------------------------------------------ 2. Form layout

async function formLayout(kit: Kit, lib: Library, root: FrameNode) {
  const p = await pattern(
    kit, root, "Form layout",
    "Create or edit one record: a single column of labeled fields, validation under each field, and one primary action.",
    "creating or editing a single record with a few fields (a ticket, a setting, an order note).",
    "editing many records at once (use the grid and bulk actions), or a long process (split it into steps)."
  );
  const card = frame("Form", {
    gap: space(kit, "space/16"),
    padding: space(kit, "space/24"),
    width: 400,
    fill: color(kit, "surface/panel"),
    stroke: color(kit, "border/default"),
    radius: space(kit, "radius/md"),
  });
  p.canvas.appendChild(card);
  card.appendChild(await text(kit, "New item", "Heading"));

  const field = async (n: number | null, label: string, set: ComponentSetNode, variant: Record<string, string>, props: Record<string, string | boolean>) => {
    if (n) await marker(kit, card, n, label);
    const inst = variantOf(set, variant).createInstance();
    card.appendChild(inst);
    fill(inst);
    setProps(inst, props);
  };
  await field(1, "Labels above, full width", lib.textInput, { State: "default", Content: "value" },
    { Label: "Name", Value: "Quarterly review", "Show helper": false });
  await field(2, "Placeholder is an example", lib.select, { State: "default", Content: "placeholder" },
    { Label: "Category", Placeholder: "Select a category", "Show helper": false });
  await field(3, "Error under the field (error-focus while fixing)", lib.textInput, { State: "error-focus", Content: "value" },
    { Label: "Amount", Value: "0.00", Helper: "Enter an amount greater than 0." });
  await field(4, "Warning doesn't block saving", lib.textInput, { State: "warning", Content: "value" },
    { Label: "Reference", Value: "REF-0042", Helper: "Matches an existing reference. Check before saving." });
  await marker(kit, card, 5, "Checkbox with its label");
  const box = variantOf(lib.checkbox, { Checked: "on", State: "default" }).createInstance();
  card.appendChild(box);
  setProps(box, { Label: "Notify the owner", "Show label": true });
  await marker(kit, card, 6, "Actions");
  const actions = frame("Actions", { direction: "HORIZONTAL", gap: space(kit, "space/8"), justify: "MAX" });
  card.appendChild(actions);
  fill(actions);
  for (const [kind, label] of [["secondary", "Cancel"], ["primary", "Save"]]) {
    const b = variantOf(lib.button, { Kind: kind, Size: "md", State: "default" }).createInstance();
    actions.appendChild(b);
    setProps(b, { Label: label });
  }

  await steps(kit, p.notes, [
    "One column, labels above the fields, fields full width: the eye moves straight down, and labels stay visible while typing.",
    "Placeholder text is an example of the expected value, never the label — it disappears as soon as someone types.",
    "Errors appear under the field with an icon and specific, fixable text. While the field is focused it keeps the red border and adds the focus ring (State = error-focus).",
    "Warnings (amber, with an icon) flag something to check but don't block saving; errors do.",
    "Outside a grid, checkboxes show their label (Show label on), so the whole label is the click target.",
    "Actions sit at the bottom right: one primary action, with the secondary to its left.",
  ]);
}

// ------------------------------------------------------------ 3. Loading, empty, and error states

async function dataStates(kit: Kit, lib: Library, root: FrameNode) {
  const p = await pattern(
    kit, root, "Loading, empty, and error states",
    "What a data view shows before, instead of, or when it fails to show rows. Keep the header and filters so context isn't lost.",
    "any data view that loads asynchronously or can come back empty.",
    "only some rows have problems (flag those cells instead), or filtering is local and instant (under ~300 ms, show nothing)."
  );
  const block = async (n: number, label: string, body: (holder: FrameNode) => Promise<void>) => {
    await marker(kit, p.canvas, n, label);
    const grid = frame(label, { stroke: color(kit, "border/default") });
    p.canvas.appendChild(grid);
    grid.appendChild(headerRow(kit, lib));
    await body(grid);
    return grid;
  };

  const loadingRow = frame("Loading", { direction: "HORIZONTAL", gap: space(kit, "space/16"), align: "MIN" });
  await block(1, "Loading", async (grid) => {
    for (let i = 0; i < 4; i++) {
      const row = lib.skeletonRow.createInstance();
      grid.appendChild(row);
      if (i === 0) setProps(row, { "Show label": true });
    }
  });
  // The summary metric's loading state, shown alongside the loading grid.
  const loadingGrid = p.canvas.children[p.canvas.children.length - 1] as FrameNode;
  p.canvas.insertChild(p.canvas.children.indexOf(loadingGrid), loadingRow);
  loadingRow.appendChild(loadingGrid);
  const metric = variantOf(lib.summaryMetric, { Status: "normal", State: "loading" }).createInstance();
  loadingRow.appendChild(metric);
  setProps(metric, { Label: "Total amount" });

  await block(2, "Empty (no results)", async (grid) => {
    grid.appendChild(variantOf(lib.emptyState, { Tone: "neutral" }).createInstance());
  });
  await block(3, "Error", async (grid) => {
    const err = variantOf(lib.emptyState, { Tone: "critical" }).createInstance();
    grid.appendChild(err);
    const action = nested(err, "Action");
    if (action) setProps(action, { Label: "Retry" });
  });

  await steps(kit, p.notes, [
    "Loading: after ~300 ms, show skeleton rows under the real header, so the layout doesn't jump when rows arrive. Turn on the first row's label (\"Loading rows…\") and mark the grid aria-busy in code. Summary metrics use State = loading.",
    "Empty: say why there are no rows and offer the way out — Clear filters for no results; for nothing yet, say what will appear and how to add it.",
    "Error: say what failed and offer Retry. The critical tone shows in the icon and title, not just color. Keep the header and filters so nothing is lost.",
  ]);
}

export async function buildPatterns(kit: Kit, page: PageNode, lib: Library): Promise<FrameNode> {
  const pos = takeOver(page, ROOT);
  const root = frame(ROOT, {
    gap: space(kit, "space/24"),
    padding: space(kit, "space/48"),
    width: 1600,
    fill: color(kit, "surface/background"),
  });
  pinMode(kit, root, COLLECTIONS.color, tokens.color.$modes[0]);
  pinMode(kit, root, COLLECTIONS.density, "Default");
  page.appendChild(root);
  if (pos) {
    root.x = pos.x;
    root.y = pos.y;
  }
  const header = frame("Header", { gap: space(kit, "space/8") });
  root.appendChild(header);
  header.layoutSizingHorizontal = "FILL";
  header.appendChild(await text(kit, "Patterns", "Display"));
  await para(
    kit, header,
    "Complete compositions built only from Sterling instances. Numbers in each composition match its notes. Copy a pattern " +
      `into a Template copy as a starting point. The rules behind them are on the ${GUIDELINES_PAGE} page.`
  );

  await filtersGrid(kit, lib, root);
  await formLayout(kit, lib, root);
  await dataStates(kit, lib, root);

  const footer = frame("Footer", {});
  root.appendChild(footer);
  footer.layoutSizingHorizontal = "FILL";
  await para(kit, footer, "Generated from the plugin (src/patterns.ts). Redrawn on every run — change the source, not this frame.", "Caption");

  if (pos) updated("Page Patterns");
  else created("Page Patterns content");
  return root;
}

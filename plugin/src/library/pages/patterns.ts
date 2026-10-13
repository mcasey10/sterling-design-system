// Patterns page: complete compositions built only from Sterling instances, with numbered notes and
// use / don't-use guidance — filters + grid + bulk actions, the bulk action bar's states, filter panel and
// chips, saved views, status chips, warning and exception cells, the confirmation dialog, form layout, and
// loading / empty / error states. Domain-neutral placeholder content. Documentation only, so it is rebuilt on each run (at the
// same position); instances here are recreated, not tracked by the link check.
// Each pattern's text (summary, use / don't use, step labels and notes) comes from definitions/guidelines.ts;
// this file builds the compositions.

import { tokens } from "../../core/tokens";
import { COLLECTIONS } from "../../core/variables";
import {
  Kit, color, space, frame, rect, bindFill, text, pinMode, takeOver, setSize, density, numericColumnWidth, PatternName, GUIDELINES_PAGE,
} from "../../core/helpers";
import { para, definitions, steps } from "../../core/docBlocks";
import { variantOf, setProps, nested } from "../../core/ensure";
import { GENERIC_DATA } from "../components/grid";
import type { Library } from "./componentsPage";
import { toolbar, filterPanel, viewMenu, dialogBody, FilterField, ViewGroup } from "../compositions";
import { DESCRIPTION_MENU_WIDTH } from "../components/menu";
import { patternDoc, type PatternDoc } from "../../../../definitions/guidelines";
import { created, updated } from "../../core/log";

const ROOT = "Patterns";
const NOTES_MAX_WIDTH = 480;

interface Pattern {
  /** The pattern's text, from definitions/guidelines.ts. */
  doc: PatternDoc;
  frame: FrameNode;
  canvas: FrameNode;
  notes: FrameNode;
}

async function pattern(kit: Kit, root: FrameNode, name: PatternName): Promise<Pattern> {
  const doc = patternDoc(name);
  const { summary, use, dont } = doc;
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
  return { doc, frame: p, canvas, notes };
}

/** The label of a pattern's step n (numbered from 1), from definitions/guidelines.ts. */
function stepLabel(p: Pattern, n: number): string {
  const step = p.doc.steps[n - 1];
  if (!step) throw new Error(`definitions/guidelines.ts has no step ${n} for "${p.doc.name}"`);
  return step[0];
}

/** Numbered marker above a region of the composition; the matching note has the same number. */
async function marker(kit: Kit, p: Pattern, parent: FrameNode, n: number) {
  parent.appendChild(await text(kit, `${n} · ${stepLabel(p, n)}`, "Caption", "accent/default"));
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
  const p = await pattern(kit, root, "Filters, grid, and bulk actions");
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
  await marker(kit, p, filters, 1);
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
  await marker(kit, p, main, 2);
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
  await marker(kit, p, main, 3);
  main.appendChild(lib.bulkActionBar.createInstance());
  await marker(kit, p, main, 4);
  main.appendChild(lib.exampleGrid.createInstance());
  await marker(kit, p, main, 5);
  main.appendChild(lib.pagination.createInstance());

  await steps(kit, p.notes, p.doc.steps.map(([, note]) => note));
}

// ------------------------------------------------------------ 2. Form layout

async function formLayout(kit: Kit, lib: Library, root: FrameNode) {
  const p = await pattern(kit, root, "Form layout");
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

  const field = async (n: number, set: ComponentSetNode, variant: Record<string, string>, props: Record<string, string | boolean>) => {
    await marker(kit, p, card, n);
    const inst = variantOf(set, variant).createInstance();
    card.appendChild(inst);
    fill(inst);
    setProps(inst, props);
  };
  await field(1, lib.textInput, { State: "default", Content: "value" },
    { Label: "Name", Value: "Quarterly review", "Show helper": false });
  await field(2, lib.select, { State: "default", Content: "placeholder" },
    { Label: "Category", Placeholder: "Select a category", "Show helper": false });
  await field(3, lib.textInput, { State: "error-focus", Content: "value" },
    { Label: "Amount", Value: "0.00", Helper: "Enter an amount greater than 0." });
  await field(4, lib.textInput, { State: "warning", Content: "value" },
    { Label: "Reference", Value: "REF-0042", Helper: "Matches an existing reference. Check before saving." });
  await marker(kit, p, card, 5);
  const box = variantOf(lib.checkbox, { Checked: "on", State: "default" }).createInstance();
  card.appendChild(box);
  setProps(box, { Label: "Notify the owner", "Show label": true });
  await marker(kit, p, card, 6);
  const actions = frame("Actions", { direction: "HORIZONTAL", gap: space(kit, "space/8"), justify: "MAX" });
  card.appendChild(actions);
  fill(actions);
  for (const [kind, label] of [["secondary", "Cancel"], ["primary", "Save"]]) {
    const b = variantOf(lib.button, { Kind: kind, Size: "md", State: "default" }).createInstance();
    actions.appendChild(b);
    setProps(b, { Label: label });
  }

  await steps(kit, p.notes, p.doc.steps.map(([, note]) => note));
}

// ------------------------------------------------------------ 3. Loading, empty, and error states

async function dataStates(kit: Kit, lib: Library, root: FrameNode) {
  const p = await pattern(kit, root, "Loading, empty, and error states");
  // Each block is named after its step's label.
  const block = async (n: number, body: (holder: FrameNode) => Promise<void>) => {
    const label = stepLabel(p, n);
    await marker(kit, p, p.canvas, n);
    const grid = frame(label, { stroke: color(kit, "border/default") });
    p.canvas.appendChild(grid);
    grid.appendChild(headerRow(kit, lib));
    await body(grid);
    return grid;
  };

  const loadingRow = frame("Loading", { direction: "HORIZONTAL", gap: space(kit, "space/16"), align: "MIN" });
  await block(1, async (grid) => {
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

  await block(2, async (grid) => {
    grid.appendChild(variantOf(lib.emptyState, { Tone: "neutral" }).createInstance());
  });
  await block(3, async (grid) => {
    const err = variantOf(lib.emptyState, { Tone: "critical" }).createInstance();
    grid.appendChild(err);
    const action = nested(err, "Action");
    if (action) setProps(action, { Label: "Retry" });
  });

  await steps(kit, p.notes, p.doc.steps.map(([, note]) => note));
}

// ------------------------------------------------------------ Bulk action bar

const BAR_WIDTH = 800;

async function bulkBar(kit: Kit, lib: Library, root: FrameNode) {
  const p = await pattern(kit, root, "Bulk action bar");
  /**
   * A bar instance with a real verb on its primary action; `primaryState` disables it. Wider than the generic
   * grid, so the hint and every action fit on one line.
   */
  const bar = (props: Record<string, string | boolean>, primaryState = "default") => {
    const inst = lib.bulkActionBar.createInstance();
    p.canvas.appendChild(inst);
    inst.resize(BAR_WIDTH, inst.height);
    setProps(inst, props);
    const primary = nested(inst, "Primary");
    if (primary) setProps(primary, { Label: "Approve", State: primaryState });
    return inst;
  };
  await marker(kit, p, p.canvas, 1);
  bar({ Count: "2 selected", "Select all": "Select all 120 matching" });
  await marker(kit, p, p.canvas, 2);
  bar({ Count: "All 120 matching selected", "Show select all": false });
  await marker(kit, p, p.canvas, 3);
  bar({ Count: "2 selected", "Select all": "Select all 120 matching", Hint: "No flagged items selected", "Show hint": true }, "disabled");
  await marker(kit, p, p.canvas, 4);
  p.canvas.appendChild(await text(kit, "No checkboxes and no bar: there is nothing to select.", "Body", "text/secondary"));

  await steps(kit, p.notes, p.doc.steps.map(([, note]) => note));
}

// ------------------------------------------------------------ Filter panel and chips

const FILTER_FIELDS: FilterField[] = [
  { label: "Status", kind: "select", placeholder: "Any status" },
  { label: "Owner", kind: "select", placeholder: "Any owner" },
  { label: "Amount", kind: "text", placeholder: "e.g. > 1,000" },
  { label: "Updated", kind: "text", placeholder: "e.g. last 7 days" },
];

/** A fixed-width holder for a toolbar, which fills its parent. */
function toolbarHolder(parent: FrameNode, name: string): FrameNode {
  const holder = frame(name, { width: 640 });
  parent.appendChild(holder);
  return holder;
}

async function filterChips(kit: Kit, lib: Library, root: FrameNode) {
  const p = await pattern(kit, root, "Filter panel and chips");
  const screen = frame("Screen", { direction: "HORIZONTAL", gap: space(kit, "space/16") });
  p.canvas.appendChild(screen);
  const left = frame("Panel", { gap: space(kit, "space/8") });
  screen.appendChild(left);
  await marker(kit, p, left, 1);
  await filterPanel(kit, lib, left, 1, "Filter items", FILTER_FIELDS, { Status: "Open", Owner: "Team A" }, 240);
  const right = frame("Applied filters", { gap: space(kit, "space/8") });
  screen.appendChild(right);
  await marker(kit, p, right, 2);
  // The toolbar hugs its content here, so the composition is only as wide as what it shows.
  await toolbar(kit, lib, right, 1, "All items · edited", ["Status is Open", "Owner is Team A"], true);

  await steps(kit, p.notes, p.doc.steps.map(([, note]) => note));
}

// ------------------------------------------------------------ Saved views

const VIEW_GROUPS: ViewGroup[] = [
  {
    heading: "Predefined",
    views: [
      { name: "All items", filter: "No filters" },
      { name: "Open items", filter: "Status is Open" },
      { name: "Flagged", filter: "Status is Flagged · adds Reason column" },
    ],
  },
  { heading: "Saved by me", views: [{ name: "Team A, large", filter: "Owner is Team A · Amount ≥ 10,000", selected: true }] },
];

async function savedViews(kit: Kit, lib: Library, root: FrameNode) {
  const p = await pattern(kit, root, "Saved views");
  await marker(kit, p, p.canvas, 1);
  const trigger = frame("Trigger", { direction: "HORIZONTAL", align: "CENTER", gap: space(kit, "space/8") });
  p.canvas.appendChild(trigger);
  trigger.appendChild(await text(kit, "View", "Label", "text/secondary"));
  const select = variantOf(lib.select, { State: "focus", Content: "value" }).createInstance();
  trigger.appendChild(select);
  setSize(select, 200, select.height);
  setProps(select, { Label: "View", Value: "Team A, large", "Show label": false, "Show helper": false });
  viewMenu(kit, lib, p.canvas, VIEW_GROUPS, DESCRIPTION_MENU_WIDTH + 80);
  await marker(kit, p, p.canvas, 2);
  await toolbar(kit, lib, toolbarHolder(p.canvas, "Edited view"), 0, "Open items · edited", ["Status is Open", "Owner is Team A"], true);
  await marker(kit, p, p.canvas, 3);
  await toolbar(kit, lib, toolbarHolder(p.canvas, "Unchanged view"), 0, "Open items", ["Status is Open"], false);

  await steps(kit, p.notes, p.doc.steps.map(([, note]) => note));
}

// ------------------------------------------------------------ Status chips

const STATUS_COLUMN_WIDTH = 120;
const STATUS_SAMPLES: [string, string][] = [
  ["Active", "positive"], ["Pending", "info"], ["Flagged", "warning"], ["Blocked", "critical"], ["Draft", "neutral"],
];

async function statusChips(kit: Kit, lib: Library, root: FrameNode) {
  const p = await pattern(kit, root, "Status chips");
  await marker(kit, p, p.canvas, 1);
  const tones = frame("Tones", { direction: "HORIZONTAL", align: "CENTER", gap: space(kit, "space/12") });
  p.canvas.appendChild(tones);
  for (const [label, tone] of STATUS_SAMPLES) {
    const chip = variantOf(lib.chip, { Tone: tone }).createInstance();
    tones.appendChild(chip);
    setProps(chip, { Label: label });
  }
  await marker(kit, p, p.canvas, 2);
  // A plain Status column: a header cell and one chip cell per state, with nothing else competing for attention.
  const column = frame("Status column", { stroke: color(kit, "border/default") });
  p.canvas.appendChild(column);
  const head = variantOf(lib.headerCell, { Sort: "none", Align: "left", State: "default" }).createInstance();
  column.appendChild(head);
  setSize(head, STATUS_COLUMN_WIDTH, density(kit, "row/height"));
  setProps(head, { Label: "Status" });
  for (const [label, tone] of STATUS_SAMPLES) {
    const cell = variantOf(lib.bodyCell, { Type: "chip", State: "default" }).createInstance();
    column.appendChild(cell);
    setSize(cell, STATUS_COLUMN_WIDTH, density(kit, "row/height"));
    const chip = nested(cell, "Chip");
    if (chip) setProps(chip, { Tone: tone, Label: label });
  }
  await marker(kit, p, p.canvas, 3);
  const long = variantOf(lib.chip, { Tone: "info" }).createInstance();
  p.canvas.appendChild(long);
  setProps(long, { Label: "Awaiting secondary review by the operations team" });

  await steps(kit, p.notes, p.doc.steps.map(([, note]) => note));
}

// ------------------------------------------------------------ Warning and exception cells

async function flaggedCells(kit: Kit, lib: Library, root: FrameNode) {
  const p = await pattern(kit, root, "Warning and exception cells");
  const flagWidth = numericColumnWidth("21.0%", { icon: true });
  const cell = (type: string, state: string, value: string, width = flagWidth) => {
    const c = variantOf(lib.bodyCell, { Type: type, State: state }).createInstance();
    setProps(c, { Value: value });
    setSize(c, width, density(kit, "row/height"));
    return c;
  };
  const row = (name: string, cells: InstanceNode[]) => {
    const r = frame(name, { direction: "HORIZONTAL", gap: space(kit, "space/16") });
    p.canvas.appendChild(r);
    for (const c of cells) r.appendChild(c);
  };
  await marker(kit, p, p.canvas, 1);
  row("States", [cell("numeric", "default", "18.5%"), cell("numeric", "warning", "21.0%"), cell("numeric", "error", "26.4%")]);
  await marker(kit, p, p.canvas, 2);
  row("Focus", [cell("numeric", "warning-focus", "21.0%"), cell("numeric", "error-focus", "26.4%")]);
  await marker(kit, p, p.canvas, 3);
  const reason = frame("Reason", { direction: "HORIZONTAL" });
  p.canvas.appendChild(reason);
  reason.appendChild(cell("numeric", "warning", "21.0%"));
  reason.appendChild(cell("text", "default", "Above the 20% limit", 200));

  await steps(kit, p.notes, p.doc.steps.map(([, note]) => note));
}

// ------------------------------------------------------------ Confirmation dialog

async function confirmation(kit: Kit, lib: Library, root: FrameNode) {
  const p = await pattern(kit, root, "Confirmation dialog");
  const dialog = async (parent: FrameNode, title: string, body: string, primary: string, kind: string) => {
    const d = lib.dialog.createInstance();
    parent.appendChild(d);
    setProps(d, { Title: title, "Show close": true });
    const action = nested(d, "Primary");
    if (action) setProps(action, { Kind: kind, Label: primary });
    const content = dialogBody(d);
    if (content) await para(kit, content, body, "Body", "text/primary"); // wraps at the dialog's width
    return d;
  };
  await marker(kit, p, p.canvas, 1);
  await dialog(p.canvas, "Delete 2 items?", "This can't be undone.", "Delete 2 items", "danger");
  await marker(kit, p, p.canvas, 2);
  await dialog(p.canvas, "Archive all 120 matching items?", "This includes items on other pages. You can restore them from the archive.", "Archive 120 items", "primary");

  // 3. The dialog in place: over the screen it was opened from, with the screen dimmed by surface/scrim.
  await marker(kit, p, p.canvas, 3);
  const screen = frame("Screen behind the dialog", {
    gap: space(kit, "space/12"),
    padding: space(kit, "space/16"),
    fill: color(kit, "surface/background"),
    stroke: color(kit, "border/default"),
    radius: space(kit, "radius/sm"),
    clip: true,
  });
  p.canvas.appendChild(screen);
  screen.appendChild(lib.bulkActionBar.createInstance());
  screen.appendChild(lib.exampleGrid.createInstance());
  screen.appendChild(lib.pagination.createInstance());
  // The scrim and the dialog sit above the screen's layout, so they are positioned absolutely.
  const scrim = rect("Scrim", screen.width, screen.height);
  bindFill(scrim, color(kit, "surface/scrim"));
  screen.appendChild(scrim);
  scrim.layoutPositioning = "ABSOLUTE";
  scrim.x = 0;
  scrim.y = 0;
  scrim.constraints = { horizontal: "STRETCH", vertical: "STRETCH" };
  const over = await dialog(screen, "Delete 2 items?", "This can't be undone.", "Delete 2 items", "danger");
  over.layoutPositioning = "ABSOLUTE";
  over.x = Math.round((screen.width - over.width) / 2);
  over.y = Math.round((screen.height - over.height) / 2);
  over.constraints = { horizontal: "CENTER", vertical: "CENTER" };

  await steps(kit, p.notes, p.doc.steps.map(([, note]) => note));
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
  await bulkBar(kit, lib, root);
  await filterChips(kit, lib, root);
  await savedViews(kit, lib, root);
  await statusChips(kit, lib, root);
  await flaggedCells(kit, lib, root);
  await confirmation(kit, lib, root);
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

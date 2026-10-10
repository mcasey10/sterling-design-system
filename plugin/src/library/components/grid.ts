// Data grid: Grid/HeaderCell, Grid/BodyCell, plus data-driven builders for a row component set
// and a grid. The Components page builds a generic grid (GENERIC_DATA); worked examples (e.g. the
// loan-pooling example) pass their own columns and rows.
// Row height and cell padding are bound to the Density collection, so switching a frame's
// Density mode resizes the whole grid.

import { Kit, size, color, density, space, configureFrame, setSize, truncate, untruncate, widthOf, bindFill } from "../../core/helpers";
import {
  ComponentSetSpec, Props, combos, ensureFrame, ensureInstance, ensureText, ensureProp, prune, tintIcon,
  variantOf, setProps, nested, reference, ensureComponent, ensureFocusRing,
} from "../../core/ensure";
import type { IconIndex } from "../icons";
import { warn } from "../../core/log";
import { describe } from "../docRegistry";

// ------------------------------------------------------------ Datasets

export type CellType = "text" | "numeric" | "gain" | "loss" | "chip" | "checkbox";

/** Cell types whose value is a number: right-aligned, Numeric style, never truncated. */
const NUMERIC_TYPES = ["numeric", "gain", "loss"];

export interface Column {
  key: string;
  label: string;
  type: CellType;
  width: number;
  /**
   * Identifier column (IDs, codes, reference numbers): a text cell whose width is sized to its values, like
   * a numeric column, and never stretched.
   */
  identifier?: boolean;
}

/**
 * Which columns take up extra width when a grid is fitted to a wider area: only descriptive text (names,
 * notes). Numeric, identifier, chip, and checkbox columns stay sized to their values.
 */
export const stretches = (c: Column) => c.type === "text" && !c.identifier;

export interface GridRow {
  values: Record<string, string>;
  selected?: boolean;
  /** Column keys rendered in the error state. */
  error?: string[];
  /** Column keys rendered in the warning state. */
  warning?: string[];
  /** Not selectable: the checkbox is disabled and text is muted (text/secondary), except flagged cells. */
  disabled?: boolean;
  /** Text color per column key (e.g. muted audit text, warning-colored notes). */
  ink?: Record<string, string>;
}

export interface Dataset {
  columns: Column[];
  rows: GridRow[];
  /** Chip label → Chip/Status tone. */
  tones: Record<string, string>;
  /** Column shown as sorted ascending in the header. */
  sortKey?: string;
  /**
   * Set text colors on every text / numeric cell (from row.ink and row.disabled, else text/primary), so
   * colors can change between runs. Off for the generic grid, which has no color overrides.
   */
  inkOverrides?: boolean;
}

export const gridWidth = (data: Dataset) => data.columns.reduce((sum, c) => sum + c.width, 0);

/**
 * Neutral placeholder data for the reusable grid on the Components page: fictional, generic records.
 * Two rows are selected, matching the bulk action bar's default "2 selected".
 */
export const GENERIC_DATA: Dataset = {
  columns: [
    { key: "select", label: "", type: "checkbox", width: 40 },
    { key: "id", label: "ID", type: "text", width: 96, identifier: true },
    { key: "name", label: "Name", type: "text", width: 240 },
    // Numeric columns are sized to their values, not wider, so each header's sort icon sits beside its label:
    // Amount by numericColumnWidth("2,100.00") = 88; Percent is 88 too, so its header label fits next to the icon.
    { key: "amount", label: "Amount", type: "numeric", width: 88 },
    { key: "percent", label: "Percent", type: "numeric", width: 88 },
    { key: "status", label: "Status", type: "chip", width: 120 },
  ],
  rows: [
    { values: { id: "INV-20418", name: "Alder Street renewal", amount: "1,250.00", percent: "12.5%", status: "Active" } },
    { values: { id: "INV-20419", name: "Kestrel onboarding", amount: "840.00", percent: "8.0%", status: "Pending" }, selected: true },
    { values: { id: "INV-20423", name: "Marlow annual audit", amount: "2,100.00", percent: "21.0%", status: "Flagged" }, selected: true },
    { values: { id: "INV-20431", name: "Tamarack migration", amount: "-35.00", percent: "0.0%", status: "Blocked" }, error: ["amount"] },
    { values: { id: "INV-20436", name: "Quillon site survey", amount: "610.00", percent: "6.1%", status: "Draft" } },
  ],
  tones: { Active: "positive", Pending: "info", Flagged: "warning", Blocked: "critical", Draft: "neutral" },
  sortKey: "id",
};

export interface GridDeps {
  icons: IconIndex;
  chip: ComponentSetNode;
  checkbox: ComponentSetNode;
}

const SORT_ICONS: Record<string, string> = { none: "sort", asc: "arrow-up", desc: "arrow-down" };

/**
 * Sort icons show only where they carry information: on the sorted column (asc / desc, in every state), and on
 * an unsorted column while it's hovered or focused. An unsorted header at rest keeps its icon layer, hidden, so
 * every variant has the same layers and a grid shows at most one sort icon at rest.
 */
const sortIconHidden = (p: Props) => p.Sort === "none" && p.State === "default";

// ------------------------------------------------------------ Header cell

export function headerCellSpec(kit: Kit, deps: GridDeps): ComponentSetSpec {
  return {
    name: "Grid/HeaderCell",
    description: describe("Grid/HeaderCell"),
    variants: combos({ Sort: ["none", "asc", "desc"], Align: ["left", "right"], State: ["default", "hover", "focus"] }),
    columnProp: "State",

    async build(comp: ComponentNode, p: Props) {
      const active = p.Sort !== "none";
      const right = p.Align === "right";
      const ink = active ? "text/primary" : "text/secondary";
      configureFrame(comp, {
        direction: "HORIZONTAL",
        align: "CENTER",
        justify: right ? "MAX" : "MIN",
        gap: space(kit, "space/4"),
        padding: { x: density(kit, "cell/padding-x"), y: density(kit, "cell/padding-y") },
        width: 120,
        height: density(kit, "row/height"),
        fill: color(kit, p.State === "hover" ? "surface/hover" : "surface/background"),
        stroke: color(kit, "border/strong"),
        strokeSides: { bottom: 1 },
      });
      // The label fills the cell and truncates at its width (instances can't override max width, so a
      // fill is the only rule that follows each column's width). The sort icon sits at the cell edge:
      // after the label for left-aligned headers, first for right-aligned ones, whose label is
      // right-aligned so it stays flush with the numbers below. A hugging label with a max width would keep
      // the icon beside the label in any column, but that max width can't follow an instance's width, so it
      // would truncate too early in wide columns and overflow in narrow ones. Instead, size numeric columns to
      // their values (numericColumnWidth): then the icon sits immediately to the label's left.
      const label = await ensureText(kit, comp, "Label", "Column", "Label", ink, right ? 1 : 0);
      truncate(label, { fill: true, align: right ? "RIGHT" : "LEFT" });
      const icon = await ensureInstance(comp, "Sort", deps.icons.get(SORT_ICONS[p.Sort])!, right ? 0 : 1);
      setSize(icon, size(kit, "size/12"), size(kit, "size/12"));
      tintIcon(icon, color(kit, ink));
      // Unsorted at rest: the icon is hidden, and it's released from the Show sort property (which would
      // otherwise make it visible again). The other variants are tied to Show sort in wire().
      if (sortIconHidden(p)) {
        const refs = icon.componentPropertyReferences;
        if (refs?.visible) {
          const { visible: _visible, ...rest } = refs;
          icon.componentPropertyReferences = rest;
        }
        if (icon.visible) icon.visible = false;
      } else if (!icon.componentPropertyReferences?.visible && !icon.visible) {
        icon.visible = true;
      }
      // Header cells sit edge to edge, so the focus ring is drawn inside the cell.
      const ring = ensureFocusRing(kit, comp, p.State === "focus", null, "inside");
      prune(comp, ring ? [label, icon, ring] : [label, icon]);
    },

    wire(set: ComponentSetNode, variants: ComponentNode[]) {
      const labelKey = ensureProp(set, "Label", "TEXT", "Column");
      const showKey = ensureProp(set, "Show sort", "BOOLEAN", true);
      for (const comp of variants) {
        reference(comp, "Label", "characters", labelKey);
        // Show sort = off means "not sortable": it hides the icon wherever a variant shows one.
        const unsortedAtRest = comp.name.includes("Sort=none") && comp.name.includes("State=default");
        if (!unsortedAtRest) reference(comp, "Sort", "visible", showKey);
      }
    },
  };
}

// ------------------------------------------------------------ Body cell

const CELL_STATES = ["default", "hover", "selected", "selected-hover", "focus", "warning", "warning-focus", "error", "error-focus"];

const CELL_FILLS: Record<string, string> = {
  default: "surface/panel",
  hover: "surface/hover",
  selected: "selection/row",
  "selected-hover": "selection/row-hover",
  focus: "surface/panel",
  warning: "status/warning-subtle",
  error: "status/critical-subtle",
};

/** Error and warning cells add a full border and an icon, so the state never relies on color alone. */
const CELL_FLAGS: Record<string, { stroke: string; icon: string; iconInk: string; layer: string }> = {
  warning: { stroke: "status/warning", icon: "alert-triangle", iconInk: "status/warning-strong", layer: "Warning icon" },
  error: { stroke: "status/critical", icon: "circle-x", iconInk: "status/critical", layer: "Error icon" },
};

/** Gain / loss cells: a ▲ / ▼ glyph plus the signed value, so direction never relies on color alone. */
const DIRECTIONS: Record<string, { icon: string; ink: string }> = {
  gain: { icon: "caret-up", ink: "finance/gain" },
  loss: { icon: "caret-down", ink: "finance/loss" },
};

export function bodyCellSpec(kit: Kit, deps: GridDeps): ComponentSetSpec {
  return {
    name: "Grid/BodyCell",
    description: describe("Grid/BodyCell"),
    variants: combos({
      Type: ["text", "numeric", "gain", "loss", "chip", "checkbox"],
      State: CELL_STATES,
    }),
    columnProp: "State",

    async build(comp: ComponentNode, p: Props) {
      const type = p.Type as CellType;
      const focused = p.State.endsWith("focus");
      const base = p.State.replace(/-?focus$/, "") || "focus";
      const flag = CELL_FLAGS[base];
      const numeric = NUMERIC_TYPES.includes(type);
      configureFrame(comp, {
        direction: "HORIZONTAL",
        align: "CENTER",
        justify: numeric ? "MAX" : type === "checkbox" ? "CENTER" : "MIN",
        gap: space(kit, "space/4"),
        padding: { x: density(kit, "cell/padding-x"), y: density(kit, "cell/padding-y") },
        width: type === "checkbox" ? widthOf(kit, 40) : 120,
        height: density(kit, "row/height"),
        fill: color(kit, CELL_FILLS[base]),
        stroke: color(kit, flag ? flag.stroke : "border/default"),
        strokeSides: flag ? { top: 1, right: 1, bottom: 1, left: 1 } : { bottom: 1 },
      });
      // A flagged cell's border is drawn over its padding instead of taking up layout space. Otherwise the
      // right border would push the value 1px left of the values in unflagged rows and of the header label.
      if (comp.strokesIncludedInLayout !== !flag) comp.strokesIncludedInLayout = !flag;

      const keep: SceneNode[] = [];
      for (const [state, f] of Object.entries(CELL_FLAGS)) {
        if (state !== base) continue;
        const icon = await ensureInstance(comp, f.layer, deps.icons.get(f.icon)!, 0);
        setSize(icon, size(kit, "size/12"), size(kit, "size/12"));
        tintIcon(icon, color(kit, f.iconInk));
        keep.push(icon);
      }
      const direction = DIRECTIONS[type];
      if (direction) {
        const icon = await ensureInstance(comp, "Direction icon", deps.icons.get(direction.icon)!, keep.length);
        setSize(icon, size(kit, "size/12"), size(kit, "size/12"));
        // Flagged cells use the -strong ink so the value keeps 4.5:1 on the tinted background.
        tintIcon(icon, color(kit, flag ? `${direction.ink}-strong` : direction.ink));
        keep.push(icon);
      }
      if (type === "text" || numeric) {
        const ink = direction ? (flag ? `${direction.ink}-strong` : direction.ink) : "text/primary";
        const value = await ensureText(kit, comp, "Value", "Value", numeric ? "Numeric" : "Body", ink, keep.length);
        // Truncate text, never numbers: numeric values hug (right-aligned by the cell) and are never cut off.
        // Size numeric columns with numericColumnWidth() so the longest value fits.
        if (numeric) untruncate(value);
        else truncate(value, { fill: true, align: "LEFT" });
        keep.push(value);
      } else {
        const name = type === "chip" ? "Chip" : "Checkbox";
        const main = type === "chip" ? variantOf(deps.chip, { Tone: "neutral" }) : variantOf(deps.checkbox, { Checked: "off", State: "default" });
        const inst = await ensureInstance(comp, name, main, keep.length);
        if (!inst.isExposedInstance) inst.isExposedInstance = true;
        keep.push(inst);
      }
      // Cells sit edge to edge, so the focus ring is drawn inside the cell — and inside the flag border on
      // warning-focus / error-focus, so both stay visible.
      const ring = ensureFocusRing(kit, comp, focused, null, flag ? "inset" : "inside");
      if (ring) keep.push(ring);
      prune(comp, keep);
    },

    wire(set: ComponentSetNode, variants: ComponentNode[]) {
      const valueKey = ensureProp(set, "Value", "TEXT", "Value");
      for (const comp of variants) reference(comp, "Value", "characters", valueKey);
    },
  };
}

// ------------------------------------------------------------ Row

/** Applies one row's values (and selection / warning / error / disabled state) to a cell instance. */
function applyCell(kit: Kit, cell: InstanceNode, col: Column, row: GridRow, data: Dataset, base?: string) {
  const flag = row.error?.includes(col.key) ? "error" : row.warning?.includes(col.key) ? "warning" : undefined;
  const state = flag ?? base ?? (row.selected ? "selected" : "default");
  setProps(cell, { State: state });
  const value = row.values[col.key] ?? "";
  if (col.type === "text" || NUMERIC_TYPES.includes(col.type)) {
    setProps(cell, { Value: value });
    if (data.inkOverrides && (col.type === "text" || col.type === "numeric")) {
      const ink = row.ink?.[col.key] ?? (row.disabled && !flag ? "text/secondary" : "text/primary");
      const text = cell.findOne((n) => n.type === "TEXT" && n.name === "Value") as TextNode | null;
      if (text) bindFill(text, color(kit, ink));
    }
  } else if (col.type === "chip") {
    const chip = cellChip(cell);
    if (chip) setProps(chip, { Tone: data.tones[value] ?? "neutral", Label: value });
  } else {
    const box = nested(cell, "Checkbox");
    if (box) setProps(box, { Checked: row.selected ? "on" : "off", State: row.disabled ? "disabled" : "default" });
  }
}

export interface GridSpecOptions {
  name: string;
  /** Earlier names; an existing component found under one is renamed in place. */
  previousNames?: string[];
  description: string;
  data: Dataset;
}

/** Row component set (default / selected) built from Grid/BodyCell instances, one per column. */
export function rowSpec(kit: Kit, bodyCell: ComponentSetNode, opts: GridSpecOptions): ComponentSetSpec {
  return {
    name: opts.name,
    previousNames: opts.previousNames,
    description: opts.description,
    variants: combos({ State: ["default", "hover", "selected", "selected-hover"] }),
    columnProp: "",

    async build(comp: ComponentNode, p: Props) {
      configureFrame(comp, { direction: "HORIZONTAL" });
      const sample: GridRow = {
        values: opts.data.rows[0].values,
        selected: p.State.startsWith("selected"),
      };
      const cellState = p.State;
      const keep: SceneNode[] = [];
      for (const [i, col] of opts.data.columns.entries()) {
        const main = variantOf(bodyCell, { Type: col.type, State: cellState });
        const cell = await ensureInstance(comp, `Cell/${col.key}`, main, i);
        setSize(cell, widthOf(kit, col.width), density(kit, "row/height"));
        applyCell(kit, cell, col, sample, opts.data, cellState);
        keep.push(cell);
      }
      prune(comp, keep);
    },
  };
}

/**
 * The chip inside a chip cell. Matched as "Chip" or "Chip/…": an instance layer can carry a renamed-layer
 * override (e.g. "Chip/Status"), and a lookup by the exact name
 * would miss it and leave that chip stale. The name is reset to "Chip" so later lookups are exact.
 */
function cellChip(cell: InstanceNode): InstanceNode | undefined {
  const chip = cell.findOne((n) => n.type === "INSTANCE" && (n.name === "Chip" || n.name.startsWith("Chip/"))) as InstanceNode | null;
  if (chip && chip.name !== "Chip") chip.name = "Chip";
  return chip ?? undefined;
}

// ------------------------------------------------------------ Grid

/** True if every chip cell in a row shows its value (label text) with the matching tone variant. */
async function chipsMatch(row: InstanceNode, rowData: GridRow, data: Dataset): Promise<boolean> {
  for (const col of data.columns) {
    if (col.type !== "chip") continue;
    const cell = row.children.find((c) => c.type === "INSTANCE" && c.name === `Cell/${col.key}`) as InstanceNode | undefined;
    if (!cell) continue;
    const chip = cellChip(cell);
    if (!chip) return false; // a chip cell without a findable chip is a mismatch, not a pass
    const value = rowData.values[col.key] ?? "";
    const label = chip.findOne((n) => n.type === "TEXT" && n.name === "Label") as TextNode | null;
    const main = await chip.getMainComponentAsync();
    if (label?.characters !== value || main?.name !== `Tone=${data.tones[value] ?? "neutral"}`) return false;
  }
  return true;
}

/** A grid component: header row plus one row instance per data row, with values applied as overrides. */
export async function buildGrid(
  kit: Kit,
  page: PageNode,
  parent: FrameNode,
  index: number,
  sets: { header: ComponentSetNode; row: ComponentSetNode; checkbox: ComponentSetNode },
  opts: GridSpecOptions
): Promise<ComponentNode> {
  const { data } = opts;
  const comp = ensureComponent(page, parent, index, opts.name, opts.description, opts.previousNames);
  configureFrame(comp, { stroke: color(kit, "border/default") });

  // Header row
  const header = ensureFrame(comp, "Header", { direction: "HORIZONTAL" }, 0);
  const headKeep: SceneNode[] = [];
  for (const [i, col] of data.columns.entries()) {
    if (col.type === "checkbox") {
      const select = ensureFrame(
        header,
        `Head/${col.key}`,
        {
          direction: "HORIZONTAL",
          align: "CENTER",
          justify: "CENTER",
          width: widthOf(kit, col.width),
          height: density(kit, "row/height"),
          fill: color(kit, "surface/background"),
          stroke: color(kit, "border/strong"),
          strokeSides: { bottom: 1 },
        },
        i
      );
      const anySelected = data.rows.some((r) => r.selected);
      const allSelected = data.rows.every((r) => r.selected);
      const value = allSelected ? "on" : anySelected ? "indeterminate" : "off";
      const box = await ensureInstance(select, "Checkbox", variantOf(sets.checkbox, { Checked: value, State: "default" }), 0);
      prune(select, [box]);
      headKeep.push(select);
      continue;
    }
    const align = col.type === "numeric" ? "right" : "left";
    const sort = col.key === data.sortKey ? "asc" : "none";
    const cell = await ensureInstance(header, `Head/${col.key}`, variantOf(sets.header, { Sort: sort, Align: align, State: "default" }), i);
    setSize(cell, widthOf(kit, col.width), density(kit, "row/height"));
    setProps(cell, { Label: col.label });
    headKeep.push(cell);
  }
  prune(header, headKeep);

  // Body rows
  const keep: SceneNode[] = [header];
  for (const [r, rowData] of data.rows.entries()) {
    const name = `Row ${String(r + 1).padStart(2, "0")}`;
    const main = variantOf(sets.row, { State: rowData.selected ? "selected" : "default" });
    const row = await ensureInstance(comp, name, main, r + 1);
    for (const col of data.columns) {
      const cell = row.children.find((c) => c.type === "INSTANCE" && c.name === `Cell/${col.key}`) as InstanceNode | undefined;
      if (cell) applyCell(kit, cell, col, rowData, data);
    }
    // Read the chips back, so a chip that didn't take its value is reported instead of passing silently.
    if (!(await chipsMatch(row, rowData, data))) warn(`${opts.name}: ${name} chips don't match their values`);
    keep.push(row);
  }
  prune(comp, keep);
  return comp;
}

/**
 * Layout problems in a grid, one message each:
 *   • The header row shows at most one sort icon (the sorted column; a grid with no sorted column shows none).
 *   • Right-aligned headers must be flush with their values: the right edge of the header label must match
 *     the right edge of the value in every row.
 *   • A cell's content (value, plus a warning / error icon or gain / loss glyph) must fit inside its column.
 */
export function gridLayoutProblems(grid: ComponentNode, data: Dataset): string[] {
  const problems: string[] = [];
  const header = grid.children.find((c) => c.name === "Header" && c.type === "FRAME") as FrameNode | undefined;
  const rows = grid.children.filter((c): c is InstanceNode => c.type === "INSTANCE");
  if (!header || !rows.length) return [`${grid.name}: no header or rows to compare`];
  const rightEdge = (n: SceneNode | null | undefined) =>
    n?.absoluteBoundingBox ? n.absoluteBoundingBox.x + n.absoluteBoundingBox.width : undefined;
  const textIn = (parent: SceneNode | undefined, name: string) =>
    parent && "findOne" in parent ? (parent.findOne((n) => n.type === "TEXT" && n.name === name) as TextNode | null) : null;
  const sortIcons = header.children.filter((c) => "findOne" in c && c.findOne((n) => n.name === "Sort" && n.visible)).length;
  if (sortIcons > 1) problems.push(`${grid.name}: the header shows ${sortIcons} sort icons; only the sorted column shows one at rest`);
  for (const col of data.columns) {
    if (!NUMERIC_TYPES.includes(col.type)) continue;
    const label = rightEdge(textIn(header.children.find((c) => c.name === `Head/${col.key}`), "Label"));
    for (const row of rows) {
      const cell = row.children.find((c) => c.name === `Cell/${col.key}`) as InstanceNode | undefined;
      const value = rightEdge(textIn(cell, "Value"));
      if (!cell || label === undefined || value === undefined) {
        problems.push(`${grid.name}: "${col.label}" header label or ${row.name} value not found`);
        continue;
      }
      // Only "numeric" columns have a right-aligned header; gain / loss headers are left-aligned.
      if (col.type === "numeric" && Math.abs(label - value) > 0.5) {
        problems.push(`${grid.name} ${row.name}: the "${col.label}" header label ends ${Math.abs(label - value).toFixed(1)}px away from its value`);
      }
      const first = cell.children.find((c) => c.visible && c.name !== "Focus ring");
      if (first && first.x < cell.paddingLeft - 0.5) {
        problems.push(`${grid.name} ${row.name}: "${col.label}" content is ${(cell.paddingLeft - first.x).toFixed(1)}px too wide for its ${Math.round(cell.width)}px column`);
      }
    }
  }
  return problems;
}

// ------------------------------------------------------------ Loading and empty states

/**
 * Grid/Skeleton row: one placeholder bar per column (same widths as the dataset's rows), shown under the
 * header while rows load. Show label puts "Loading rows…" in the widest text column, so loading isn't
 * conveyed by the bars alone; in code, mark the grid aria-busy.
 */
export async function buildSkeletonRow(
  kit: Kit,
  page: PageNode,
  parent: FrameNode,
  index: number,
  data: Dataset
): Promise<ComponentNode> {
  const comp = ensureComponent(
    page, parent, index, "Grid/Skeleton row",
    describe("Grid/Skeleton row")
  );
  configureFrame(comp, { direction: "HORIZONTAL" });
  const labelColumn = data.columns.filter((c) => c.type === "text").sort((a, b) => b.width - a.width)[0]?.key;
  const keep: SceneNode[] = [];
  for (const [i, col] of data.columns.entries()) {
    const numeric = NUMERIC_TYPES.includes(col.type);
    const cell = ensureFrame(
      comp, `Cell/${col.key}`,
      {
        direction: "HORIZONTAL",
        align: "CENTER",
        justify: numeric ? "MAX" : col.type === "checkbox" ? "CENTER" : "MIN",
        gap: space(kit, "space/8"),
        padding: { x: density(kit, "cell/padding-x"), y: density(kit, "cell/padding-y") },
        width: widthOf(kit, col.width),
        height: density(kit, "row/height"),
        fill: color(kit, "surface/panel"),
        stroke: color(kit, "border/default"),
        strokeSides: { bottom: 1 },
      },
      i
    );
    const barWidth = col.type === "checkbox" ? 16 : Math.round((col.width - 24) * (numeric ? 0.6 : 0.5));
    const bar = ensureFrame(
      cell, "Bar",
      {
        width: col.type === "checkbox" ? size(kit, "size/16") : barWidth,
        height: col.type === "checkbox" ? size(kit, "size/16") : size(kit, "size/12"),
        radius: space(kit, "radius/xs"),
        fill: color(kit, "surface/skeleton"),
      },
      0
    );
    const cellKeep: SceneNode[] = [bar];
    if (col.key === labelColumn) {
      const label = await ensureText(kit, cell, "Label", "Loading rows…", "Caption", "text/secondary", 1);
      cellKeep.push(label);
    }
    prune(cell, cellKeep);
    keep.push(cell);
  }
  prune(comp, keep);
  const labelKey = ensureProp(comp, "Label", "TEXT", "Loading rows…");
  const showKey = ensureProp(comp, "Show label", "BOOLEAN", false);
  reference(comp, "Label", "characters", labelKey);
  reference(comp, "Label", "visible", showKey);
  return comp;
}

const EMPTY_TONES: Record<string, { icon: string; ink: string; title: string; message: string; action: string; actionIcon?: string }> = {
  neutral: {
    icon: "search", ink: "text/secondary", title: "No results",
    message: "Nothing matches these filters. Try changing or clearing them.", action: "Clear filters",
  },
  critical: {
    icon: "circle-x", ink: "status/critical", title: "Couldn't load rows",
    message: "Something went wrong while loading. Check your connection and try again.", action: "Retry", actionIcon: "refresh",
  },
};

/** Grid/Empty state: Tone (neutral / critical) — no results / nothing yet, or a load error. */
export function emptyStateSpec(kit: Kit, deps: { icons: IconIndex; button: ComponentSetNode }, width: number): ComponentSetSpec {
  return {
    name: "Grid/Empty state",
    description: describe("Grid/Empty state"),
    variants: combos({ Tone: ["neutral", "critical"] }),
    columnProp: "Tone",

    async build(comp: ComponentNode, p: Props) {
      const t = EMPTY_TONES[p.Tone];
      configureFrame(comp, {
        align: "CENTER",
        gap: space(kit, "space/8"),
        padding: { x: space(kit, "space/24"), y: space(kit, "space/32") },
        width,
        fill: color(kit, "surface/panel"),
      });
      const icon = await ensureInstance(comp, "Icon", deps.icons.get(t.icon)!, 0);
      setSize(icon, size(kit, "size/24"), size(kit, "size/24"));
      tintIcon(icon, color(kit, t.ink));
      const title = await ensureText(kit, comp, "Title", t.title, "Heading", "text/primary", 1);
      const message = await ensureText(kit, comp, "Message", t.message, "Body", "text/secondary", 2);
      if (message.textAlignHorizontal !== "CENTER") message.textAlignHorizontal = "CENTER";
      const actionMain = variantOf(deps.button, { Kind: "secondary", Size: "sm", State: "default" });
      const action = await ensureInstance(comp, "Action", actionMain, 3);
      setProps(action, t.actionIcon
        ? { Label: t.action, "Show icon": true, Icon: deps.icons.get(t.actionIcon)!.id }
        : { Label: t.action, "Show icon": false });
      if (!action.isExposedInstance) action.isExposedInstance = true;
      prune(comp, [icon, title, message, action]);
    },

    wire(set: ComponentSetNode, variants: ComponentNode[]) {
      const showKey = ensureProp(set, "Show action", "BOOLEAN", true);
      for (const comp of variants) reference(comp, "Action", "visible", showKey);
    },
  };
}

// ------------------------------------------------------------ Pagination

export async function buildPagination(
  kit: Kit,
  page: PageNode,
  parent: FrameNode,
  index: number,
  button: ComponentSetNode,
  width: number
): Promise<ComponentNode> {
  const comp = ensureComponent(
    page, parent, index, "Grid/Pagination",
    describe("Grid/Pagination")
  );
  configureFrame(comp, {
    direction: "HORIZONTAL",
    align: "CENTER",
    justify: "SPACE_BETWEEN",
    width,
    padding: { y: space(kit, "space/4") },
  });
  const range = await ensureText(kit, comp, "Range", "Showing 1–5 of 120", "Caption", "text/secondary", 0);
  const nav = ensureFrame(comp, "Nav", { direction: "HORIZONTAL", align: "CENTER", gap: space(kit, "space/8") }, 1);
  const prev = await ensureInstance(nav, "Previous", variantOf(button, { Kind: "ghost", Size: "sm", State: "disabled" }), 0);
  setProps(prev, { Label: "Previous" });
  if (!prev.isExposedInstance) prev.isExposedInstance = true;
  const pageText = await ensureText(kit, nav, "Page", "Page 1 of 24", "Caption", "text/secondary", 1);
  const next = await ensureInstance(nav, "Next", variantOf(button, { Kind: "secondary", Size: "sm", State: "default" }), 2);
  setProps(next, { Label: "Next" });
  if (!next.isExposedInstance) next.isExposedInstance = true;
  prune(nav, [prev, pageText, next]);
  prune(comp, [range, nav]);
  reference(comp, "Range", "characters", ensureProp(comp, "Range", "TEXT", "Showing 1–5 of 120"));
  reference(comp, "Page", "characters", ensureProp(comp, "Page", "TEXT", "Page 1 of 24"));
  return comp;
}

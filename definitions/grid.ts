// Data grid datasets: what a grid's columns and rows are, the placeholder data the library's generic grid
// shows, and the rules for column widths. Plain data and pure functions, shared by the Figma plugin (which
// draws the grid) and the coded Data grid (which renders it).

import type { VariantValue } from "./components";
import type { IconName } from "./icons";

/** The kinds of cell: the Type values of Grid/BodyCell. */
export type CellType = VariantValue<"Grid/BodyCell", "Type">;

/** Cell types whose value is a number: right-aligned, Numeric style, never truncated. */
export const NUMERIC_TYPES: readonly CellType[] = ["numeric", "gain", "loss"];

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
  /** Text color per column key (e.g. muted audit text, warning-colored notes): a Color token name. */
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

/**
 * Numeric column sizing rule: wide enough for the longest formatted value at Numeric 13px with
 * tabular figures (≈7.5px per character) plus the largest cell padding (12px each side, Comfortable),
 * rounded up to a multiple of 8.
 */
export function numericColumnWidth(longestValue: string, opts: { icon?: boolean } = {}): number {
  // A 12px icon plus a 4px gap: the ▲ / ▼ glyph in gain / loss cells, or the warning / error icon in a
  // column whose cells can be flagged.
  return Math.ceil((longestValue.length * 7.5 + 24 + (opts.icon ? 16 : 0)) / 8) * 8;
}

/** What the empty state shows for each tone: its icon and ink (a Color token), and its default copy. */
export interface EmptyStateContent {
  icon: IconName;
  ink: string;
  title: string;
  message: string;
  action: string;
  actionIcon?: IconName;
}

/** Grid/Empty state, by Tone: neutral for no results or nothing yet, critical for a load error. */
export const EMPTY_STATES: Record<VariantValue<"Grid/Empty state", "Tone">, EmptyStateContent> = {
  neutral: {
    icon: "search", ink: "text/secondary", title: "No results",
    message: "Nothing matches these filters. Try changing or clearing them.", action: "Clear filters",
  },
  critical: {
    icon: "circle-x", ink: "status/critical", title: "Couldn't load rows",
    message: "Something went wrong while loading. Check your connection and try again.", action: "Retry", actionIcon: "refresh",
  },
};

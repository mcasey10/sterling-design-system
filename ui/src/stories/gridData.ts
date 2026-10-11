// What the grid stories share: the library's placeholder dataset and a plain sort, standing in for an
// application's data layer.

import { GENERIC_DATA, type GridRow } from "../../../definitions/grid";
import type { GridSort } from "../components/DataGrid";

export const DATA = GENERIC_DATA;
/** The rows the placeholder dataset marks as selected, by id. */
export const INITIALLY_SELECTED = DATA.rows.filter((row) => row.selected).map((row) => row.values.id);
/** The whole result set is larger than the page shown. */
export const MATCHING = 120;

const number = (value: string) => Number(value.replace(/[,%]/g, ""));

export function sortRows(rows: GridRow[], sort: GridSort | undefined): GridRow[] {
  if (!sort) return rows;
  const numeric = DATA.columns.find((column) => column.key === sort.key)?.type === "numeric";
  const order = sort.direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const [x, y] = [a.values[sort.key] ?? "", b.values[sort.key] ?? ""];
    return order * (numeric ? number(x) - number(y) : x.localeCompare(y));
  });
}

// A longer, fictional result set for the paging story: the placeholder rows, then more of the same kind.
const MORE: [string, string, string, string][] = [
  ["Brindle intake review", "475.00", "4.8%", "Active"],
  ["Calloway renewal", "1,980.00", "19.8%", "Pending"],
  ["Dunmore field visit", "320.00", "3.2%", "Draft"],
  ["Evercrest onboarding", "1,105.00", "11.1%", "Active"],
  ["Fennick quarterly audit", "2,640.00", "26.4%", "Flagged"],
  ["Garrow site survey", "58.00", "0.6%", "Draft"],
  ["Hollis migration", "905.00", "9.1%", "Pending"],
];
export const ALL_ROWS: GridRow[] = [
  ...DATA.rows,
  ...MORE.map(([name, amount, percent, status], index) => ({ values: { id: `INV-${20440 + index * 3}`, name, amount, percent, status } })),
];
export const PAGE_SIZE = 5;

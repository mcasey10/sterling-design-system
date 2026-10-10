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

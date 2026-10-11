// Grid/Row and Grid/Data grid. The Data grid is a native table: Tab moves between the header sort buttons
// and the row checkboxes, and screen readers use their own table commands (see ARCHITECTURE.md, "Grids are
// data tables"). It shows the rows, sort, and selection it is given and reports what the person asks for;
// the application owns the data.

import { type HTMLAttributes, type KeyboardEvent, type MouseEvent, type ReactNode, useRef } from "react";
import { type Column, type Dataset, type GridRow, gridWidth, stretches } from "../../../definitions/grid";
import { BodyCell } from "./BodyCell";
import { Checkbox } from "./Checkbox";
import { cx } from "./classes";
import { SkeletonRow } from "./GridStates";
import { HeaderCell } from "./HeaderCell";
import { StatusChip, type StatusChipTone } from "./StatusChip";
import "./GridCells.css";
import "./DataGrid.css";

export type { Column, GridRow };

// ------------------------------------------------------------ Row

export interface RowProps extends HTMLAttributes<HTMLTableRowElement> {
  /** Tints the row's cells. A flagged cell keeps its own look. */
  selected?: boolean;
}

/** One grid row (<tr>) of BodyCells. Hover comes from CSS. */
export function Row({ selected = false, className, children, ...rest }: RowProps) {
  return (
    <tr className={cx("stl-row", selected && "stl-row--selected", className)} {...rest}>
      {children}
    </tr>
  );
}

// ------------------------------------------------------------ Data grid

export interface GridSort {
  /** The key of the sorted column. */
  key: string;
  direction: "asc" | "desc";
}

export interface DataGridProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** The grid's accessible name, e.g. "Invoices". */
  label: string;
  /** The columns, in order. A "checkbox" column turns on row selection. */
  columns: Column[];
  /** The rows to show, already sorted and paged. */
  rows: GridRow[];
  /** For chip cells: the tone of each chip label. */
  tones?: Dataset["tones"];
  /** The column whose value identifies a row. Default: the first identifier column. */
  rowKey?: string;
  /** The ids of the selected rows. */
  selected?: readonly string[];
  /** Called with the new selection when the person selects or clears rows. */
  onSelectedChange?: (selected: string[]) => void;
  sort?: GridSort;
  /** Called when the person asks to sort by a column: ascending first, then descending. */
  onSortChange?: (sort: GridSort) => void;
  /** Columns that can't be sorted, by key. */
  unsortable?: readonly string[];
  /** Fill the available width: descriptive text columns take up the extra. Off: columns keep their widths. */
  fill?: boolean;
  /** Rows are loading: shows placeholder rows (5, or the number given) and marks the grid busy. */
  loading?: boolean | number;
  /** What the first placeholder row and screen readers say while loading. */
  loadingLabel?: string;
  /** Shown in place of the rows when there are none: an EmptyState. */
  empty?: ReactNode;
  /** What screen readers hear when the empty state appears, e.g. "No results". */
  emptyLabel?: string;
}

export function DataGrid({
  label, columns, rows, tones = {}, rowKey, selected = [], onSelectedChange, sort, onSortChange, unsortable = [], fill = false,
  loading = false, loadingLabel = "Loading rows…", empty, emptyLabel = "", className, ...rest
}: DataGridProps) {
  const idKey = rowKey ?? columns.find((column) => column.identifier)?.key ?? columns.find((column) => column.type === "text")?.key ?? "";
  const idOf = (row: GridRow, index: number) => row.values[idKey] ?? String(index);
  const ids = rows.map(idOf);
  const selectable = ids.filter((_, index) => !rows[index].disabled);
  const chosen = selectable.filter((id) => selected.includes(id));

  // Range selection: Shift+click or Shift+Space selects (or clears) every row from the last one changed.
  const anchor = useRef<number | null>(null);
  const shift = useRef(false);
  const toggle = (index: number, on: boolean) => {
    const from = shift.current && anchor.current !== null ? anchor.current : index;
    const [start, end] = from < index ? [from, index] : [index, from];
    const range = ids.slice(start, end + 1).filter((id) => selectable.includes(id));
    const next = on ? [...new Set([...selected, ...range])] : selected.filter((id) => !range.includes(id));
    anchor.current = index;
    onSelectedChange?.(next);
  };
  const toggleAll = (on: boolean) => {
    anchor.current = null;
    onSelectedChange?.(on ? [...new Set([...selected, ...selectable])] : selected.filter((id) => !selectable.includes(id)));
  };
  // Whether Shift is down when a checkbox changes: from the key press, or from a real mouse click. (A click
  // that the browser makes from Space has detail 0 and may not carry the key, so it doesn't overwrite.)
  const noteKey = (event: KeyboardEvent) => {
    shift.current = event.shiftKey;
  };
  const noteClick = (event: MouseEvent) => {
    if (event.detail !== 0) shift.current = event.shiftKey;
  };

  const sortBy = (key: string) => onSortChange?.({ key, direction: sort?.key === key && sort.direction === "asc" ? "desc" : "asc" });
  const width = gridWidth({ columns, rows, tones });
  const placeholders = loading === true ? 5 : loading || 0;
  const isEmpty = !loading && rows.length === 0;

  return (
    <div className={cx("stl-data-grid", fill && "stl-data-grid--fill", className)} {...rest}>
      <table
        aria-label={label}
        aria-busy={loading ? true : undefined}
        className="stl-data-grid__table"
        // At least as wide as its columns; with `fill`, as wide as its container.
        style={{ minWidth: width, width: fill ? "100%" : width }}
        onClickCapture={noteClick}
        onKeyDownCapture={noteKey}
        onKeyUpCapture={noteKey}
      >
        <colgroup>
          {columns.map((column) => (
            // With `fill`, a column that stretches has no width of its own and shares what is left.
            <col key={column.key} style={{ width: fill && stretches(column) ? undefined : column.width }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map((column) =>
              column.type === "checkbox" ? (
                <th key={column.key} scope="col" className="stl-header-cell stl-header-cell--checkbox">
                  <Checkbox
                    label="Select all rows"
                    checked={chosen.length === 0 ? "off" : chosen.length === selectable.length ? "on" : "indeterminate"}
                    disabled={selectable.length === 0}
                    onCheckedChange={(checked) => toggleAll(checked === "on")}
                  />
                </th>
              ) : (
                <HeaderCell
                  key={column.key}
                  label={column.label}
                  align={column.type === "numeric" ? "right" : "left"}
                  sort={sort?.key === column.key ? sort.direction : "none"}
                  showSort={!unsortable.includes(column.key)}
                  onSort={() => sortBy(column.key)}
                />
              )
            )}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: placeholders }, (_, index) => (
            <SkeletonRow key={index} columns={columns} label={loadingLabel} showLabel={index === 0} />
          ))}
          {isEmpty && empty && (
            <tr>
              <td colSpan={columns.length} className="stl-data-grid__empty">
                {empty}
              </td>
            </tr>
          )}
          {!loading && rows.map((row, index) => {
            const id = ids[index];
            const isSelected = selected.includes(id);
            return (
              <Row key={id} selected={isSelected} className={row.disabled ? "stl-row--disabled" : undefined}>
                {columns.map((column) => {
                  const value = row.values[column.key] ?? "";
                  const validation = row.error?.includes(column.key) ? "error" : row.warning?.includes(column.key) ? "warning" : undefined;
                  if (column.type === "checkbox") {
                    return (
                      <BodyCell key={column.key} type="checkbox" validation={validation}>
                        <Checkbox
                          label={`Select ${id}`}
                          checked={isSelected ? "on" : "off"}
                          disabled={row.disabled}
                          onCheckedChange={(checked) => toggle(index, checked === "on")}
                        />
                      </BodyCell>
                    );
                  }
                  if (column.type === "chip") {
                    return (
                      <BodyCell key={column.key} type="chip" validation={validation}>
                        <StatusChip tone={(tones[value] ?? "neutral") as StatusChipTone} label={value} />
                      </BodyCell>
                    );
                  }
                  return <BodyCell key={column.key} type={column.type} value={value} validation={validation} />;
                })}
              </Row>
            );
          })}
        </tbody>
      </table>
      {/* Always in the page, so a change of state is announced: loading, then nothing, or why the grid is empty. */}
      <div role="status" className="stl-data-grid__status">
        {loading ? loadingLabel : isEmpty ? emptyLabel : ""}
      </div>
    </div>
  );
}

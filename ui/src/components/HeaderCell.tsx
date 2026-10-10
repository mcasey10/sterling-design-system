// Grid/HeaderCell: a column header (<th>), with optional sorting and left or right alignment. Hover and
// focus come from CSS. A right-aligned label stays flush with the numbers below it, and the sort icon sits
// immediately beside the label at any column width; when the column is narrow, the label truncates.

import type { ThHTMLAttributes } from "react";
import type { VariantValue } from "../../../definitions/components";
import { textClass } from "../tokens";
import { cx } from "./classes";
import { Icon, type IconName } from "./Icon";
import "./GridCells.css";

export type HeaderCellSort = VariantValue<"Grid/HeaderCell", "Sort">;
export type HeaderCellAlign = VariantValue<"Grid/HeaderCell", "Align">;

const SORT_ICONS: Record<HeaderCellSort, IconName> = { none: "sort", asc: "arrow-up", desc: "arrow-down" };
const ARIA_SORT = { none: "none", asc: "ascending", desc: "descending" } as const;

export interface HeaderCellProps extends Omit<ThHTMLAttributes<HTMLTableCellElement>, "children" | "align"> {
  label: string;
  /** How the column is sorted. Only one column in a grid should be "asc" or "desc". */
  sort?: HeaderCellSort;
  /** Use "right" for numeric columns, so the label lines up with the numbers. */
  align?: HeaderCellAlign;
  /** Whether the column can be sorted. Off: no sort icon, and the header isn't a button. */
  showSort?: boolean;
  /** Called when the person asks to sort by this column (click, Enter, or Space). */
  onSort?: () => void;
}

export function HeaderCell({ label, sort = "none", align = "left", showSort = true, onSort, className, ...rest }: HeaderCellProps) {
  const text = <span className="stl-header-cell__label">{label}</span>;
  const content = cx("stl-header-cell__content", textClass("Label"));
  return (
    <th
      scope="col"
      aria-sort={showSort ? ARIA_SORT[sort] : undefined}
      className={cx(
        "stl-header-cell",
        `stl-header-cell--${align}`,
        sort !== "none" && "stl-header-cell--sorted",
        showSort && "stl-header-cell--sortable",
        className
      )}
      {...rest}
    >
      {showSort ? (
        // The icon is always there, hidden while the column is unsorted and at rest, so nothing shifts on
        // hover. It comes before a right-aligned label, which keeps the label flush with the numbers.
        <button type="button" className={content} onClick={onSort}>
          {align === "right" && <Icon name={SORT_ICONS[sort]} />}
          {text}
          {align === "left" && <Icon name={SORT_ICONS[sort]} />}
        </button>
      ) : (
        <span className={content}>{text}</span>
      )}
    </th>
  );
}

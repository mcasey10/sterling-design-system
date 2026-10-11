// Grid/BulkActionBar: the selection count and the actions for the selected rows, shown above a grid while
// rows are selected. The actions are `children` (Buttons); in Figma they are exposed button instances.
//
// Render the bar all the time and give it an empty `count` while nothing is selected: it then shows nothing,
// but its status region stays in the page, so a screen reader announces the first selection as reliably as
// every later one.

import { type HTMLAttributes, type ReactNode, useId, useRef } from "react";
import { textClass } from "../tokens";
import { cx } from "./classes";
import "./DataGrid.css";

export interface BulkActionBarProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /**
   * How many rows are selected, e.g. "2 selected". Announced to screen readers when it changes. Pass an empty
   * string while nothing is selected: the bar is then hidden.
   */
  count: string;
  /** The offer to select every matching row, e.g. "Select all 120 matching". */
  selectAll?: string;
  /** Turn off once every matching row is selected. */
  showSelectAll?: boolean;
  onSelectAll?: () => void;
  /** Why an action is disabled, e.g. "No eligible items selected". */
  hint?: string;
  showHint?: boolean;
  /**
   * An id for the hint, so the disabled action it explains can point to it:
   * `<Button disabled aria-describedby={hintId} />`.
   */
  hintId?: string;
  /** The actions: Buttons, with the main one last. Start with one that clears the selection. */
  children: ReactNode;
}

export function BulkActionBar({
  count, selectAll, showSelectAll = true, onSelectAll, hint, showHint = false, hintId, children, className, ...rest
}: BulkActionBarProps) {
  const generated = useId();
  const status = useRef<HTMLSpanElement>(null);
  const active = count !== "";
  // Choosing "Select all N matching" usually removes that button. Focus moves to the count, which now says
  // what is selected, instead of being lost.
  const chooseAll = () => {
    onSelectAll?.();
    status.current?.focus();
  };
  return (
    <div
      role={active ? "group" : undefined}
      aria-label={active ? "Bulk actions" : undefined}
      className={cx("stl-bulk-bar", !active && "stl-bulk-bar--empty", className)}
      {...rest}
    >
      <div className="stl-bulk-bar__selection">
        {/* Always in the page, even when empty, so its first text is announced like any later change. */}
        <span ref={status} role="status" tabIndex={-1} className={cx("stl-bulk-bar__count", textClass("Body-strong"))}>
          {count}
        </span>
        {active && showSelectAll && selectAll && (
          <>
            <span className={cx("stl-bulk-bar__separator", textClass("Body"))} aria-hidden="true">
              ·
            </span>
            <button type="button" className={cx("stl-bulk-bar__select-all", textClass("Body-link"))} onClick={chooseAll}>
              {selectAll}
            </button>
          </>
        )}
      </div>
      {active && (
        <div className="stl-bulk-bar__actions">
          {showHint && hint && (
            <span id={hintId ?? generated} className={cx("stl-bulk-bar__hint", textClass("Caption"))}>
              {hint}
            </span>
          )}
          {children}
        </div>
      )}
    </div>
  );
}

// Grid/BulkActionBar: the selection count and the actions for the selected rows, shown above a grid while
// rows are selected. The actions are `children` (Buttons); in Figma they are exposed button instances.

import { type HTMLAttributes, type ReactNode, useId, useRef } from "react";
import { textClass } from "../tokens";
import { cx } from "./classes";
import { Icon } from "./Icon";
import "./Checkbox.css";
import "./DataGrid.css";

export interface BulkActionBarProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** How many rows are selected, e.g. "2 selected". Announced to screen readers when it changes. */
  count: string;
  /** The offer to select every matching row, e.g. "Select all 120 matching". */
  selectAll?: string;
  /** Turn off once every matching row is selected. */
  showSelectAll?: boolean;
  onSelectAll?: () => void;
  /** Why an action is disabled, e.g. "No eligible items selected". */
  hint?: string;
  showHint?: boolean;
  /** Every matching row is selected: the mark beside the count shows a check instead of a dash. */
  allSelected?: boolean;
  /**
   * An id for the hint, so the disabled action it explains can point to it:
   * `<Button disabled aria-describedby={hintId} />`.
   */
  hintId?: string;
  /** The actions: Buttons, with the main one last. Start with one that clears the selection. */
  children: ReactNode;
}

export function BulkActionBar({
  count, selectAll, showSelectAll = true, onSelectAll, hint, showHint = false, allSelected = false, hintId, children, className, ...rest
}: BulkActionBarProps) {
  const generated = useId();
  const status = useRef<HTMLSpanElement>(null);
  // Choosing "Select all N matching" usually removes that button. Focus moves to the count, which now says
  // what is selected, instead of being lost.
  const chooseAll = () => {
    onSelectAll?.();
    status.current?.focus();
  };
  return (
    <div role="group" aria-label="Bulk actions" className={cx("stl-bulk-bar", className)} {...rest}>
      <div className="stl-bulk-bar__selection">
        {/* A picture of the selection, not a control: the count beside it says the same thing in words. */}
        <span className={cx("stl-checkbox", allSelected ? "stl-checkbox--on" : "stl-checkbox--indeterminate")} aria-hidden="true">
          <span className="stl-checkbox__box">
            <Icon name={allSelected ? "check" : "minus"} />
          </span>
        </span>
        <span ref={status} role="status" tabIndex={-1} className={cx("stl-bulk-bar__count", textClass("Body-strong"))}>
          {count}
        </span>
        {showSelectAll && selectAll && (
          <>
            <span className={cx("stl-bulk-bar__separator", textClass("Body"))} aria-hidden="true">
              ·
            </span>
            <button type="button" className={cx("stl-bulk-bar__select-all", textClass("Body"))} onClick={chooseAll}>
              {selectAll}
            </button>
          </>
        )}
      </div>
      <div className="stl-bulk-bar__actions">
        {showHint && hint && (
          <span id={hintId ?? generated} className={cx("stl-bulk-bar__hint", textClass("Caption"))}>
            {hint}
          </span>
        )}
        {children}
      </div>
    </div>
  );
}

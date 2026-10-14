// Grid/BodyCell: one grid cell (<td>) for text, a number, a gain or loss, a chip, or a checkbox. Hover and
// focus come from CSS; `selected` and `validation` are props. Numbers are right-aligned in tabular figures
// and never truncate; text truncates. Warning and error add a border and an icon, never color alone, and
// `description` gives screen readers the reason with the value.

import type { ReactNode, TdHTMLAttributes } from "react";
import type { VariantValue } from "../../../definitions/components";
import { TONE_ICONS } from "../../../definitions/icons";
import { textClass } from "../tokens";
import { cx } from "./classes";
import { Icon, type IconName } from "./Icon";
import type { Validation } from "./TextInput";
import "./GridCells.css";

export type BodyCellType = VariantValue<"Grid/BodyCell", "Type">;

/** The flag icon and its accessible name for each validation state: the same icons as the status tones. */
const FLAGS = {
  error: { icon: TONE_ICONS.critical, name: "Error" },
  warning: { icon: TONE_ICONS.warning, name: "Warning" },
} as const;

/** Gain and loss add a ▲ / ▼ glyph beside the signed value, so direction never relies on color alone. */
const DIRECTIONS: Partial<Record<BodyCellType, IconName>> = { gain: "caret-up", loss: "caret-down" };

export interface BodyCellProps extends Omit<TdHTMLAttributes<HTMLTableCellElement>, "children"> {
  type?: BodyCellType;
  /** The text or number to show. For gain and loss, include the sign: "+1.25%", "−0.80%". */
  value?: string;
  /** The cell's row is selected. */
  selected?: boolean;
  /** Flags the value with a border and an icon. */
  validation?: Validation;
  /**
   * What a screen reader hears after the value: for a flagged cell, why it is flagged ("LTV 93.0% — above
   * 90%"). Hidden on screen, so show the reason there too, in a neighboring column.
   */
  description?: string;
  /** For type "chip" or "checkbox": the StatusChip or Checkbox to show. */
  children?: ReactNode;
}

export function BodyCell({ type = "text", value, selected = false, validation, description, children, className, ...rest }: BodyCellProps) {
  const numeric = type === "numeric" || type === "gain" || type === "loss";
  const direction = DIRECTIONS[type];
  return (
    <td
      className={cx(
        "stl-body-cell",
        `stl-body-cell--${type}`,
        selected && "stl-body-cell--selected",
        validation && `stl-body-cell--${validation}`,
        className
      )}
      {...rest}
    >
      <div className="stl-body-cell__content">
        {validation && <Icon name={FLAGS[validation].icon} label={FLAGS[validation].name} className="stl-body-cell__flag" />}
        {direction && <Icon name={direction} />}
        {type === "chip" || type === "checkbox" ? (
          children
        ) : (
          <span className={cx("stl-body-cell__value", textClass(numeric ? "Numeric" : "Body"))}>{value}</span>
        )}
        {/* The comma keeps the value and the reason apart when they are read together. */}
        {description && <span className="stl-body-cell__description">{`, ${description}`}</span>}
      </div>
    </td>
  );
}

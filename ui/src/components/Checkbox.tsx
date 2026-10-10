// Controls/Checkbox: off, on, or indeterminate, with an optional visible label. Hover and focus come from
// CSS, and disabled is the native attribute. The label is always the accessible name, shown or not.

import type { ChangeEvent, InputHTMLAttributes } from "react";
import type { VariantValue } from "../../../definitions/components";
import { textClass } from "../tokens";
import { cx } from "./classes";
import { Icon } from "./Icon";
import "./Checkbox.css";

export type CheckboxChecked = VariantValue<"Controls/Checkbox", "Checked">;

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "checked" | "type" | "children" | "aria-label"> {
  /** The accessible name. Shown beside the box when showLabel is on. */
  label: string;
  /** Off by default: in a grid row, the row itself labels the checkbox. Turn it on outside a grid. */
  showLabel?: boolean;
  checked?: CheckboxChecked;
  /** Called with the value the user chose. Choosing an indeterminate checkbox turns it on. */
  onCheckedChange?: (checked: "on" | "off") => void;
}

export function Checkbox({ label, showLabel = false, checked = "off", onCheckedChange, onChange, className, ...rest }: CheckboxProps) {
  const change = (event: ChangeEvent<HTMLInputElement>) => {
    onChange?.(event);
    onCheckedChange?.(event.target.checked ? "on" : "off");
  };
  return (
    <label className={cx("stl-checkbox", `stl-checkbox--${checked}`, textClass("Body"), className)}>
      <input
        type="checkbox"
        className="stl-checkbox__input"
        checked={checked === "on"}
        // Indeterminate exists only as a DOM property; browsers report it to assistive technology as "mixed".
        ref={(input) => {
          if (input) input.indeterminate = checked === "indeterminate";
        }}
        aria-label={showLabel ? undefined : label}
        onChange={change}
        {...rest}
      />
      <span className="stl-checkbox__box">{checked !== "off" && <Icon name={checked === "on" ? "check" : "minus"} />}</span>
      {showLabel && <span className="stl-checkbox__label">{label}</span>}
    </label>
  );
}

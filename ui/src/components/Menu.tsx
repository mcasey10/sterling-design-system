// Input/Menu and Input/Option: the open list of a select and one row in it. Both are presentational: the
// Select gives them their keyboard behavior (React Aria). Hover comes from CSS; `selected` and `disabled`
// are props.

import { type HTMLAttributes, type LiHTMLAttributes, forwardRef } from "react";
import { textClass } from "../tokens";
import { cx } from "./classes";
import { Icon } from "./Icon";
import "./Menu.css";

export interface OptionProps extends Omit<LiHTMLAttributes<HTMLLIElement>, "children"> {
  label: string;
  /** Adds a check icon and stronger text, so selection is never shown by the tint alone. */
  selected?: boolean;
  disabled?: boolean;
}

export const Option = forwardRef<HTMLLIElement, OptionProps>(function Option(
  { label, selected = false, disabled = false, className, ...rest },
  ref
) {
  return (
    <li
      ref={ref}
      role="option"
      aria-selected={selected}
      aria-disabled={disabled || undefined}
      className={cx("stl-option", selected && "stl-option--selected", disabled && "stl-option--disabled", className)}
      {...rest}
    >
      <span className={cx("stl-option__label", textClass(selected ? "Body-strong" : "Body"))}>{label}</span>
      {selected && <Icon name="check" />}
    </li>
  );
});

export type MenuProps = HTMLAttributes<HTMLUListElement>;

/** The raised panel that holds Options. Give it an accessible name (aria-label or aria-labelledby). */
export const Menu = forwardRef<HTMLUListElement, MenuProps>(function Menu({ className, children, ...rest }, ref) {
  return (
    <ul ref={ref} role="listbox" className={cx("stl-menu", className)} {...rest}>
      {children}
    </ul>
  );
});

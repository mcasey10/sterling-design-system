// Input/Menu and Input/Option: the open list of a select and one row in it. Both are presentational: the
// Select gives them their keyboard behavior (React Aria). Hover comes from CSS; `selected` and `disabled`
// are props.

import { type HTMLAttributes, type LiHTMLAttributes, type ReactNode, forwardRef, useId } from "react";
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

export interface OptionWithDescriptionProps extends OptionProps {
  /** A muted second line, e.g. a saved view's filters. */
  description: string;
}

/** Input/Option with description: a two-line menu row. Both lines truncate. */
export const OptionWithDescription = forwardRef<HTMLLIElement, OptionWithDescriptionProps>(function OptionWithDescription(
  { label, description, selected = false, disabled = false, className, ...rest },
  ref
) {
  return (
    <li
      ref={ref}
      role="option"
      aria-selected={selected}
      aria-disabled={disabled || undefined}
      className={cx("stl-option", "stl-option--described", selected && "stl-option--selected", disabled && "stl-option--disabled", className)}
      {...rest}
    >
      <span className="stl-option__text">
        <span className={cx("stl-option__label", textClass(selected ? "Body-strong" : "Body"))}>{label}</span>
        <span className={cx("stl-option__description", textClass("Caption"))}>{description}</span>
      </span>
      {selected && <Icon name="check" />}
    </li>
  );
});

export interface MenuHeadingProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  label: string;
}

/** Input/Menu heading: the name of a group of options. Not interactive. Use it through MenuGroup. */
export function MenuHeading({ label, className, ...rest }: MenuHeadingProps) {
  return (
    <div role="presentation" className={cx("stl-menu-heading", textClass("Label"), className)} {...rest}>
      {label}
    </div>
  );
}

export interface MenuGroupProps {
  /** The group's heading, which also names the group for screen readers. */
  label: string;
  /** The group's Options. */
  children: ReactNode;
}

/**
 * A named group of options inside a Menu: a MenuHeading and the options under it. It has no Figma component:
 * in Figma a heading and its options are placed one after another.
 */
export function MenuGroup({ label, children }: MenuGroupProps) {
  const id = useId();
  return (
    // The list item is only a container; the group inside it is what the listbox owns.
    <li role="presentation" className="stl-menu-group">
      <div role="group" aria-labelledby={id}>
        <MenuHeading id={id} label={label} />
        <ul role="none" className="stl-menu-group__options">
          {children}
        </ul>
      </div>
    </li>
  );
}

export type MenuProps = HTMLAttributes<HTMLUListElement>;

/** The raised panel that holds Options. Give it an accessible name (aria-label or aria-labelledby). */
export const Menu = forwardRef<HTMLUListElement, MenuProps>(function Menu({ className, children, ...rest }, ref) {
  return (
    <ul ref={ref} role="listbox" className={cx("stl-menu", className)} {...rest}>
      {children}
    </ul>
  );
});

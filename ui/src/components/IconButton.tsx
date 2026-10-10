// Controls/Icon button: a square, icon-only button. The label is never shown in the button; it is the
// accessible name and the tooltip.
// Hover, pressed, and focus come from CSS, and disabled is the native attribute.

import type { ButtonHTMLAttributes } from "react";
import type { VariantValue } from "../../../definitions/components";
import { cx } from "./classes";
import { Icon, type IconName } from "./Icon";
import "./IconButton.css";

export type IconButtonKind = VariantValue<"Controls/Icon button", "Kind">;
export type IconButtonSize = VariantValue<"Controls/Icon button", "Size">;

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "aria-label"> {
  /** The accessible name and tooltip, e.g. "More actions". Required: an icon alone doesn't name the action. */
  label: string;
  kind?: IconButtonKind;
  size?: IconButtonSize;
  icon?: IconName;
}

export function IconButton({ label, kind = "secondary", size = "sm", icon = "more", className, type = "button", ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cx("stl-icon-button", `stl-icon-button--${kind}`, `stl-icon-button--${size}`, className)}
      {...rest}
    >
      <Icon name={icon} />
    </button>
  );
}

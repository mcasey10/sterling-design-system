// Controls/Button: triggers an action. Kind and Size are props; hover, pressed, and focus come from CSS,
// and disabled is the native attribute. Danger uses status/critical, never finance/sell.

import type { ButtonHTMLAttributes } from "react";
import type { VariantValue } from "../../../definitions/components";
import { textClass } from "../tokens";
import { cx } from "./classes";
import { Icon, type IconName } from "./Icon";
import "./Button.css";

export type ButtonKind = VariantValue<"Controls/Button", "Kind">;
export type ButtonSize = VariantValue<"Controls/Button", "Size">;

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  label: string;
  kind?: ButtonKind;
  size?: ButtonSize;
  /** Shows the icon before the label. The icon is decorative: the label names the action. */
  showIcon?: boolean;
  icon?: IconName;
}

export function Button({
  label, kind = "primary", size = "sm", showIcon = false, icon = "plus", className, type = "button", ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx("stl-button", `stl-button--${kind}`, `stl-button--${size}`, textClass(size === "md" ? "Body-strong" : "Label"), className)}
      {...rest}
    >
      {showIcon && <Icon name={icon} />}
      {label}
    </button>
  );
}

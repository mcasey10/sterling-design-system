// Controls/Link: an inline text link, always underlined. Hover and focus come from CSS.

import type { AnchorHTMLAttributes } from "react";
import type { VariantValue } from "../../../definitions/components";
import { textClass } from "../tokens";
import { cx } from "./classes";
import "./Link.css";

export type LinkSize = VariantValue<"Controls/Link", "Size">;

export interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children"> {
  label: string;
  size?: LinkSize;
}

export function Link({ label, size = "sm", className, ...rest }: LinkProps) {
  return (
    <a className={cx("stl-link", textClass(size === "md" ? "Body" : "Label"), className)} {...rest}>
      {label}
    </a>
  );
}

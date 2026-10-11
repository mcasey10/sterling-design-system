// Chip/Side and Chip/Filter. (Chip/Status is in StatusChip.tsx.)

import type { ButtonHTMLAttributes, HTMLAttributes } from "react";
import type { VariantValue } from "../../../definitions/components";
import { textClass } from "../tokens";
import { cx } from "./classes";
import { Icon } from "./Icon";
import "./Chips.css";

// ------------------------------------------------------------ Side chip

export type SideChipSide = VariantValue<"Chip/Side", "Side">;

const SIDE_LABELS: Record<SideChipSide, string> = { buy: "Buy", sell: "Sell" };

export interface SideChipProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  side?: SideChipSide;
  /** Default: "Buy" or "Sell". Use "B" / "S" in tight columns. The label carries the meaning, not the color. */
  label?: string;
}

/** The buy or sell side of an order or trade. Buy and Sell hues stay distinct from Gain and Loss. */
export function SideChip({ side = "buy", label, className, ...rest }: SideChipProps) {
  return (
    <span className={cx("stl-side-chip", `stl-side-chip--${side}`, textClass("Label"), className)} {...rest}>
      {label ?? SIDE_LABELS[side]}
    </span>
  );
}

// ------------------------------------------------------------ Filter chip

export interface FilterChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** The applied filter, e.g. "Status is Open". */
  label: string;
  /** Whether the filter can be removed. On: the chip is a button that removes it. Off: the chip is text. */
  showRemove?: boolean;
  onRemove?: () => void;
}

/**
 * One applied filter. With Show remove on, the whole chip is the button that removes the filter (hover,
 * pressed, and focus come from CSS); its accessible name says so and includes the visible label.
 */
export function FilterChip({ label, showRemove = true, onRemove, className, type = "button", ...rest }: FilterChipProps) {
  const text = <span className="stl-filter-chip__label">{label}</span>;
  if (!showRemove) {
    return <span className={cx("stl-filter-chip", textClass("Label"), className)}>{text}</span>;
  }
  return (
    <button
      type={type}
      className={cx("stl-filter-chip", "stl-filter-chip--removable", textClass("Label"), className)}
      aria-label={`Remove filter: ${label}`}
      onClick={onRemove}
      {...rest}
    >
      {text}
      <Icon name="x" />
    </button>
  );
}

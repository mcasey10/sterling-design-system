// Chip/Status: a record's status as a tone color, a tone-specific icon, and a short label. The icon is
// decorative in code: the label says the status.

import type { HTMLAttributes } from "react";
import type { VariantValue } from "../../../definitions/components";
import { TONE_ICONS } from "../../../definitions/icons";
import { textClass } from "../tokens";
import { cx } from "./classes";
import { Icon } from "./Icon";
import "./StatusChip.css";

export type StatusChipTone = VariantValue<"Chip/Status", "Tone">;

export interface StatusChipProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  label: string;
  tone?: StatusChipTone;
  showIcon?: boolean;
}

export function StatusChip({ label, tone = "positive", showIcon = true, className, ...rest }: StatusChipProps) {
  return (
    <span className={cx("stl-status-chip", `stl-status-chip--${tone}`, textClass("Label"), className)} {...rest}>
      {showIcon && <Icon name={TONE_ICONS[tone]} />}
      <span className="stl-status-chip__label">{label}</span>
    </span>
  );
}

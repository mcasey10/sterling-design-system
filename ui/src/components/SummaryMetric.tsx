// Summary/Summary metric: one headline number, with an optional progress bar against a target. Status is a
// condition of the data (normal or over target); `loading` is the component's state. The label truncates;
// the value never does, so use compact notation ($12.35B) and put the full value in the detail.

import type { HTMLAttributes } from "react";
import type { VariantValue } from "../../../definitions/components";
import { textClass } from "../tokens";
import { cx } from "./classes";
import { Icon } from "./Icon";
import "./SummaryMetric.css";

export type SummaryMetricStatus = VariantValue<"Summary/Summary metric", "Status">;

export interface SummaryMetricProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  label: string;
  /** The headline value, already formatted, e.g. "1,234" or "$12.35B". Never truncated. */
  value?: string;
  /** A line under the progress bar, e.g. "75% of target". Wraps if it is long. */
  detail?: string;
  /** "over-target" adds a warning icon and warning-colored text and bar: never the color alone. */
  status?: SummaryMetricStatus;
  /** The value isn't known yet: shows a placeholder bar and "Loading…". Looks the same for both statuses. */
  loading?: boolean;
  showProgress?: boolean;
  /** Progress toward the target, from 0 to 1. Above 1 fills the bar. */
  progress?: number;
}

export function SummaryMetric({
  label, value, detail, status = "normal", loading = false, showProgress = true, progress = 0, className, ...rest
}: SummaryMetricProps) {
  // While loading, the status isn't known either.
  const over = status === "over-target" && !loading;
  const percent = Math.round(Math.min(Math.max(progress, 0), 1) * 100);
  return (
    <div className={cx("stl-summary-metric", over && "stl-summary-metric--over-target", className)} aria-busy={loading || undefined} {...rest}>
      <span className={cx("stl-summary-metric__label", textClass("Label"))}>{label}</span>
      {loading ? (
        <span className="stl-summary-metric__skeleton" />
      ) : (
        <span className={cx("stl-summary-metric__value", textClass("Title"))}>{value}</span>
      )}
      {showProgress && !loading && (
        <div
          className="stl-summary-metric__track"
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-valuetext={detail}
        >
          <div className="stl-summary-metric__bar" style={{ width: `${percent}%` }} />
        </div>
      )}
      <div className={cx("stl-summary-metric__detail", textClass("Caption"))}>
        {over && <Icon name="alert-triangle" />}
        <span>{loading ? "Loading…" : detail}</span>
      </div>
    </div>
  );
}

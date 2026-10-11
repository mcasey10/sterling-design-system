// Grid/Pagination, Grid/Skeleton row, and Grid/Empty state: what sits under a grid, and what takes the place
// of its rows while they load or when there are none.

import { type HTMLAttributes, useEffect, useRef } from "react";
import type { VariantValue } from "../../../definitions/components";
import { type Column, EMPTY_STATES, NUMERIC_TYPES } from "../../../definitions/grid";
import { textClass } from "../tokens";
import { Button } from "./Button";
import { cx } from "./classes";
import { Icon } from "./Icon";
import "./GridCells.css";
import "./GridStates.css";

// ------------------------------------------------------------ Pagination

export interface PaginationProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** Which rows are showing, e.g. "Showing 1–5 of 120". Announced to screen readers when it changes. */
  range: string;
  /** Which page is showing, e.g. "Page 1 of 24". */
  page: string;
  onPrevious?: () => void;
  onNext?: () => void;
  /** On the first page. */
  previousDisabled?: boolean;
  /** On the last page. */
  nextDisabled?: boolean;
}

export function Pagination({ range, page, onPrevious, onNext, previousDisabled = false, nextDisabled = false, className, ...rest }: PaginationProps) {
  const previous = useRef<HTMLButtonElement>(null);
  const next = useRef<HTMLButtonElement>(null);
  const last = useRef<"previous" | "next" | null>(null);
  // Reaching the first or last page disables the button that was just used. Focus moves to the other one
  // instead of being lost.
  useEffect(() => {
    if (last.current === "previous" && previousDisabled) next.current?.focus();
    if (last.current === "next" && nextDisabled) previous.current?.focus();
  }, [previousDisabled, nextDisabled]);
  return (
    <nav aria-label="Pagination" className={cx("stl-pagination", className)} {...rest}>
      <span role="status" className={cx("stl-pagination__text", textClass("Caption"))}>
        {range}
      </span>
      <div className="stl-pagination__nav">
        <Button
          ref={previous}
          kind="ghost"
          label="Previous"
          disabled={previousDisabled}
          onClick={() => {
            last.current = "previous";
            onPrevious?.();
          }}
        />
        <span className={cx("stl-pagination__text", textClass("Caption"))}>{page}</span>
        <Button
          ref={next}
          kind="secondary"
          label="Next"
          disabled={nextDisabled}
          onClick={() => {
            last.current = "next";
            onNext?.();
          }}
        />
      </div>
    </nav>
  );
}

// ------------------------------------------------------------ Skeleton row

export interface SkeletonRowProps extends Omit<HTMLAttributes<HTMLTableRowElement>, "children"> {
  /** The grid's columns: the row draws one placeholder bar per column. */
  columns: Column[];
  /** Shown beside the bar in the widest text column, so loading isn't conveyed by the bars alone. */
  label?: string;
  /** Turn on for the first skeleton row. */
  showLabel?: boolean;
}

/**
 * A placeholder row (<tr>) shown under the header while rows load. It is hidden from assistive technology:
 * the grid says it is loading (aria-busy and a status message), which Data grid's `loading` prop does.
 */
export function SkeletonRow({ columns, label = "Loading rows…", showLabel = false, className, ...rest }: SkeletonRowProps) {
  const labelColumn = [...columns].filter((column) => column.type === "text").sort((a, b) => b.width - a.width)[0]?.key;
  return (
    <tr className={cx("stl-skeleton-row", className)} aria-hidden="true" {...rest}>
      {columns.map((column) => (
        <td
          key={column.key}
          className={cx(
            "stl-body-cell",
            "stl-skeleton-row__cell",
            NUMERIC_TYPES.includes(column.type) && "stl-skeleton-row__cell--numeric",
            column.type === "checkbox" && "stl-skeleton-row__cell--checkbox"
          )}
        >
          <div className="stl-skeleton-row__content">
            <span className="stl-skeleton-row__bar" />
            {showLabel && column.key === labelColumn && <span className={cx("stl-skeleton-row__label", textClass("Caption"))}>{label}</span>}
          </div>
        </td>
      ))}
    </tr>
  );
}

// ------------------------------------------------------------ Empty state

export type EmptyStateTone = VariantValue<"Grid/Empty state", "Tone">;

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "title"> {
  /** "neutral" for no results or nothing yet; "critical" when loading failed. */
  tone?: EmptyStateTone;
  /** Default: "No results", or "Couldn't load rows" for the critical tone. */
  title?: string;
  /** Say what happened and what to do next. */
  message?: string;
  showAction?: boolean;
  /** Default: "Clear filters", or "Retry" for the critical tone. */
  actionLabel?: string;
  onAction?: () => void;
}

/** Takes the place of a grid's rows when there are none to show. The icon and title say why, not only the color. */
export function EmptyState({ tone = "neutral", title, message, showAction = true, actionLabel, onAction, className, ...rest }: EmptyStateProps) {
  const content = EMPTY_STATES[tone];
  return (
    <div className={cx("stl-empty-state", `stl-empty-state--${tone}`, className)} {...rest}>
      <Icon name={content.icon} />
      <p className={cx("stl-empty-state__title", textClass("Heading"))}>{title ?? content.title}</p>
      <p className={cx("stl-empty-state__message", textClass("Body"))}>{message ?? content.message}</p>
      {showAction && (
        <Button kind="secondary" label={actionLabel ?? content.action} showIcon={!!content.actionIcon} icon={content.actionIcon} onClick={onAction} />
      )}
    </div>
  );
}

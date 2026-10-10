// Tabs/Tab: one tab, with an optional count. `selected` is a prop; hover and focus come from CSS, and
// disabled is the native attribute. Tabs go inside a TabList, which gives them their role and arrow keys.

import type { ButtonHTMLAttributes, HTMLAttributes, KeyboardEvent } from "react";
import { textClass } from "../tokens";
import { cx } from "./classes";
import "./Tab.css";

export interface TabProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  label: string;
  count?: string;
  showCount?: boolean;
  selected?: boolean;
}

export function Tab({ label, count = "0", showCount = true, selected = false, className, type = "button", ...rest }: TabProps) {
  return (
    <button
      type={type}
      role="tab"
      aria-selected={selected}
      // Only the selected tab is in the Tab key order; the arrow keys move between tabs (see TabList).
      tabIndex={selected ? 0 : -1}
      className={cx("stl-tab", selected && "stl-tab--selected", className)}
      {...rest}
    >
      <span className={cx("stl-tab__label", textClass(selected ? "Body-strong" : "Body"))}>{label}</span>
      {showCount && <span className={cx("stl-tab__count", textClass("Caption"))}>{count}</span>}
    </button>
  );
}

export interface TabListProps extends HTMLAttributes<HTMLDivElement> {
  /** The accessible name of the set of tabs, e.g. "Loan views". */
  label: string;
}

/**
 * The row that holds Tabs. It has no Figma component: in Figma, tabs are placed side by side in a frame.
 * Left and Right move focus between tabs, Home and End go to the first and last; Enter or Space selects.
 */
export function TabList({ label, className, children, onKeyDown, ...rest }: TabListProps) {
  const keyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    const tabs = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)')];
    const current = tabs.indexOf(document.activeElement as HTMLButtonElement);
    if (current < 0) return;
    const next =
      event.key === "ArrowRight" ? (current + 1) % tabs.length
      : event.key === "ArrowLeft" ? (current - 1 + tabs.length) % tabs.length
      : event.key === "Home" ? 0
      : event.key === "End" ? tabs.length - 1
      : -1;
    if (next < 0) return;
    event.preventDefault();
    tabs[next].focus();
  };
  return (
    <div role="tablist" aria-label={label} className={cx("stl-tab-list", className)} onKeyDown={keyDown} {...rest}>
      {children}
    </div>
  );
}

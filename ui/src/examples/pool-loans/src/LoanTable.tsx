import type { ReactNode } from "react";
import { DataGrid, numericColumnWidth, type Column, type GridRow, type StatusChipTone } from "sterling-ui";
import { breaches, formatPercent, formatUpb, statusOf, type Loan, type Sort, type SortKey, type Status } from "./data";

export const TONES: Record<Status, StatusChipTone> = {
  Ready: "positive",
  Exception: "warning",
  "Signed off": "info",
};

/*
 * The loans, in Sterling's DataGrid. It brings selection (the page checkbox, Shift ranges), sorting, and the
 * loading and empty states; each row's descriptions give a flagged value its reason for screen readers, as the
 * Warning and exception cells pattern asks.
 */

// Widths follow Sterling's numericColumnWidth rule; columns whose cells can be flagged add the icon allowance.
// The columns fit the grid's 8 of 12 columns at 1440px: Loan ID is never flagged, so it takes no icon
// allowance; UPB is sized to the longest balance a loan in this pool can have (under $1M); and the descriptive
// text columns, Lender and Exception, share the extra width (DataGrid's fill), truncating if they must.
const COLUMNS: Column[] = [
  { key: "select", label: "Select", type: "checkbox", width: numericColumnWidth("", { icon: true }) },
  { key: "id", label: "Loan ID", type: "text", identifier: true, width: numericColumnWidth("LN-000000") },
  { key: "lender", label: "Lender", type: "text", width: numericColumnWidth("Harbor Point Lending") },
  { key: "upb", label: "UPB", type: "numeric", width: numericColumnWidth("999,999.00") },
  { key: "fico", label: "FICO", type: "numeric", width: numericColumnWidth("850", { icon: true }) },
  { key: "ltv", label: "LTV", type: "numeric", width: numericColumnWidth("100.0%", { icon: true }) },
  { key: "status", label: "Status", type: "chip", width: numericColumnWidth("Signed off", { icon: true }) },
  { key: "exception", label: "Exception", type: "text", width: 120 },
];
const UNSORTABLE = ["exception"];
const STATUS_TONES: Record<string, string> = TONES;

interface Props {
  rows: Loan[];
  sort: Sort;
  onSortChange: (sort: Sort) => void;
  isSelected: (id: string) => boolean;
  /** Select or clear these rows. */
  onSelect: (ids: string[], on: boolean) => void;
  /** Shows skeleton rows and marks the table busy. */
  loading: boolean;
  /** Shown in place of the rows: an EmptyState. */
  empty?: ReactNode;
  /** What screen readers hear while loading, or when the empty state appears. */
  statusText: string;
  /** A read-only list has no checkboxes. */
  readOnly?: boolean;
}

export function LoanTable({ rows, sort, onSortChange, isSelected, onSelect, loading, empty, statusText, readOnly = false }: Props) {
  const columns = readOnly ? COLUMNS.filter((c) => c.type !== "checkbox") : COLUMNS;
  const selected = readOnly ? [] : rows.filter((loan) => isSelected(loan.id)).map((loan) => loan.id);
  // DataGrid reports the whole new selection on the page; the screen keeps it across pages, so pass on the change.
  const onSelectedChange = (next: string[]) => {
    const added = next.filter((id) => !selected.includes(id));
    const removed = selected.filter((id) => !next.includes(id));
    if (added.length) onSelect(added, true);
    if (removed.length) onSelect(removed, false);
  };

  return (
    <div className="pl-table">
      <DataGrid
        label="Pool loans"
        columns={columns}
        rows={rows.map(gridRow)}
        tones={STATUS_TONES}
        rowKey="id"
        selected={selected}
        onSelectedChange={onSelectedChange}
        sort={sort}
        onSortChange={(next) => onSortChange({ key: next.key as SortKey, direction: next.direction })}
        unsortable={UNSORTABLE}
        fill
        loading={loading ? Math.max(rows.length, 5) : false}
        loadingLabel="Loading loans…"
        empty={empty}
      />
      <div role="status" className="pl-visually-hidden">
        {statusText}
      </div>
    </div>
  );
}

/** One loan as a grid row: the values shown, the flagged cells, and what a screen reader hears with them. */
function gridRow(loan: Loan): GridRow {
  const status = statusOf(loan);
  const found = breaches(loan);
  // An open exception flags the value that breaks the rule. A signed-off one has been accepted: its reason
  // stays in the Exception column, but the value is no longer flagged.
  const flagged = status === "Exception" ? found : [];
  const reason = found.map((b) => b.reason).join("; ");
  const note = loan.signOff ? `Signed off by ${loan.signOff.by}, ${loan.signOff.date}: ${loan.signOff.note}` : "";
  return {
    values: {
      id: loan.id,
      lender: loan.lender,
      upb: formatUpb(loan.upb),
      fico: String(loan.fico),
      ltv: formatPercent(loan.ltvPercent),
      status,
      exception: reason ? (note ? `${reason} · ${loan.signOff!.note}` : reason) : "—",
    },
    warning: flagged.map((b) => b.field),
    descriptions: {
      ...Object.fromEntries(flagged.map((b) => [b.field, `breaks a rule: ${b.reason}`])),
      // The Exception column truncates: the full sign-off, with who and when, is read with it.
      ...(note ? { exception: note } : {}),
    },
  };
}

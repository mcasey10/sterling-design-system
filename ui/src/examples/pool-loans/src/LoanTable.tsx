import { useRef, type ReactNode } from "react";
import {
  BodyCell,
  Checkbox,
  HeaderCell,
  Row,
  SkeletonRow,
  StatusChip,
  numericColumnWidth,
  type Column,
  type StatusChipTone,
} from "sterling-ui";
import { breaches, formatPercent, formatUpb, statusOf, type Loan, type Sort, type SortKey, type Status } from "./data";

export const TONES: Record<Status, StatusChipTone> = {
  Ready: "positive",
  Exception: "warning",
  "Signed off": "info",
};

/*
 * Sterling's DataGrid takes every cell as a plain string, so a flagged value can't carry its reason in its
 * accessible name, as the Warning and exception cells pattern asks. The table is built from Sterling's grid
 * parts instead (HeaderCell, Row, BodyCell, Checkbox, StatusChip, SkeletonRow), the documented way to rebuild
 * a grid for a real dataset. Selection follows DataGrid's behavior, including Shift ranges.
 */

// Widths follow Sterling's numericColumnWidth rule; columns whose cells can be flagged add the icon allowance.
const COLUMNS: (Column & { sortKey?: SortKey })[] = [
  { key: "select", label: "Select", type: "checkbox", width: numericColumnWidth("", { icon: true }) },
  { key: "id", label: "Loan ID", type: "text", identifier: true, width: numericColumnWidth("LN-000000", { icon: true }), sortKey: "id" },
  { key: "lender", label: "Lender", type: "text", width: numericColumnWidth("Harbor Point Lending"), sortKey: "lender" },
  { key: "upb", label: "UPB", type: "numeric", width: numericColumnWidth("9,999,999.00"), sortKey: "upb" },
  { key: "fico", label: "FICO", type: "numeric", width: numericColumnWidth("850", { icon: true }), sortKey: "fico" },
  { key: "ltv", label: "LTV", type: "numeric", width: numericColumnWidth("100.0%", { icon: true }), sortKey: "ltv" },
  { key: "status", label: "Status", type: "chip", width: numericColumnWidth("Signed off", { icon: true }), sortKey: "status" },
  { key: "exception", label: "Exception", type: "text", width: numericColumnWidth("LTV 93.0% — above 90%") },
];
const STRETCH = new Set(["lender", "exception"]);

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
  const minWidth = columns.reduce((n, c) => n + c.width, 0);
  const anchor = useRef<number | null>(null);
  const shift = useRef(false);
  const noteKey = (event: React.KeyboardEvent) => {
    shift.current = event.shiftKey;
  };
  const noteClick = (event: React.MouseEvent) => {
    if (event.detail !== 0) shift.current = event.shiftKey;
  };

  const toggle = (index: number, on: boolean) => {
    const from = shift.current && anchor.current !== null ? anchor.current : index;
    const [start, end] = from < index ? [from, index] : [index, from];
    anchor.current = index;
    onSelect(rows.slice(start, end + 1).map((loan) => loan.id), on);
  };

  const onPage = rows.filter((loan) => isSelected(loan.id)).length;
  const pageState = onPage === 0 ? "off" : onPage === rows.length ? "on" : "indeterminate";

  const sortBy = (key: SortKey) =>
    onSortChange({ key, direction: sort.key === key && sort.direction === "asc" ? "desc" : "asc" });

  return (
    <div className="stl-data-grid stl-data-grid--fill pl-table">
      <table
        aria-label="Pool loans"
        aria-busy={loading || undefined}
        aria-describedby="pl-table-caption"
        className="stl-data-grid__table"
        style={{ minWidth, width: "100%" }}
        onClickCapture={noteClick}
        onKeyDownCapture={noteKey}
        onKeyUpCapture={noteKey}
      >
        <colgroup>
          {columns.map((c) => (
            <col key={c.key} style={{ width: STRETCH.has(c.key) ? undefined : c.width }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map((c) =>
              c.type === "checkbox" ? (
                <th key={c.key} scope="col" className="stl-header-cell stl-header-cell--checkbox">
                  <Checkbox
                    label="Select all loans on this page"
                    checked={pageState}
                    disabled={loading || rows.length === 0}
                    onCheckedChange={(checked) => {
                      anchor.current = null;
                      onSelect(rows.map((loan) => loan.id), checked === "on");
                    }}
                  />
                </th>
              ) : (
                <HeaderCell
                  key={c.key}
                  label={c.label}
                  align={c.type === "numeric" ? "right" : "left"}
                  showSort={!!c.sortKey}
                  sort={c.sortKey && sort.key === c.sortKey ? sort.direction : "none"}
                  onSort={c.sortKey ? () => sortBy(c.sortKey!) : undefined}
                />
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {loading &&
            Array.from({ length: Math.max(rows.length, 5) }, (_, index) => (
              <SkeletonRow key={index} columns={columns} label="Loading loans…" showLabel={index === 0} />
            ))}
          {!loading && empty && (
            <tr>
              <td colSpan={columns.length} className="stl-data-grid__empty">
                {empty}
              </td>
            </tr>
          )}
          {!loading && !empty && rows.map((loan, index) => <LoanRow key={loan.id} loan={loan} readOnly={readOnly} selected={!readOnly && isSelected(loan.id)} onToggle={(on) => toggle(index, on)} />)}
        </tbody>
      </table>
      <div role="status" className="pl-visually-hidden">
        {statusText}
      </div>
    </div>
  );
}

function LoanRow({ loan, selected, readOnly, onToggle }: { loan: Loan; selected: boolean; readOnly: boolean; onToggle: (on: boolean) => void }) {
  const status = statusOf(loan);
  const found = breaches(loan);
  // An open exception flags the value that breaks the rule. A signed-off one has been accepted: its reason
  // stays in the Exception column, but the value is no longer flagged.
  const flag = (field: "fico" | "ltv") => (status === "Exception" ? found.find((b) => b.field === field) : undefined);
  const fico = flag("fico");
  const ltv = flag("ltv");
  const reason = found.map((b) => b.reason).join("; ");
  const note = loan.signOff ? `Signed off by ${loan.signOff.by}, ${loan.signOff.date}: ${loan.signOff.note}` : "";

  return (
    <Row selected={selected}>
      {!readOnly && (
        <BodyCell type="checkbox" selected={selected}>
          <Checkbox label={`Select ${loan.id}`} checked={selected ? "on" : "off"} onCheckedChange={(checked) => onToggle(checked === "on")} />
        </BodyCell>
      )}
      <BodyCell type="text" value={loan.id} selected={selected} />
      <BodyCell type="text" value={loan.lender} selected={selected} title={loan.lender} />
      <BodyCell type="numeric" value={formatUpb(loan.upb)} selected={selected} />
      <BodyCell
        type="numeric"
        value={String(loan.fico)}
        selected={selected}
        validation={fico ? "warning" : undefined}
        aria-label={fico ? `${loan.fico}, breaks a rule: ${fico.reason}` : undefined}
      />
      <BodyCell
        type="numeric"
        value={formatPercent(loan.ltvPercent)}
        selected={selected}
        validation={ltv ? "warning" : undefined}
        aria-label={ltv ? `${formatPercent(loan.ltvPercent)}, breaks a rule: ${ltv.reason}` : undefined}
      />
      <BodyCell type="chip" selected={selected}>
        <StatusChip tone={TONES[status]} label={status} />
      </BodyCell>
      <BodyCell
        type="text"
        value={reason ? (note ? `${reason} · ${loan.signOff!.note}` : reason) : "—"}
        selected={selected}
        title={[reason, note].filter(Boolean).join("\n") || undefined}
        aria-label={reason ? [reason, note].filter(Boolean).join(". ") : "None"}
      />
    </Row>
  );
}

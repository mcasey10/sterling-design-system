import { Button, Select, TextInput } from "sterling-ui";
import { FILTER_STATUSES, LENDERS, parseRange, type Filters, type Status } from "./pool";

const ANY = "any";

/** What the panel's fields hold before Apply. */
export interface Draft {
  lender: string;
  status: string;
  fico: string;
  ltv: string;
}

export interface DraftErrors {
  fico?: string;
  ltv?: string;
}

export const toDraft = (f: Filters): Draft => ({
  lender: f.lender ?? ANY,
  status: f.status ?? ANY,
  fico: f.fico?.text ?? "",
  ltv: f.ltv?.text ?? "",
});

export function parseDraft(d: Draft): { filters: Filters; errors: DraftErrors } {
  const filters: Filters = {};
  const errors: DraftErrors = {};
  if (d.lender !== ANY) filters.lender = d.lender;
  if (d.status !== ANY) filters.status = d.status as Status;
  const fico = parseRange(d.fico, "");
  if (fico === "invalid") errors.fico = "Enter a score or a range, e.g. 660–679 or ≥ 700.";
  else if (fico) filters.fico = fico;
  const ltv = parseRange(d.ltv, "%");
  if (ltv === "invalid") errors.ltv = "Enter a percent or a range, e.g. > 90% or 80–90%.";
  else if (ltv) filters.ltv = ltv;
  return { filters, errors };
}

const LENDER_OPTIONS = [{ value: ANY, label: "Any lender" }, ...LENDERS.map((l) => ({ value: l, label: l }))];
const STATUS_OPTIONS = [{ value: ANY, label: "Any status" }, ...FILTER_STATUSES.map((s) => ({ value: s, label: s }))];

interface Props {
  draft: Draft;
  errors: DraftErrors;
  onChange: (draft: Draft) => void;
  onApply: () => void;
  onReset: () => void;
}

export function FiltersPanel({ draft, errors, onChange, onApply, onReset }: Props) {
  return (
    <section className="panel" aria-labelledby="filters-title">
      <h2 id="filters-title" className="stl-text-heading heading">
        Filter pool loans
      </h2>
      <form
        className="stack"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          onApply();
        }}
      >
        <Select
          className="full"
          label="Lender"
          options={LENDER_OPTIONS}
          value={draft.lender}
          onValueChange={(lender) => onChange({ ...draft, lender })}
          showHelper={false}
        />
        <Select
          className="full"
          label="Status"
          options={STATUS_OPTIONS}
          value={draft.status}
          onValueChange={(status) => onChange({ ...draft, status })}
          showHelper={false}
        />
        <TextInput
          className="full"
          label="FICO"
          placeholder="e.g. 660–679"
          value={draft.fico}
          onChange={(e) => onChange({ ...draft, fico: e.target.value })}
          validation={errors.fico ? "error" : undefined}
          helper={errors.fico}
          showHelper={!!errors.fico}
        />
        <TextInput
          className="full"
          label="LTV"
          placeholder="e.g. > 90%"
          value={draft.ltv}
          onChange={(e) => onChange({ ...draft, ltv: e.target.value })}
          validation={errors.ltv ? "error" : undefined}
          helper={errors.ltv}
          showHelper={!!errors.ltv}
        />
        <div className="row row--end">
          <Button kind="ghost" label="Reset" onClick={onReset} />
          <Button kind="primary" label="Apply" type="submit" />
        </div>
      </form>
    </section>
  );
}

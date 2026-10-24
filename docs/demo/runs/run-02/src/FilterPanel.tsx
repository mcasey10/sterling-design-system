import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Button, Menu, Option, Select, TextInput } from "sterling-ui";
import { extraFields, lenders, parseRange, rangeFields, type Filters, type RangeKey, type Status } from "./model";

interface FilterPanelProps {
  draft: Filters;
  onDraftChange: (draft: Filters) => void;
  /** Extra fields the person has added with Add filter. */
  extras: ("upb" | "loanId")[];
  onAddExtra: (key: "upb" | "loanId") => void;
  onApply: () => void;
  onReset: () => void;
  disabled?: boolean;
}

const ANY = "any";
const statuses: Status[] = ["Ready", "Exception", "Signed off"];

/** Says what's wrong with a range field, or nothing. */
export const rangeError = (text: string) =>
  parseRange(text) === "invalid" ? "Enter a range like 660–679 or a limit like > 90." : undefined;

export function FilterPanel({ draft, onDraftChange, extras, onAddExtra, onApply, onReset, disabled }: FilterPanelProps) {
  const [showErrors, setShowErrors] = useState(false);
  const headingId = useId();
  const set = (patch: Partial<Filters>) => onDraftChange({ ...draft, ...patch });

  const rangeKeys: RangeKey[] = ["fico", "ltv", ...(extras.includes("upb") ? (["upb"] as const) : [])];
  const errors = rangeKeys.map((key) => rangeError(draft[key])).filter(Boolean);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (errors.length > 0) {
      setShowErrors(true);
      // Focus the first field with a problem, so its helper text is read.
      const first = rangeKeys.find((key) => rangeError(draft[key]));
      document.getElementById(`filter-${first}`)?.focus();
      return;
    }
    setShowErrors(false);
    onApply();
  };

  return (
    <form className="filter-panel panel" aria-labelledby={headingId} onSubmit={submit} noValidate>
      <h2 id={headingId} className="stl-text-heading">
        Filter pool loans
      </h2>
      <div className="filter-panel__fields">
        <Select
          label="Lender"
          showHelper={false}
          disabled={disabled}
          options={[{ value: ANY, label: "Any lender" }, ...lenders.map((l) => ({ value: l, label: l }))]}
          value={draft.lender ?? ANY}
          onValueChange={(value) => set({ lender: value === ANY ? null : value })}
        />
        <Select
          label="Status"
          showHelper={false}
          disabled={disabled}
          options={[{ value: ANY, label: "Any status" }, ...statuses.map((s) => ({ value: s, label: s }))]}
          value={draft.status ?? ANY}
          onValueChange={(value) => set({ status: value === ANY ? null : (value as Status) })}
        />
        {rangeKeys.map((key) => {
          const error = showErrors ? rangeError(draft[key]) : undefined;
          return (
            <TextInput
              key={key}
              id={`filter-${key}`}
              label={rangeFields[key].label}
              placeholder={rangeFields[key].placeholder}
              inputMode="decimal"
              autoComplete="off"
              disabled={disabled}
              value={draft[key]}
              onChange={(e) => set({ [key]: e.target.value })}
              validation={error ? "error" : undefined}
              helper={error}
              showHelper={!!error}
            />
          );
        })}
        {extras.includes("loanId") && (
          <TextInput
            id="filter-loanId"
            label="Loan ID"
            placeholder="e.g. 2043"
            autoComplete="off"
            disabled={disabled}
            value={draft.loanId}
            onChange={(e) => set({ loanId: e.target.value })}
            showHelper={false}
          />
        )}
      </div>
      <AddFilter
        available={extraFields.filter((f) => !extras.includes(f.key))}
        disabled={disabled}
        onAdd={(key) => {
          onAddExtra(key);
          // Move to the new field once it's there.
          requestAnimationFrame(() => document.getElementById(`filter-${key}`)?.focus());
        }}
      />
      <div className="filter-panel__actions">
        <Button kind="ghost" label="Reset" disabled={disabled} onClick={() => (setShowErrors(false), onReset())} />
        <Button kind="primary" label="Apply" type="submit" disabled={disabled} />
      </div>
    </form>
  );
}

/** Add filter: a button that opens a short menu of the columns the panel doesn't show yet. */
function AddFilter({
  available,
  disabled,
  onAdd,
}: {
  available: { key: "upb" | "loanId"; label: string }[];
  disabled?: boolean;
  onAdd: (key: "upb" | "loanId") => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const button = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLLIElement | null)[]>([]);
  const menuId = useId();

  useEffect(() => {
    if (open) items.current[active]?.focus();
  }, [open, active]);

  if (available.length === 0) return null;

  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) button.current?.focus();
  };
  const choose = (index: number) => {
    close(false);
    onAdd(available[index].key);
  };
  const keyDown = (event: KeyboardEvent) => {
    const last = available.length - 1;
    const moves: Record<string, number> = {
      ArrowDown: active === last ? 0 : active + 1,
      ArrowUp: active === 0 ? last : active - 1,
      Home: 0,
      End: last,
    };
    if (event.key in moves) {
      event.preventDefault();
      setActive(moves[event.key]);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choose(active);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close(true);
    } else if (event.key === "Tab") {
      close(false);
    }
  };

  return (
    <div className="add-filter">
      <Button
        ref={button}
        kind="ghost"
        label="Add filter"
        showIcon
        icon="plus"
        disabled={disabled}
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-haspopup="listbox"
        onClick={() => {
          setActive(0);
          setOpen(!open);
        }}
      />
      {open && (
        <Menu id={menuId} aria-label="Add a filter for" onKeyDown={keyDown}>
          {available.map((field, index) => (
            <Option
              key={field.key}
              ref={(el) => {
                items.current[index] = el;
              }}
              label={field.label}
              tabIndex={index === active ? 0 : -1}
              onClick={() => choose(index)}
              onBlur={(e) => {
                const next = e.relatedTarget;
                // Leaving the menu closes it; the button's own click toggles it.
                if (next !== button.current && !e.currentTarget.parentElement?.contains(next)) setOpen(false);
              }}
            />
          ))}
        </Menu>
      )}
    </div>
  );
}

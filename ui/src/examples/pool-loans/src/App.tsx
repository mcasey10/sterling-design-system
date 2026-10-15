import { useEffect, useMemo, useRef, useState } from "react";
import {
  BulkActionBar,
  Button,
  Dialog,
  EmptyState,
  FilterChip,
  Icon,
  IconButton,
  Link,
  Pagination,
  Select,
  StatusChip,
  Tab,
  TabList,
  TextInput,
} from "sterling-ui";
import {
  LENDERS,
  NO_FILTERS,
  PAGE_SIZE,
  PREDEFINED_VIEWS,
  STATUSES,
  breaches,
  describeRange,
  filterCount,
  formatMillions,
  initialPool,
  parseRange,
  plural,
  pool,
  query,
  sameFilters,
  shortLender,
  statusOf,
  summarize,
  today,
  totals,
  type Filters,
  type Loan,
  type PoolState,
  type Sort,
  type Status,
  type UnseenGroup,
  type View,
} from "./data";
import { LoanTable } from "./LoanTable";
import { SummaryPanel } from "./SummaryPanel";

type Selection = { mode: "ids"; ids: ReadonlySet<string> } | { mode: "all"; except: ReadonlySet<string> };
const NONE: Selection = { mode: "ids", ids: new Set() };

interface Request {
  filters: Filters;
  sort: Sort;
  page: number;
  /** Bumped by Retry, so the same request loads again. */
  attempt: number;
}

interface Removal {
  ids: string[];
  groups: UnseenGroup["key"][];
  count: number;
}

interface Notice {
  text: string;
  undo?: () => void;
}

const DEFAULT_SORT: Sort = { key: "id", direction: "asc" };
const LATENCY = 600;
const SKELETON_DELAY = 300;

export interface AppProps {
  /**
   * Make loading the list fail, to show the error state. Color mode and density aren't settings of the screen:
   * they come from the page around it (data-theme on the root element, and a density class).
   */
  loadFails?: boolean;
}

export function App({ loadFails = false }: AppProps) {
  // ---------------------------------------------------------------- Pool data
  const [poolState, setPoolState] = useState<PoolState>(initialPool);
  const [undoStack, setUndoStack] = useState<Removal[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const summary = useMemo(() => summarize(poolState), [poolState]);

  // ---------------------------------------------------------------- Views and filters
  const [views, setViews] = useState<View[]>(PREDEFINED_VIEWS);
  const [viewId, setViewId] = useState(PREDEFINED_VIEWS[0].id);
  const view = views.find((v) => v.id === viewId) ?? views[0];
  const [draft, setDraft] = useState<Filters>(view.filters);
  const [draftErrors, setDraftErrors] = useState<{ fico?: string; ltv?: string }>({});

  // ---------------------------------------------------------------- Loading
  const [request, setRequest] = useState<Request>({ filters: view.filters, sort: DEFAULT_SORT, page: 0, attempt: 0 });
  const [shown, setShown] = useState<Request | null>(null);
  const [phase, setPhase] = useState<"loading" | "ok" | "error">("loading");
  const [skeleton, setSkeleton] = useState(false);
  const failNext = useRef(false);

  useEffect(() => {
    setPhase("loading");
    const showSkeleton = setTimeout(() => setSkeleton(true), SKELETON_DELAY);
    const done = setTimeout(
      () => {
        if (failNext.current) {
          failNext.current = false;
          setPhase("error");
        } else {
          setShown(request);
          setPhase("ok");
        }
        setSkeleton(false);
      },
      shown ? LATENCY : LATENCY + SKELETON_DELAY,
    );
    return () => {
      clearTimeout(showSkeleton);
      clearTimeout(done);
    };
    // `shown` only picks the first load's latency; it must not restart the load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  const applied = request.filters;
  const edited = !sameFilters(view.filters, applied);
  const result = shown ? query(poolState, shown.filters, shown.sort, shown.page) : null;
  const rows = result?.rows ?? [];
  const pages = result?.total ? Math.ceil(result.total / PAGE_SIZE) : 0;

  // After removals, a page past the end moves back to the last one.
  useEffect(() => {
    if (shown && result && result.total !== null && shown.page > 0 && shown.page >= pages) {
      setRequest((r) => ({ ...r, page: Math.max(0, pages - 1) }));
    }
  }, [shown, result, pages]);

  // ---------------------------------------------------------------- Selection
  const [selection, setSelection] = useState<Selection>(NONE);
  const isSelected = (id: string) => (selection.mode === "ids" ? selection.ids.has(id) : !selection.except.has(id));
  const selectedCount =
    selection.mode === "ids" ? selection.ids.size : Math.max(0, (result?.total ?? 0) - selection.except.size);

  const select = (ids: string[], on: boolean) => {
    setSelection((current) => {
      if (current.mode === "all") {
        const except = new Set(current.except);
        ids.forEach((id) => (on ? except.delete(id) : except.add(id)));
        return except.size >= (result?.total ?? 0) ? NONE : { mode: "all", except };
      }
      const next = new Set(current.ids);
      ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
      return { mode: "ids", ids: next };
    });
  };

  /** The selected sample loans, and the unseen groups selected through "all matching". */
  const selected = useMemo(() => {
    if (!result) return { loans: [] as Loan[], groups: [] as UnseenGroup[] };
    if (selection.mode === "all") {
      return {
        loans: result.sampleMatches.filter((loan) => !selection.except.has(loan.id)),
        groups: result.unseenMatches,
      };
    }
    return { loans: poolState.loans.filter((loan) => selection.ids.has(loan.id)), groups: [] };
  }, [result, selection, poolState.loans]);
  const selectedExceptions = selected.loans.filter((loan) => statusOf(loan) === "Exception");
  const onScreen = new Set(rows.map((loan) => loan.id));
  const offScreenCount = selectedCount - selected.loans.filter((loan) => onScreen.has(loan.id)).length;

  // ---------------------------------------------------------------- Notices
  const [notice, setNotice] = useState<Notice | null>(null);
  const noticeRef = useRef<HTMLDivElement>(null);
  const announce = (next: Notice, focus = false) => {
    setNotice(next);
    if (focus) requestAnimationFrame(() => noticeRef.current?.focus());
  };

  // ---------------------------------------------------------------- Changing the query
  const chipsRef = useRef<HTMLDivElement>(null);

  const load = (filters: Filters, changes: Partial<Request> = {}) => {
    setSelection(NONE);
    setRequest((r) => ({ ...r, filters, page: 0, ...changes }));
  };

  const applyFilters = (filters: Filters) => {
    setDraft(filters);
    setDraftErrors({});
    load(filters);
  };

  const chooseView = (id: string) => {
    const next = views.find((v) => v.id === id);
    if (!next) return;
    setViewId(id);
    applyFilters(next.filters);
  };

  const applyDraft = () => {
    const errors: typeof draftErrors = {};
    if (draft.fico.trim() && !parseRange(draft.fico)) errors.fico = "Enter a range like 660–679, or a limit like > 700.";
    if (draft.ltv.trim() && !parseRange(draft.ltv)) errors.ltv = "Enter a limit like > 90%, or a range like 80–90%.";
    setDraftErrors(errors);
    if (Object.keys(errors).length === 0) load(draft);
  };

  const removeFilter = (field: keyof Filters, index: number) => {
    const cleared = { ...applied, [field]: field === "lender" || field === "status" ? null : "" };
    setDraft((d) => ({ ...d, [field]: cleared[field] }));
    load(cleared);
    // The chip is gone: focus the next one, or the group.
    requestAnimationFrame(() => {
      const chips = chipsRef.current?.querySelectorAll<HTMLElement>("[data-filter-chip]");
      (chips?.[Math.min(index, (chips?.length ?? 1) - 1)] ?? chipsRef.current)?.focus();
    });
  };

  const filterBy = (patch: Partial<Filters>) => {
    applyFilters({ ...NO_FILTERS, ...patch });
    requestAnimationFrame(() => document.getElementById("pool-loans-grid")?.focus());
  };

  const chips: { field: keyof Filters; label: string }[] = [];
  if (applied.lender) chips.push({ field: "lender", label: `Lender is ${shortLender(applied.lender)}` });
  if (applied.status) chips.push({ field: "status", label: `Status is ${applied.status}` });
  const ficoRange = parseRange(applied.fico);
  if (ficoRange) chips.push({ field: "fico", label: describeRange("FICO", ficoRange) });
  const ltvRange = parseRange(applied.ltv);
  if (ltvRange) chips.push({ field: "ltv", label: describeRange("LTV", ltvRange, "%") });

  // ---------------------------------------------------------------- Actions
  const [dialog, setDialog] = useState<null | "signOff" | "remove" | "saveView" | "submit">(null);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState(false);
  const [viewName, setViewName] = useState("");
  const [viewNameError, setViewNameError] = useState(false);

  const remove = () => {
    const removal: Removal = {
      ids: selected.loans.map((loan) => loan.id),
      groups: selected.groups.map((group) => group.key),
      count: selectedCount,
    };
    setPoolState((s) => ({
      ...s,
      removedIds: new Set([...s.removedIds, ...removal.ids]),
      removedGroups: new Set([...s.removedGroups, ...removal.groups]),
    }));
    setUndoStack((stack) => [...stack, removal]);
    setSelection(NONE);
    setDialog(null);
    announce({ text: `Removed ${plural(removal.count, "loan")} from the pool.`, undo: () => undo(removal) }, true);
  };

  const undo = (removal: Removal) => {
    setPoolState((s) => ({
      ...s,
      removedIds: new Set([...s.removedIds].filter((id) => !removal.ids.includes(id))),
      removedGroups: new Set([...s.removedGroups].filter((key) => !removal.groups.includes(key))),
    }));
    setUndoStack((stack) => stack.filter((r) => r !== removal));
    announce({ text: `Put ${plural(removal.count, "loan")} back in the pool.` }, true);
  };

  const askRemove = () => {
    if (offScreenCount > 0) setDialog("remove");
    else remove();
  };

  const signOff = () => {
    if (!note.trim()) {
      setNoteError(true);
      document.getElementById("pl-note")?.focus();
      return;
    }
    const ids = new Set(selectedExceptions.map((loan) => loan.id));
    const signed = { note: note.trim(), by: "You", date: today() };
    setPoolState((s) => ({ ...s, loans: s.loans.map((loan) => (ids.has(loan.id) ? { ...loan, signOff: signed } : loan)) }));
    setSelection(NONE);
    setDialog(null);
    announce({ text: `Signed off ${[...ids].join(", ")}.` }, true);
  };

  const saveView = () => {
    const name = viewName.trim();
    if (!name) {
      setViewNameError(true);
      document.getElementById("pl-view-name")?.focus();
      return;
    }
    const saved: View = { id: `mine-${views.length}`, name, filters: applied, mine: true };
    setViews((v) => [...v, saved]);
    setViewId(saved.id);
    setDialog(null);
    announce({ text: `Saved the view "${name}".` });
  };

  const submit = () => {
    setSubmitted(true);
    setSelection(NONE);
    setDialog(null);
    announce({ text: `Submitted ${pool.name}: ${plural(summary.loanCount, "loan")}, ${formatMillions(summary.upb)}.` }, true);
  };

  // ---------------------------------------------------------------- A failing load, on request
  // When loadFails turns on, the list loads again and that load fails; Retry then loads normally.
  useEffect(() => {
    if (!loadFails) return;
    failNext.current = true;
    setRequest((r) => ({ ...r, attempt: r.attempt + 1 }));
  }, [loadFails]);

  // ---------------------------------------------------------------- What the grid shows
  const loading = phase === "loading" && (skeleton || !shown);
  let empty: React.ReactNode = null;
  let statusText = "";
  if (phase === "error") {
    statusText = "Couldn't load pool loans.";
    empty = (
      <EmptyState
        tone="critical"
        title="Couldn't load pool loans"
        message="Something went wrong while loading the loans. Your filters are kept. Try again."
        onAction={() => setRequest((r) => ({ ...r, attempt: r.attempt + 1 }))}
      />
    );
  } else if (loading) {
    statusText = "Loading loans…";
  } else if (result && result.rows === null) {
    const back = shown!.page > 0;
    statusText = "These loans aren't in the sample data.";
    empty = (
      <EmptyState
        title="Not in the sample data"
        message={
          `This demo holds only the first page of each saved view. In the real tool, ` +
          (result.total !== null ? `${plural(result.total, "matching loan")} would load here.` : `the matching loans would load here.`)
        }
        actionLabel={back ? "Back to page 1" : `Show ${PREDEFINED_VIEWS[0].name}`}
        onAction={() => (back ? setRequest((r) => ({ ...r, page: 0 })) : chooseView(PREDEFINED_VIEWS[0].id))}
      />
    );
  } else if (result && rows.length === 0) {
    const filtered = filterCount(shown!.filters) > 0;
    statusText = filtered ? "No loans match these filters." : "There are no loans in the pool.";
    empty = (
      <EmptyState
        title={filtered ? "No loans match" : "No loans in the pool"}
        message={
          filtered
            ? "No pool loans match these filters. Change or clear them to see more."
            : "Add loans from the Add loans tab when it's available."
        }
        showAction={filtered}
        actionLabel="Clear filters"
        onAction={() => applyFilters(NO_FILTERS)}
      />
    );
  }

  const total = result?.total ?? null;
  const showPagination = !!shown && phase !== "error" && total !== null && total > 0 && result?.rows !== null;
  const start = (shown?.page ?? 0) * PAGE_SIZE;
  const shownFilterCount = shown ? filterCount(shown.filters) : 0;

  const issuesText = summary.issueCount > 0 ? `${plural(summary.issueCount, "pool issue")}` : "No pool issues";
  const readOnly = submitted;

  return (
    <div className="pl-app">
      <header className="pl-header">
        <div className="pl-header__title">
          <nav aria-label="Breadcrumb" className="pl-breadcrumb stl-text-body">
            <Link label="Pools" size="md" href="#pools" />
            <span aria-hidden="true" className="pl-muted">
              /
            </span>
            <h1 className="stl-text-title">{pool.name}</h1>
            <StatusChip tone={submitted ? "positive" : "neutral"} label={submitted ? "Submitted" : pool.state} />
          </nav>
          <p className="stl-text-caption pl-muted pl-criteria">
            Criteria: {pool.criteria} · target {formatMillions(pool.targetUpb)} ·{" "}
            <Link label="Edit criteria" href="#edit-criteria" />
          </p>
        </div>
        <div className="pl-header__actions">
          {!submitted && (
            <a
              href="#pl-issues"
              id="pl-issue-count"
              className={`pl-issue-count stl-text-body ${summary.issueCount > 0 ? "pl-issue-count--warning" : "pl-issue-count--positive"}`}
              onClick={(event) => {
                event.preventDefault();
                document.getElementById("pl-issues")?.focus();
              }}
            >
              <Icon name={summary.issueCount > 0 ? "alert-triangle" : "circle-check"} />
              {issuesText}
            </a>
          )}
          <Button
            kind="secondary"
            size="md"
            label="Save draft"
            disabled={submitted}
            onClick={() => announce({ text: `Draft saved at ${new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}.` })}
          />
          <Button
            kind="primary"
            size="md"
            label="Submit pool"
            disabled={submitted || summary.issueCount > 0}
            aria-describedby="pl-issue-count"
            onClick={() => setDialog("submit")}
          />
        </div>
      </header>

      <div className="pl-body">
        <section className="pl-card pl-filters" aria-labelledby="pl-filters-title">
          <h2 id="pl-filters-title" className="stl-text-heading">
            Filter pool loans
          </h2>
          <form
            className="pl-filters__form"
            onSubmit={(event) => {
              event.preventDefault();
              applyDraft();
            }}
          >
            <Select
              label="Lender"
              className="pl-field"
              showHelper={false}
              options={[{ value: "any", label: "Any lender" }, ...LENDERS.map((l) => ({ value: l, label: shortLender(l) }))]}
              value={draft.lender ?? "any"}
              onValueChange={(value) => setDraft((d) => ({ ...d, lender: value === "any" ? null : value }))}
            />
            <Select
              label="Status"
              className="pl-field"
              showHelper={false}
              options={[{ value: "any", label: "Any status" }, ...STATUSES.map((s) => ({ value: s, label: s }))]}
              value={draft.status ?? "any"}
              onValueChange={(value) => setDraft((d) => ({ ...d, status: value === "any" ? null : (value as Status) }))}
            />
            <TextInput
              label="FICO"
              className="pl-field"
              placeholder="e.g. 660-679"
              inputMode="numeric"
              value={draft.fico}
              onChange={(event) => setDraft((d) => ({ ...d, fico: event.target.value }))}
              validation={draftErrors.fico ? "error" : undefined}
              helper={draftErrors.fico}
            />
            <TextInput
              label="LTV"
              className="pl-field"
              placeholder="e.g. > 90%"
              value={draft.ltv}
              onChange={(event) => setDraft((d) => ({ ...d, ltv: event.target.value }))}
              validation={draftErrors.ltv ? "error" : undefined}
              helper={draftErrors.ltv}
            />
            <div className="pl-filters__actions">
              {/* Reset returns to the active view's own filters; Clear all, by the chips, removes every filter. */}
              <Button kind="ghost" size="md" label="Reset" onClick={() => applyFilters(view.filters)} />
              <Button kind="primary" size="md" label="Apply" type="submit" />
            </div>
          </form>
        </section>

        <main className="pl-main">
          <TabList label="Pool loan lists" className="pl-tabs">
            <Tab id="pl-tab-pool" label="Pool loans" count={summary.loanCount.toLocaleString("en-US")} selected aria-controls="pl-tabpanel" />
            <Tab
              id="pl-tab-add"
              label="Add loans"
              count={`${totals.candidatesToAdd} candidates`}
              disabled
              title="Adding loans isn't available yet"
            />
          </TabList>

          <div id="pl-tabpanel" role="tabpanel" aria-labelledby="pl-tab-pool" className="pl-tabpanel">
            <div className="pl-toolbar">
              <span className="stl-text-body pl-muted" aria-hidden="true">
                View
              </span>
              <Select
                label="View"
                showLabel={false}
                showHelper={false}
                className="pl-view-select"
                options={views.map((v) => ({
                  value: v.id,
                  label: `${v.mine ? "Mine: " : ""}${v.name}${v.id === viewId && edited ? " · edited" : ""}`,
                }))}
                value={viewId}
                onValueChange={chooseView}
              />
              <div ref={chipsRef} tabIndex={-1} role="group" aria-label="Applied filters" className="pl-chips">
                {chips.length === 0 && <span className="stl-text-caption pl-muted">No filters: every pool loan</span>}
                {chips.map((chip, index) => (
                  <FilterChip key={chip.field} data-filter-chip label={chip.label} onRemove={() => removeFilter(chip.field, index)} />
                ))}
                {chips.length > 1 && <Button kind="ghost" label="Clear all" onClick={() => applyFilters(NO_FILTERS)} />}
              </div>
              <Button
                kind="ghost"
                label="Save view"
                disabled={!edited}
                onClick={() => {
                  setViewName("");
                  setViewNameError(false);
                  setDialog("saveView");
                }}
              />
            </div>

            {!readOnly && (
              <BulkActionBar
                className="pl-bulk"
                count={
                  selectedCount === 0
                    ? ""
                    : total !== null && selectedCount === total && total > rows.length
                      ? `All ${total} matching selected`
                      : `${selectedCount} selected`
                }
                selectAll={`Select all ${total ?? ""} matching`}
                showSelectAll={total !== null && selectedCount < total && total > rows.length}
                onSelectAll={() => setSelection({ mode: "all", except: new Set() })}
                hint="No Exception loans selected"
                showHint={selectedExceptions.length === 0}
                hintId="pl-signoff-hint"
              >
                <Button kind="ghost" label="Clear selection" onClick={() => setSelection(NONE)} />
                <Button
                  kind="secondary"
                  label={selectedExceptions.length > 0 ? `Sign off ${selectedExceptions.length}` : "Sign off"}
                  showIcon
                  icon="check"
                  disabled={selectedExceptions.length === 0}
                  aria-describedby={selectedExceptions.length === 0 ? "pl-signoff-hint" : undefined}
                  onClick={() => {
                    setNote("");
                    setNoteError(false);
                    setDialog("signOff");
                  }}
                />
                <Button kind="secondary" label="Remove from pool" onClick={askRemove} />
              </BulkActionBar>
            )}

            <div ref={noticeRef} tabIndex={-1} className="pl-notice-region" role="status">
              {notice && (
                <div className="pl-notice stl-text-body">
                  <Icon name={notice.undo ? "info" : "circle-check"} className="pl-notice__icon" />
                  <span>{notice.text}</span>
                  {notice.undo && undoStack.length > 0 && (
                    <Button kind="ghost" label="Undo" onClick={notice.undo} />
                  )}
                  <IconButton kind="ghost" icon="x" label="Dismiss message" onClick={() => setNotice(null)} />
                </div>
              )}
            </div>

            <div id="pool-loans-grid" tabIndex={-1} className="pl-grid-anchor">
              <LoanTable
                rows={empty ? [] : rows}
                sort={request.sort}
                onSortChange={(sort) => setRequest((r) => ({ ...r, sort, page: 0 }))}
                isSelected={isSelected}
                onSelect={select}
                loading={loading}
                empty={empty}
                statusText={statusText}
                readOnly={readOnly}
              />
            </div>
            <p id="pl-table-caption" className="pl-visually-hidden">
              Rows flagged with a warning icon break an eligibility rule; the Exception column says which.
            </p>

            {showPagination && (
              <Pagination
                className="pl-pagination"
                range={`Showing ${start + 1}–${start + rows.length} of ${plural(total!, "pool loan")}${
                  shownFilterCount ? ` · ${plural(shownFilterCount, "filter")}` : ""
                }`}
                page={`Page ${(shown?.page ?? 0) + 1} of ${pages}`}
                previousDisabled={(shown?.page ?? 0) === 0 || phase === "loading"}
                nextDisabled={(shown?.page ?? 0) >= pages - 1 || phase === "loading"}
                onPrevious={() => setRequest((r) => ({ ...r, page: Math.max(0, r.page - 1) }))}
                onNext={() => setRequest((r) => ({ ...r, page: r.page + 1 }))}
              />
            )}
          </div>
        </main>

        <SummaryPanel
          summary={summary}
          loading={!shown && phase === "loading"}
          onFilterStatus={(status) => filterBy({ status })}
          onFilterLender={(lender) => filterBy({ lender })}
        />
      </div>

      <Dialog
        open={dialog === "signOff"}
        onClose={() => setDialog(null)}
        title={`Sign off ${plural(selectedExceptions.length, "exception")}?`}
        primaryLabel={`Sign off ${plural(selectedExceptions.length, "exception")}`}
        onPrimary={signOff}
      >
        <div className="pl-dialog-body">
          <ul className="pl-list stl-text-body">
            {selectedExceptions.map((loan) => (
              <li key={loan.id}>
                <span className="stl-text-body-strong">{loan.id}</span> · {shortLender(loan.lender)} ·{" "}
                {breaches(loan).map((b) => b.reason).join("; ")}
              </li>
            ))}
          </ul>
          {selectedCount > selectedExceptions.length && (
            <p className="stl-text-body pl-muted">
              The other {plural(selectedCount - selectedExceptions.length, "selected loan")} aren't open exceptions and won't change.
            </p>
          )}
          <TextInput
            id="pl-note"
            data-autofocus=""
            label="Note"
            className="pl-field"
            placeholder="e.g. 12 mo reserves"
            value={note}
            required
            onChange={(event) => {
              setNote(event.target.value);
              if (event.target.value.trim()) setNoteError(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                signOff();
              }
            }}
            validation={noteError ? "error" : undefined}
            helper={noteError ? "Enter a note to sign off. It's kept with the loan." : "Required. Say why the exception is acceptable."}
          />
        </div>
      </Dialog>

      <Dialog
        open={dialog === "remove"}
        onClose={() => setDialog(null)}
        title={`Remove ${plural(selectedCount, "loan")} from the pool?`}
        primaryLabel={`Remove ${plural(selectedCount, "loan")}`}
        onPrimary={remove}
      >
        <p className="stl-text-body">
          This removes {selection.mode === "all" ? "every loan matching " : ""}
          {selection.mode === "all" && chips.length > 0 ? chips.map((c) => c.label).join(", ") : ""}
          {selection.mode === "all" ? `: ${plural(selectedCount, "loan")}` : plural(selectedCount, "selected loan")}, including{" "}
          {plural(offScreenCount, "loan")} not on this page. You can undo it from the message that appears afterwards.
        </p>
      </Dialog>

      <Dialog
        open={dialog === "saveView"}
        onClose={() => setDialog(null)}
        title="Save view"
        primaryLabel="Save view"
        onPrimary={saveView}
      >
        <div className="pl-dialog-body">
          <p className="stl-text-body pl-muted">Filters: {chips.map((c) => c.label).join(", ") || "none"}.</p>
          <TextInput
            id="pl-view-name"
            data-autofocus=""
            label="View name"
            className="pl-field"
            placeholder="e.g. Harbor Point exceptions"
            value={viewName}
            onChange={(event) => {
              setViewName(event.target.value);
              if (event.target.value.trim()) setViewNameError(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                saveView();
              }
            }}
            validation={viewNameError ? "error" : undefined}
            helper={viewNameError ? "Enter a name for the view." : undefined}
          />
        </div>
      </Dialog>

      <Dialog
        open={dialog === "submit"}
        onClose={() => setDialog(null)}
        title={`Submit ${pool.name}?`}
        primaryLabel="Submit pool"
        onPrimary={submit}
      >
        <p className="stl-text-body">
          This submits {plural(summary.loanCount, "loan")} ({formatMillions(summary.upb)} of the {formatMillions(pool.targetUpb)} target). The pool
          can't be edited after it's submitted.
        </p>
      </Dialog>
    </div>
  );
}

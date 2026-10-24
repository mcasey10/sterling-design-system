import {
  BulkActionBar,
  Button,
  DataGrid,
  Dialog,
  EmptyState,
  FilterChip,
  Icon,
  IconButton,
  Link,
  Pagination,
  Select,
  StatusChip,
  SummaryMetric,
  Tab,
  TabList,
  TextInput,
  densityClass,
  numericColumnWidth,
  type Column,
  type GridRow,
  type GridSort,
  type StatusChipTone,
} from "sterling-ui";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { MenuButton, ViewMenu } from "./PopupList";
import {
  CANDIDATES,
  CAPPED_LENDER,
  INITIAL_POOL,
  INITIAL_VIEWS,
  LENDERS,
  NO_FILTERS,
  PAGE_SIZE,
  POOL,
  RULES,
  STATUSES,
  START_VIEW_ID,
  breaches,
  chipsFor,
  describeFilters,
  filtersEqual,
  formatLtv,
  formatMillions,
  formatShare,
  formatUpb,
  parseRange,
  plural,
  query,
  statusOf,
  totalsOf,
  type FilterKey,
  type Filters,
  type Loan,
  type PoolState,
  type SavedView,
  type Status,
} from "./pool";

// ---- Grid setup ------------------------------------------------------------------------------------------

const COLUMNS: Column[] = [
  { key: "select", label: "Select", type: "checkbox", width: 40 },
  { key: "id", label: "Loan ID", type: "text", identifier: true, width: numericColumnWidth("LN-000000") },
  { key: "lender", label: "Lender", type: "text", width: 176 },
  { key: "upb", label: "UPB", type: "numeric", width: numericColumnWidth("9,999,999.00") },
  { key: "fico", label: "FICO", type: "numeric", width: numericColumnWidth("FICO", { icon: true }) },
  { key: "ltv", label: "LTV", type: "numeric", width: numericColumnWidth("100.0%", { icon: true }) },
  { key: "status", label: "Status", type: "chip", width: 120 },
  { key: "exception", label: "Exception", type: "text", width: 200 },
];

const TONES: Record<Status, StatusChipTone> = {
  Ready: "positive",
  Exception: "warning",
  "Signed off": "info",
  Ineligible: "critical",
};

const exceptionText = (loan: Loan) =>
  breaches(loan)
    .map((b) => b.reason)
    .join("; ");

const SORT_VALUE: Record<string, (loan: Loan) => string | number> = {
  id: (l) => l.id,
  lender: (l) => l.lender,
  upb: (l) => l.upb,
  fico: (l) => l.fico,
  ltv: (l) => l.ltvPercent,
  status: (l) => statusOf(l),
  exception: (l) => exceptionText(l),
};

function sortLoans(loans: Loan[], sort: GridSort): Loan[] {
  const value = SORT_VALUE[sort.key] ?? SORT_VALUE.id;
  const dir = sort.direction === "asc" ? 1 : -1;
  return [...loans].sort((a, b) => {
    const x = value(a);
    const y = value(b);
    const order = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
    return order * dir || a.id.localeCompare(b.id);
  });
}

function toGridRow(loan: Loan): GridRow {
  const status = statusOf(loan);
  const found = breaches(loan);
  const open = status === "Exception" || status === "Ineligible";
  const keyOf = (field: "fico" | "ltvPercent") => (field === "fico" ? "fico" : "ltv");
  const descriptions: Record<string, string> = {};
  for (const b of found) descriptions[keyOf(b.field)] = open ? `Breaks a rule: ${b.reason}` : b.reason;
  if (loan.signOff) {
    descriptions.status = `by ${loan.signOff.by}, ${loan.signOff.date}. Note: ${loan.signOff.note}`;
  }
  if (!found.length) descriptions.exception = "None";
  return {
    values: {
      id: loan.id,
      lender: loan.lender,
      upb: formatUpb(loan.upb),
      fico: String(loan.fico),
      ltv: formatLtv(loan.ltvPercent),
      status,
      exception: found.length ? exceptionText(loan) : "—",
    },
    warning: status === "Exception" ? found.map((b) => keyOf(b.field)) : undefined,
    error: status === "Ineligible" ? found.filter((b) => b.ineligible).map((b) => keyOf(b.field)) : undefined,
    descriptions,
  };
}

// ---- Screen state types ----------------------------------------------------------------------------------

type Selection = { all: false; ids: string[] } | { all: true; excluded: string[] };
const NOTHING: Selection = { all: false, ids: [] };

interface Notice {
  text: string;
  tone: "positive" | "info";
  undo?: () => void;
}

type Phase = "loading" | "ready" | "error";
type ListDemo = "normal" | "slow" | "error";
type Theme = "system" | "light" | "dark";
type Density = "Compact" | "Default" | "Comfortable";

function fromUrl<T extends string>(name: string, allowed: readonly T[], fallback: T): T {
  const value = new URLSearchParams(window.location.search).get(name);
  return (allowed as readonly string[]).includes(value ?? "") ? (value as T) : fallback;
}

const today = () => new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });

// ---- The screen ------------------------------------------------------------------------------------------

export function App() {
  const startView = INITIAL_VIEWS.find((v) => v.id === START_VIEW_ID)!;

  // Pool data and what the trader has done to it
  const [pool, setPool] = useState<PoolState>(INITIAL_POOL);
  const [submitted, setSubmitted] = useState(false);

  // Views and filters
  const [views, setViews] = useState<SavedView[]>(INITIAL_VIEWS);
  const [viewId, setViewId] = useState(START_VIEW_ID);
  const [applied, setApplied] = useState<Filters>(startView.filters);
  const [draft, setDraft] = useState<Filters>(startView.filters);
  const [showUpbField, setShowUpbField] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FilterKey, string>>>({});

  // The list
  const [sort, setSort] = useState<GridSort>({ key: "id", direction: "asc" });
  const [page, setPage] = useState(0);
  const [selection, setSelection] = useState<Selection>(NOTHING);
  const [shown, setShown] = useState({ filters: startView.filters, page: 0 });
  const [phase, setPhase] = useState<Phase>("loading");
  const [skeleton, setSkeleton] = useState(true);
  const [reloads, setReloads] = useState(0);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // Feedback and dialogs
  const [notice, setNotice] = useState<Notice | null>(null);
  const noticeRef = useRef<HTMLDivElement>(null);
  const [dialog, setDialog] = useState<null | "signoff" | "remove" | "saveview" | "submit">(null);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState(false);
  const [viewName, setViewName] = useState("");
  const [viewNameError, setViewNameError] = useState(false);

  // Display settings for the demo
  const [theme, setTheme] = useState<Theme>(fromUrl<Theme>("theme", ["system", "light", "dark"], "system"));
  const [density, setDensity] = useState<Density>(
    fromUrl<Density>("density", ["Compact", "Default", "Comfortable"], "Default"),
  );
  const [listDemo, setListDemo] = useState<ListDemo>(fromUrl<ListDemo>("list", ["normal", "slow", "error"], "normal"));

  const chipsRef = useRef<HTMLDivElement>(null);
  const focusAfterChipRemoval = useRef(false);
  const issuesId = useId();
  const hintId = useId();
  const filterHeadingId = useId();
  const summaryHeadingId = useId();
  const poolTabId = useId();
  const poolPanelId = useId();

  // Color mode and density apply to the whole document, so dialogs and menus follow them too.
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
  }, [theme]);
  useEffect(() => {
    const body = document.body;
    body.classList.remove(densityClass("Compact"), densityClass("Comfortable"));
    if (density !== "Default") body.classList.add(densityClass(density));
  }, [density]);

  useEffect(() => {
    const t = setTimeout(() => setSummaryLoading(false), 700);
    return () => clearTimeout(t);
  }, []);

  // Load the list whenever the filters or the page change. Skeleton rows appear only after 300 ms, so quick
  // loads don't flash; until then the previous rows stay.
  useEffect(() => {
    setPhase("loading");
    const skeletonTimer = setTimeout(() => setSkeleton(true), 300);
    const delay = listDemo === "slow" ? 4000 : 700;
    const doneTimer = setTimeout(() => {
      setShown({ filters: applied, page });
      setSkeleton(false);
      setPhase(listDemo === "error" ? "error" : "ready");
    }, delay);
    return () => {
      clearTimeout(skeletonTimer);
      clearTimeout(doneTimer);
    };
  }, [applied, page, listDemo, reloads]);

  // After a chip is removed it's gone, so move focus to the next chip, or the View menu.
  useEffect(() => {
    if (!focusAfterChipRemoval.current) return;
    focusAfterChipRemoval.current = false;
    const target =
      chipsRef.current?.querySelector<HTMLElement>("button") ??
      document.querySelector<HTMLElement>(".view-menu .stl-select__trigger");
    target?.focus();
  });

  const showNotice = (next: Notice) => {
    setNotice(next);
    // Wait for any dialog to close and hand focus back, then move focus to the notice so Undo is next.
    setTimeout(() => noticeRef.current?.focus(), 50);
  };

  // ---- Derived data --------------------------------------------------------------------------------------

  const totals = useMemo(() => totalsOf(pool), [pool]);
  const result = useMemo(() => query(pool, shown.filters), [pool, shown.filters]);
  const sortedRows = useMemo(() => sortLoans(result.rows, sort), [result.rows, sort]);
  const pageRows = sortedRows.slice(shown.page * PAGE_SIZE, shown.page * PAGE_SIZE + PAGE_SIZE);
  const pageIds = pageRows.map((l) => l.id);
  const pageCount = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const activeView = views.find((v) => v.id === viewId);
  const edited = !!activeView && !filtersEqual(applied, activeView.filters);
  const chips = chipsFor(applied);
  const showRows = phase === "ready" || (phase === "loading" && !skeleton);

  const selectedCount = selection.all ? result.total - selection.excluded.length : selection.ids.length;
  const gridSelected = selection.all ? pageIds.filter((id) => !selection.excluded.includes(id)) : selection.ids;
  const selectedLoans: Loan[] = selection.all
    ? result.rows.filter((l) => !selection.excluded.includes(l.id))
    : pool.loans.filter((l) => selection.ids.includes(l.id) && !pool.removed.includes(l.id));
  const selectedExceptions = selectedLoans.filter((l) => statusOf(l) === "Exception");
  const allMatchingSelected = selection.all && selection.excluded.length === 0;
  const selectionBeyondPage = selection.all
    ? result.total > pageIds.length
    : selection.ids.some((id) => !pageIds.includes(id));

  // ---- Actions -------------------------------------------------------------------------------------------

  const changeFilters = (next: Filters) => {
    setApplied(next);
    setDraft(next);
    setFieldErrors({});
    setShowUpbField(!!next.upb.trim());
    setPage(0);
    setSelection(NOTHING);
  };

  const chooseView = (id: string) => {
    const view = views.find((v) => v.id === id);
    if (!view) return;
    setViewId(id);
    changeFilters(view.filters);
  };

  /** Shows exactly these filters: through a saved view when one matches. */
  const showFilters = (next: Filters) => {
    const view = views.find((v) => filtersEqual(v.filters, next));
    if (view) chooseView(view.id);
    else changeFilters(next);
  };

  const applyDraft = () => {
    const errors: Partial<Record<FilterKey, string>> = {};
    if (draft.fico.trim() && !parseRange(draft.fico)) errors.fico = "Enter a score or a range, e.g. 660–679 or ≥ 680.";
    if (draft.ltv.trim() && !parseRange(draft.ltv)) errors.ltv = "Enter a percent or a range, e.g. > 90% or 80–90%.";
    if (draft.upb.trim() && !parseRange(draft.upb)) errors.upb = "Enter an amount or a range, e.g. ≥ 400000.";
    setFieldErrors(errors);
    const first = (["fico", "ltv", "upb"] as const).find((k) => errors[k]);
    if (first) {
      document.getElementById(`filter-${first}`)?.focus();
      return;
    }
    if (filtersEqual(draft, applied)) return;
    changeFilters(draft);
  };

  const resetDraft = () => changeFilters(activeView?.filters ?? NO_FILTERS);

  const removeChip = (key: FilterKey) => {
    const cleared = key === "lender" || key === "status" ? null : "";
    focusAfterChipRemoval.current = true;
    changeFilters({ ...applied, [key]: cleared });
  };

  const onSelectedChange = (next: string[]) => {
    if (!selection.all) {
      setSelection({ all: false, ids: next });
      return;
    }
    const nextOnPage = pageIds.filter((id) => next.includes(id));
    // Clearing the header checkbox while everything matching is selected clears the whole selection.
    if (nextOnPage.length === 0 && gridSelected.length === pageIds.length && pageIds.length > 1) {
      setSelection(NOTHING);
      return;
    }
    const excluded = new Set(selection.excluded);
    for (const id of pageIds) {
      if (next.includes(id)) excluded.delete(id);
      else excluded.add(id);
    }
    setSelection(excluded.size >= result.total ? NOTHING : { all: true, excluded: [...excluded] });
  };

  const remove = () => {
    const before = { pool, selection };
    const ids = selectedLoans.map((l) => l.id);
    const next: PoolState = { ...pool, removed: [...pool.removed, ...ids] };
    let count = ids.length;
    if (selection.all && result.unseen > 0) {
      // Every loan outside the sample that matches goes too; the totals only allow this for lender filters.
      count += result.unseen;
      if (shown.filters.lender !== CAPPED_LENDER) {
        next.unseenOther = 0;
        next.unseenOtherUpb = 0;
      }
      next.unseenCapped = 0;
      next.unseenCappedUpb = 0;
    }
    setPool(next);
    setSelection(NOTHING);
    setDialog(null);
    showNotice({
      tone: "info",
      text: `Removed ${plural(count, "loan")} from the pool.`,
      undo: () => {
        setPool(before.pool);
        setSelection(before.selection);
        showNotice({ tone: "info", text: `Put ${plural(count, "loan")} back in the pool.` });
      },
    });
  };

  const signOff = () => {
    if (!note.trim()) {
      setNoteError(true);
      document.getElementById("signoff-note")?.focus();
      return;
    }
    const before = pool;
    const ids = selectedExceptions.map((l) => l.id);
    const signed = { note: note.trim(), by: "You", date: today() };
    setPool({ ...pool, loans: pool.loans.map((l) => (ids.includes(l.id) ? { ...l, signOff: signed } : l)) });
    setDialog(null);
    showNotice({
      tone: "positive",
      text: `Signed off ${plural(ids.length, "exception")}: ${ids.join(", ")}.`,
      undo: () => {
        setPool(before);
        showNotice({ tone: "info", text: `Sign-off undone for ${ids.join(", ")}.` });
      },
    });
  };

  const saveView = () => {
    const name = viewName.trim();
    if (!name) {
      setViewNameError(true);
      document.getElementById("view-name")?.focus();
      return;
    }
    const id = `mine-${Date.now()}`;
    setViews([...views, { id, name, group: "Saved by me", filters: applied }]);
    setViewId(id);
    setDialog(null);
    showNotice({ tone: "positive", text: `Saved the view "${name}".` });
  };

  const openSignOff = () => {
    setNote("");
    setNoteError(false);
    setDialog("signoff");
  };

  const askRemove = () => {
    if (selectionBeyondPage) setDialog("remove");
    else remove();
  };

  // ---- Text --------------------------------------------------------------------------------------------

  const countText =
    selectedCount === 0
      ? ""
      : allMatchingSelected
        ? `All ${result.total.toLocaleString("en-US")} matching selected`
        : `${selectedCount.toLocaleString("en-US")} selected`;

  const filterCountText = chips.length ? ` · ${plural(chips.length, "filter")}` : "";
  const firstShown = shown.page * PAGE_SIZE + 1;
  const rangeText =
    result.total === 0
      ? `No pool loans match${filterCountText}`
      : pageRows.length === 0
        ? `Page ${shown.page + 1} of ${result.total.toLocaleString("en-US")} pool loans${filterCountText}`
        : `Showing ${firstShown}–${firstShown + pageRows.length - 1} of ${plural(result.total, "pool loan")}${
            result.exact ? "" : " in the sample data"
          }${filterCountText}`;

  const issuesText = submitted
    ? "Submitted"
    : totals.issues === 0
      ? "No pool issues"
      : `${plural(totals.issues, "pool issue")}`;

  const emptyState =
    phase === "error" ? (
      <EmptyState
        tone="critical"
        title="Couldn't load pool loans"
        message="The loan list didn't load. Your filters are kept. Try again."
        actionLabel="Retry"
        onAction={() => setReloads((n) => n + 1)}
      />
    ) : result.total === 0 ? (
      <EmptyState
        title="No loans match these filters"
        message={`No loans in ${POOL.name} match ${describeFilters(shown.filters)}. Clear the filters to see all ${plural(totals.loans, "pool loan")}.`}
        actionLabel="Clear filters"
        onAction={() => showFilters(NO_FILTERS)}
      />
    ) : (
      <EmptyState
        title={`Page ${shown.page + 1} isn't in the sample data`}
        message="This demo's data file holds only the first page of each view."
        actionLabel="Go to page 1"
        onAction={() => setPage(0)}
      />
    );

  const viewChoices = views.map((v) => ({
    id: v.id,
    name: v.name,
    group: v.group,
    description: describeFilters(v.filters),
  }));

  const lenderOptions = [{ value: "any", label: "Any lender" }, ...LENDERS.map((l) => ({ value: l, label: l }))];
  const statusOptions = [{ value: "any", label: "Any status" }, ...STATUSES.map((s) => ({ value: s, label: s }))];

  // ---- Render ------------------------------------------------------------------------------------------

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-header__title">
          <nav aria-label="Breadcrumb" className="breadcrumb stl-text-body">
            <Link size="md" label="Pools" href="#pools" />
            <span aria-hidden="true" className="breadcrumb__sep">
              /
            </span>
          </nav>
          <h1 className="stl-text-title page-header__name">{POOL.name}</h1>
          <StatusChip tone={submitted ? "positive" : "neutral"} label={submitted ? "Submitted" : POOL.state} />
        </div>
        <div className="page-header__actions">
          <span
            id={issuesId}
            className={`issues-count stl-text-label ${totals.issues && !submitted ? "issues-count--open" : "issues-count--clear"}`}
          >
            <Icon name={totals.issues && !submitted ? "alert-triangle" : "circle-check"} />
            {issuesText}
          </span>
          <Button
            kind="secondary"
            size="md"
            label="Save draft"
            disabled={submitted}
            onClick={() => showNotice({ tone: "positive", text: `Saved ${POOL.name} as a draft.` })}
          />
          <Button
            kind="primary"
            size="md"
            label="Submit pool"
            disabled={submitted || totals.issues > 0}
            aria-describedby={issuesId}
            onClick={() => setDialog("submit")}
          />
        </div>
        <p className="page-header__criteria stl-text-caption">
          Criteria: {POOL.criteria} · target {formatMillions(POOL.targetUpb)} ·{" "}
          <Link
            label="Edit criteria"
            href="#criteria"
            onClick={(event) => {
              event.preventDefault();
              showNotice({ tone: "info", text: "Editing criteria isn't part of this screen yet." });
            }}
          />
        </p>
      </header>

      <main className="layout">
        {/* Filters panel */}
        <aside className="panel filters" aria-labelledby={filterHeadingId}>
          <form
            className="filters__form"
            onSubmit={(event) => {
              event.preventDefault();
              applyDraft();
            }}
          >
            <h2 id={filterHeadingId} className="stl-text-heading panel__heading">
              Filter pool loans
            </h2>
            <Select
              label="Lender"
              options={lenderOptions}
              value={draft.lender ?? "any"}
              onValueChange={(v) => setDraft({ ...draft, lender: v === "any" ? null : v })}
            />
            <Select
              label="Status"
              options={statusOptions}
              value={draft.status ?? "any"}
              onValueChange={(v) => setDraft({ ...draft, status: v === "any" ? null : (v as Status) })}
            />
            <TextInput
              id="filter-fico"
              label="FICO"
              placeholder="e.g. 660–679"
              value={draft.fico}
              onChange={(e) => setDraft({ ...draft, fico: e.target.value })}
              validation={fieldErrors.fico ? "error" : undefined}
              helper={fieldErrors.fico}
            />
            <TextInput
              id="filter-ltv"
              label="LTV"
              placeholder="e.g. > 90%"
              value={draft.ltv}
              onChange={(e) => setDraft({ ...draft, ltv: e.target.value })}
              validation={fieldErrors.ltv ? "error" : undefined}
              helper={fieldErrors.ltv}
            />
            {showUpbField && (
              <div className="filters__extra">
                <TextInput
                  id="filter-upb"
                  label="UPB"
                  placeholder="e.g. ≥ 400000"
                  value={draft.upb}
                  onChange={(e) => setDraft({ ...draft, upb: e.target.value })}
                  validation={fieldErrors.upb ? "error" : undefined}
                  helper={fieldErrors.upb}
                  className="filters__extra-field"
                />
                <IconButton
                  kind="ghost"
                  icon="x"
                  label="Remove the UPB field"
                  className="filters__extra-remove"
                  onClick={() => {
                    setShowUpbField(false);
                    setDraft({ ...draft, upb: "" });
                    setFieldErrors({ ...fieldErrors, upb: undefined });
                  }}
                />
              </div>
            )}
            {!showUpbField && (
              <MenuButton
                label="Add filter"
                icon="plus"
                menuLabel="Filters to add"
                items={[{ id: "upb", label: "UPB" }]}
                onChoose={() => {
                  setShowUpbField(true);
                  setTimeout(() => document.getElementById("filter-upb")?.focus(), 0);
                }}
              />
            )}
            <div className="filters__actions">
              <Button kind="ghost" size="md" label="Reset" onClick={resetDraft} />
              <Button kind="primary" size="md" label="Apply" type="submit" />
            </div>
          </form>
        </aside>

        {/* Tabs, view, chips, bulk actions, grid */}
        <section className="main" aria-label="Loans">
          <TabList label="Pool loan lists" className="tabs">
            <Tab
              id={poolTabId}
              aria-controls={poolPanelId}
              label="Pool loans"
              count={totals.loans.toLocaleString("en-US")}
              selected
            />
            <Tab
              label="Add loans"
              count={`${CANDIDATES} candidates`}
              disabled
              title="Adding loans isn't available yet"
            />
          </TabList>

          <div role="tabpanel" id={poolPanelId} aria-labelledby={poolTabId} className="tab-panel">
            <div className="toolbar">
              <ViewMenu views={viewChoices} activeId={viewId} edited={edited} onChoose={chooseView} />
              <div ref={chipsRef} className="chips" role="group" aria-label="Applied filters">
                {chips.map((chip) => (
                  <FilterChip key={chip.key} label={chip.label} onRemove={() => removeChip(chip.key)} />
                ))}
                {chips.length > 1 && (
                  <Button kind="ghost" label="Clear all" onClick={() => showFilters(NO_FILTERS)} />
                )}
              </div>
              <Button
                kind="ghost"
                label="Save view"
                className="toolbar__save"
                disabled={!edited}
                onClick={() => {
                  setViewName("");
                  setViewNameError(false);
                  setDialog("saveview");
                }}
              />
            </div>

            {notice && (
              <div
                ref={noticeRef}
                tabIndex={-1}
                role="status"
                className={`notice notice--${notice.tone} stl-text-body`}
              >
                <Icon name={notice.tone === "positive" ? "circle-check" : "info"} />
                <span className="notice__text">{notice.text}</span>
                {notice.undo && <Button kind="ghost" label="Undo" onClick={notice.undo} />}
                <IconButton kind="ghost" icon="x" label="Dismiss message" onClick={() => setNotice(null)} />
              </div>
            )}

            <BulkActionBar
              count={countText}
              selectAll={`Select all ${result.total.toLocaleString("en-US")} matching`}
              showSelectAll={!allMatchingSelected && result.total > selectedCount}
              onSelectAll={() => setSelection({ all: true, excluded: [] })}
              hint="No Exception loans selected"
              showHint={selectedExceptions.length === 0}
              hintId={hintId}
            >
              <Button kind="ghost" label="Clear selection" onClick={() => setSelection(NOTHING)} />
              <Button
                kind="secondary"
                label="Sign off"
                showIcon
                icon="check"
                disabled={selectedExceptions.length === 0 || submitted}
                aria-describedby={selectedExceptions.length === 0 ? hintId : undefined}
                onClick={openSignOff}
              />
              <Button kind="secondary" label="Remove from pool" disabled={submitted} onClick={askRemove} />
            </BulkActionBar>

            <DataGrid
              label={`${POOL.name} loans`}
              columns={COLUMNS}
              rows={showRows ? pageRows.map(toGridRow) : []}
              tones={TONES}
              rowKey="id"
              fill
              className="grid"
              selected={gridSelected}
              onSelectedChange={onSelectedChange}
              sort={sort}
              onSortChange={setSort}
              unsortable={["select"]}
              loading={phase === "loading" && skeleton ? PAGE_SIZE : false}
              loadingLabel="Loading pool loans…"
              empty={emptyState}
              emptyLabel={phase === "error" ? "Couldn't load pool loans" : "No loans to show"}
            />

            {phase !== "error" && (
              <Pagination
                range={phase === "loading" && skeleton ? "Loading pool loans…" : rangeText}
                page={`Page ${page + 1} of ${pageCount}`}
                previousDisabled={page === 0}
                nextDisabled={page >= pageCount - 1}
                onPrevious={() => setPage((p) => Math.max(0, p - 1))}
                onNext={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              />
            )}
          </div>
        </section>

        {/* Pool summary */}
        <aside className="summary" aria-labelledby={summaryHeadingId}>
          <h2 id={summaryHeadingId} className="stl-text-heading">
            Pool summary
          </h2>
          <SummaryMetric
            className="card"
            label="Pool UPB"
            loading={summaryLoading}
            value={formatMillions(totals.upb)}
            progress={totals.upb / POOL.targetUpb}
            status={totals.upb > POOL.targetUpb ? "over-target" : "normal"}
            detail={`${Math.round((totals.upb / POOL.targetUpb) * 100)}% of ${formatMillions(POOL.targetUpb)} target · $${Math.round(totals.upb).toLocaleString("en-US")}`}
          />

          <section className="panel card" aria-labelledby="by-status-heading">
            <h3 id="by-status-heading" className="stl-text-label card__label">
              Loans by status
            </h3>
            {summaryLoading ? (
              <p className="stl-text-body card__muted">Loading…</p>
            ) : (
              <p className="stl-text-body status-links">
                {STATUSES.map((s, i) => (
                  <span key={s}>
                    {i > 0 && <span aria-hidden="true"> · </span>}
                    <Link
                      size="md"
                      label={`${totals.byStatus[s].toLocaleString("en-US")} ${s}`}
                      href="#filters"
                      aria-label={`${totals.byStatus[s]} ${s}: filter by Status is ${s}`}
                      onClick={(event) => {
                        event.preventDefault();
                        showFilters({ ...applied, status: s });
                      }}
                    />
                  </span>
                ))}
              </p>
            )}
            <p className="stl-text-caption card__muted">Each adds a Status filter.</p>
          </section>

          <section
            className={`panel card issues ${totals.issues ? "issues--open" : "issues--clear"}`}
            aria-labelledby="issues-heading"
          >
            <h3 id="issues-heading" className="stl-text-body-strong issues__heading">
              <Icon name={totals.issues ? "alert-triangle" : "circle-check"} />
              {totals.issues ? `Issues blocking submit (${totals.issues})` : "Nothing blocks submit"}
            </h3>
            {totals.issues === 0 && (
              <p className="stl-text-body">Every exception is signed off and no lender is over {RULES.lenderSharePercentCap}%.</p>
            )}
            {totals.openExceptions.length > 0 && (
              <div className="issues__item">
                <p className="stl-text-body">Exceptions needing sign-off ({totals.openExceptions.length})</p>
                <Link
                  size="md"
                  label="Filter: Status is Exception"
                  href="#filters"
                  onClick={(event) => {
                    event.preventDefault();
                    showFilters({ ...NO_FILTERS, status: "Exception" });
                  }}
                />
              </div>
            )}
            {totals.overCap && (
              <div className="issues__item">
                <p className="stl-text-body">
                  Limits (1): {CAPPED_LENDER} at {formatShare(totals.cappedShare)} (cap {RULES.lenderSharePercentCap}%)
                </p>
                <Link
                  size="md"
                  label={`Filter: Lender is ${CAPPED_LENDER}`}
                  href="#filters"
                  onClick={(event) => {
                    event.preventDefault();
                    showFilters({ ...NO_FILTERS, lender: CAPPED_LENDER });
                  }}
                />
              </div>
            )}
          </section>
        </aside>
      </main>

      <footer className="demo panel" aria-label="Demo settings">
        <h2 className="stl-text-label demo__heading">Demo settings</h2>
        <Select
          label="Color mode"
          options={[
            { value: "system", label: "System" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
          value={theme}
          onValueChange={(v) => setTheme(v as Theme)}
        />
        <Select
          label="Density"
          options={["Compact", "Default", "Comfortable"].map((d) => ({ value: d, label: d }))}
          value={density}
          onValueChange={(v) => setDensity(v as Density)}
        />
        <Select
          label="Loan list"
          options={[
            { value: "normal", label: "Loads normally" },
            { value: "slow", label: "Loads slowly" },
            { value: "error", label: "Fails to load" },
          ]}
          value={listDemo}
          onValueChange={(v) => setListDemo(v as ListDemo)}
        />
      </footer>

      {/* Dialogs */}
      <Dialog
        open={dialog === "signoff"}
        onClose={() => setDialog(null)}
        title={`Sign off ${plural(selectedExceptions.length, "exception")}?`}
        primaryLabel={`Sign off ${plural(selectedExceptions.length, "exception")}`}
        onPrimary={signOff}
      >
        <div className="dialog-body">
          <ul className="dialog-list stl-text-body">
            {selectedExceptions.map((l) => (
              <li key={l.id}>
                {l.id} · {l.lender} · {exceptionText(l)}
              </li>
            ))}
          </ul>
          {selectedLoans.length + (selection.all ? result.unseen : 0) > selectedExceptions.length && (
            <p className="stl-text-body card__muted">
              The other{" "}
              {plural(selectedLoans.length + (selection.all ? result.unseen : 0) - selectedExceptions.length, "selected loan")}{" "}
              aren't exceptions and won't change.
            </p>
          )}
          <TextInput
            id="signoff-note"
            data-autofocus=""
            label="Note"
            placeholder="e.g. 12 mo reserves"
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              if (e.target.value.trim()) setNoteError(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") signOff();
            }}
            required
            validation={noteError ? "error" : undefined}
            helper={noteError ? "Enter a note: say why the exception is acceptable." : "Required. Say why the exception is acceptable."}
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
          {selection.all
            ? `This removes every loan that matches ${describeFilters(shown.filters)}${
                selection.excluded.length ? `, except the ${plural(selection.excluded.length, "loan")} you cleared` : ""
              }, including ${plural(Math.max(0, selectedCount - gridSelected.length), "loan")} not on this page.`
            : `This includes ${plural(selection.ids.filter((id) => !pageIds.includes(id)).length, "loan")} not on this page.`}{" "}
          You can undo this right after.
        </p>
      </Dialog>

      <Dialog
        open={dialog === "saveview"}
        onClose={() => setDialog(null)}
        title="Save view"
        primaryLabel="Save view"
        onPrimary={saveView}
      >
        <div className="dialog-body">
          <p className="stl-text-body">Saves {describeFilters(applied)} under Saved by me.</p>
          <TextInput
            id="view-name"
            data-autofocus=""
            label="View name"
            placeholder="e.g. Large Harbor Point loans"
            value={viewName}
            onChange={(e) => {
              setViewName(e.target.value);
              if (e.target.value.trim()) setViewNameError(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveView();
            }}
            validation={viewNameError ? "error" : undefined}
            helper={viewNameError ? "Enter a name for the view." : undefined}
          />
        </div>
      </Dialog>

      <Dialog
        open={dialog === "submit"}
        onClose={() => setDialog(null)}
        title={`Submit ${POOL.name}?`}
        primaryLabel="Submit pool"
        onPrimary={() => {
          setSubmitted(true);
          setSelection(NOTHING);
          setDialog(null);
          showNotice({ tone: "positive", text: `Submitted ${POOL.name}.` });
        }}
      >
        <p className="stl-text-body">
          {plural(totals.loans, "loan")}, {formatMillions(totals.upb)} of the {formatMillions(POOL.targetUpb)} target.
          After you submit, the pool can't be changed here.
        </p>
      </Dialog>
    </div>
  );
}

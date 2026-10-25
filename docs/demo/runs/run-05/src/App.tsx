import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import {
  BulkActionBar,
  Button,
  Checkbox,
  DataGrid,
  Dialog,
  EmptyState,
  FilterChip,
  Icon,
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
} from "sterling-ui";
import {
  CAP_PERCENT,
  EMPTY_FILTERS,
  HARBOR_POINT,
  HARBOR_POINT_SHORT,
  LENDERS,
  PREDEFINED_VIEWS,
  describeRange,
  ficoBreaks,
  ficoReason,
  figures,
  formatAmount,
  formatMillions,
  formatPercent,
  initialState,
  ltvBreaks,
  ltvReason,
  matching,
  pageSize,
  parseRange,
  plural,
  pool,
  reasonOf,
  removeLoans,
  removeMatching,
  signOff,
  sortLoans,
  statusOf,
  totals,
  type Filters,
  type Loan,
  type PoolState,
  type SavedView,
  type SortKey,
  type Status,
} from "./pool";

// ---------------------------------------------------------------- Grid setup

const STATUSES: Status[] = ["Ready", "Exception", "Signed off"];
/** The "Any …" option of a filter select: it adds no condition. */
const ANY = "any";
const TONES: Record<Status, string> = { Ready: "positive", Exception: "warning", "Signed off": "info" };

// Column widths are numbers in DataGrid's API. 40 is size/40, the checkbox column; the rest follow
// Sterling's numeric sizing rule, with the icon allowance on the columns whose values can be flagged.
const COLUMNS: Column[] = [
  { key: "select", label: "Select", type: "checkbox", width: 40 },
  { key: "id", label: "Loan ID", type: "text", identifier: true, width: numericColumnWidth("LN-204207") },
  { key: "lender", label: "Lender", type: "text", width: numericColumnWidth("Harbor Point Lending") },
  { key: "upb", label: "UPB", type: "numeric", width: numericColumnWidth("9,999,999.00") },
  { key: "fico", label: "FICO", type: "numeric", width: numericColumnWidth("100.0%", { icon: true }) },
  { key: "ltv", label: "LTV", type: "numeric", width: numericColumnWidth("100.0%", { icon: true }) },
  { key: "status", label: "Status", type: "chip", width: numericColumnWidth("Signed off", { icon: true }) },
  { key: "reason", label: "Exception", type: "text", width: numericColumnWidth("LTV 93.0% — above 90%") },
];

function toRow(loan: Loan): GridRow {
  const status = statusOf(loan);
  const open = status === "Exception";
  const warning: string[] = [];
  const descriptions: Record<string, string> = {};
  if (ficoBreaks(loan)) {
    if (open) warning.push("fico");
    descriptions.fico = ficoReason(loan);
  }
  if (ltvBreaks(loan)) {
    if (open) warning.push("ltv");
    descriptions.ltv = ltvReason(loan);
  }
  if (loan.signOff) {
    descriptions.status = `note: ${loan.signOff.note}, by ${loan.signOff.by}, ${loan.signOff.date}`;
  }
  return {
    values: {
      id: loan.id,
      lender: loan.lender,
      upb: formatAmount(loan.upb),
      fico: String(loan.fico),
      ltv: formatPercent(loan.ltvPercent),
      status,
      reason: reasonOf(loan) ?? "—",
    },
    warning,
    descriptions,
  };
}

// ---------------------------------------------------------------- Filters in words

type FilterField = keyof Filters;

function chipsOf(f: Filters): { field: FilterField; label: string }[] {
  const chips: { field: FilterField; label: string }[] = [];
  if (f.lender) chips.push({ field: "lender", label: `Lender is ${f.lender}` });
  if (f.status) chips.push({ field: "status", label: `Status is ${f.status}` });
  if (parseRange(f.fico)) chips.push({ field: "fico", label: `FICO is ${describeRange(f.fico)}` });
  if (parseRange(f.ltv)) chips.push({ field: "ltv", label: `LTV is ${describeRange(f.ltv, "%")}` });
  return chips;
}

const sameFilters = (a: Filters, b: Filters) =>
  a.lender === b.lender && a.status === b.status && a.fico.trim() === b.fico.trim() && a.ltv.trim() === b.ltv.trim();

const clearField = (f: Filters, field: FilterField): Filters => ({ ...f, [field]: EMPTY_FILTERS[field] });

// ---------------------------------------------------------------- Loading (simulated)

interface Query {
  filters: Filters;
  sort: GridSort;
  page: number;
}

type Load = "loading" | "ready" | "error";

/** Delay before skeleton rows appear: a quick load shows nothing, as Sterling's loading pattern asks. */
const SKELETON_DELAY_MS = 300;

// ---------------------------------------------------------------- Selection

type Selection = { mode: "ids"; ids: string[] } | { mode: "all" };
const NONE: Selection = { mode: "ids", ids: [] };

interface Message {
  id: number;
  text: string;
  undo?: PoolState;
  /** Move focus to the message: the control the person used is gone. */
  focus?: boolean;
}

type Theme = "system" | "light" | "dark";
type Density = "Compact" | "Default" | "Comfortable";

const today = () => new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });

export function App() {
  // Demo settings: theme, density, and how the simulated server behaves.
  const [theme, setTheme] = useState<Theme>("system");
  const [density, setDensity] = useState<Density>("Default");
  const [slow, setSlow] = useState(false);
  const [failNext, setFailNext] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
  }, [theme]);

  // The pool.
  const [state, setState] = useState<PoolState>(initialState);
  const [poolState, setPoolState] = useState<"Draft" | "Submitted">(pool.state as "Draft");
  const fig = useMemo(() => figures(state), [state]);

  // Views and filters.
  const [myViews, setMyViews] = useState<SavedView[]>([]);
  const views = [...PREDEFINED_VIEWS, ...myViews];
  const [viewName, setViewName] = useState(PREDEFINED_VIEWS[0].name);
  const view = views.find((v) => v.name === viewName) ?? PREDEFINED_VIEWS[0];
  const [applied, setApplied] = useState<Filters>(view.filters);
  const [draft, setDraft] = useState<Filters>(view.filters);
  const [draftErrors, setDraftErrors] = useState<{ fico?: string; ltv?: string }>({});
  const edited = !sameFilters(applied, view.filters);

  const [sort, setSort] = useState<GridSort>({ key: "id", direction: "asc" });
  const [page, setPage] = useState(1);
  const [selection, setSelection] = useState<Selection>(NONE);

  // The list, loaded from a simulated server: `loaded` is the query whose rows are on screen.
  const [load, setLoad] = useState<Load>("loading");
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [loaded, setLoaded] = useState<Query | null>(null);
  const [reloads, setReloads] = useState(0);
  const firstLoad = loaded === null && load !== "error";
  const query: Query = useMemo(() => ({ filters: applied, sort, page }), [applied, sort, page]);

  useEffect(() => {
    setLoad("loading");
    setShowSkeleton(false);
    const skeleton = window.setTimeout(() => setShowSkeleton(true), SKELETON_DELAY_MS);
    const done = window.setTimeout(() => {
      window.clearTimeout(skeleton);
      setShowSkeleton(false);
      if (failNext) {
        setFailNext(false);
        setLoad("error");
        return;
      }
      setLoaded(query);
      setLoad("ready");
    }, slow ? 2500 : 700);
    return () => {
      window.clearTimeout(skeleton);
      window.clearTimeout(done);
    };
    // failNext and slow are read when a load starts; changing them doesn't start one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, reloads]);

  // What's on screen.
  const shownQuery = loaded ?? query;
  const shown = useMemo(() => matching(state, shownQuery.filters), [state, shownQuery.filters]);
  const sorted = useMemo(
    () => sortLoans(shown.sample, shownQuery.sort.key as SortKey, shownQuery.sort.direction),
    [shown, shownQuery.sort],
  );
  const pageCount = Math.max(1, Math.ceil(shown.count / pageSize));
  const first = (shownQuery.page - 1) * pageSize;
  const pageLoans = sorted.slice(first, first + pageSize);
  const pageIds = pageLoans.map((l) => l.id);
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);
  // While a load is under the skeleton delay, the previous rows stay up, so nothing flashes.
  const rows = load === "error" ? [] : pageLoans.map(toRow);
  const skeletonRows = load === "loading" && (showSkeleton || firstLoad) ? pageSize : false;

  // What the selection covers, for the current filters.
  const current = useMemo(() => matching(state, applied), [state, applied]);
  const selectedLoans =
    selection.mode === "all" ? current.sample : state.loans.filter((l) => selection.ids.includes(l.id) && !state.removed.includes(l.id));
  const selectedCount = selection.mode === "all" ? current.count : selection.ids.length;
  const selectedExceptions = selectedLoans.filter((l) => statusOf(l) === "Exception");
  const gridSelected = selection.mode === "all" ? pageIds : selection.ids;
  const beyondScreen =
    selection.mode === "all" ? current.count > pageIds.length : selection.ids.some((id) => !pageIds.includes(id));
  const allSelected = selection.mode === "all" || (selectedCount > 0 && selectedCount >= current.count);

  // Messages after an action, with Undo where the action can be undone.
  const [message, setMessage] = useState<Message | null>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  const messageRef = useRef<HTMLDivElement>(null);
  const say = (text: string, undo?: PoolState, focus = false) => setMessage({ id: Date.now(), text, undo, focus });
  useEffect(() => {
    if (!message?.focus) return;
    (undoRef.current ?? messageRef.current)?.focus();
  }, [message]);

  // ---- Filter changes

  const applyFilters = (next: Filters, keepDraft = false) => {
    setApplied(next);
    if (!keepDraft) setDraft(next);
    setDraftErrors({});
    setPage(1);
    setSelection(NONE);
  };

  const submitPanel = (event: FormEvent) => {
    event.preventDefault();
    const errors: { fico?: string; ltv?: string } = {};
    if (draft.fico.trim() && !parseRange(draft.fico)) errors.fico = "Enter a range, such as 660–679 or ≥ 680.";
    if (draft.ltv.trim() && !parseRange(draft.ltv)) errors.ltv = "Enter a range, such as > 90% or 80–90%.";
    setDraftErrors(errors);
    if (errors.fico || errors.ltv) return;
    applyFilters({ ...draft, fico: draft.fico.trim(), ltv: draft.ltv.trim() });
  };

  const chooseView = (name: string) => {
    const next = views.find((v) => v.name === name);
    if (!next) return;
    setViewName(next.name);
    applyFilters(next.filters);
  };

  const removeChip = (field: FilterField) => {
    setApplied((f) => clearField(f, field));
    setDraft((f) => clearField(f, field));
    setPage(1);
    setSelection(NONE);
  };

  /** A summary shortcut: adds one filter to those applied. */
  const addFilter = (patch: Partial<Filters>) => applyFilters({ ...applied, ...patch });

  // ---- Actions

  const [confirmRemove, setConfirmRemove] = useState(false);
  const [signing, setSigning] = useState(false);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newViewName, setNewViewName] = useState("");
  const [viewNameError, setViewNameError] = useState<string | null>(null);

  const remove = () => {
    const before = state;
    const count = selectedCount;
    setState(selection.mode === "all" ? removeMatching(state, applied) : removeLoans(state, selection.ids));
    setSelection(NONE);
    setConfirmRemove(false);
    say(`Removed ${plural(count, "loan")} from ${pool.name}.`, before, true);
  };

  const askRemove = () => (beyondScreen ? setConfirmRemove(true) : remove());

  const openSignOff = () => {
    setNote("");
    setNoteError(false);
    setSigning(true);
  };

  const confirmSignOff = () => {
    if (!note.trim()) {
      setNoteError(true);
      return;
    }
    const before = state;
    const ids = selectedExceptions.map((l) => l.id);
    setState(signOff(state, ids, note.trim(), "You", today()));
    setSelection(NONE);
    setSigning(false);
    say(`Signed off ${plural(ids.length, "exception")}: ${ids.join(", ")}.`, before, true);
  };

  const undo = (m: Message) => {
    if (!m.undo) return;
    setState(m.undo);
    say("Undone. The pool is back as it was.", undefined, true);
  };

  const openSaveView = () => {
    setNewViewName("");
    setViewNameError(null);
    setSaving(true);
  };

  const confirmSaveView = () => {
    const name = newViewName.trim();
    if (!name) return setViewNameError("Enter a name for the view.");
    if (views.some((v) => v.name.toLowerCase() === name.toLowerCase())) return setViewNameError("A view with this name exists.");
    setMyViews((list) => [...list, { name, filters: applied, mine: true }]);
    setViewName(name);
    setSaving(false);
    say(`Saved the view "${name}".`, undefined, true);
  };

  // ---- Text

  const chips = chipsOf(applied);
  const filterNote = chips.length ? ` · ${plural(chips.length, "filter")}` : "";
  const noun = shown.exact ? "pool loan" : "sample loan";
  const range = (() => {
    if (load === "error") return "Couldn't load pool loans";
    if (load === "loading" && firstLoad) return "Loading pool loans…";
    if (shown.count === 0) return `No pool loans match${filterNote}`;
    if (!pageLoans.length) return `Page ${shownQuery.page} isn't in the sample · ${plural(shown.count, noun)}${filterNote}`;
    return `Showing ${first + 1}–${first + pageLoans.length} of ${plural(shown.count, noun)}${filterNote}`;
  })();

  const countText =
    selectedCount === 0 ? "" : allSelected ? `All ${plural(selectedCount, "matching loan")} selected` : `${selectedCount} selected`;
  const signOffLabel = selectedExceptions.length > 1 ? `Sign off ${selectedExceptions.length}` : "Sign off";

  const issuesText = fig.issues === 0 ? "No pool issues" : plural(fig.issues, "pool issue");
  const submitted = poolState === "Submitted";
  const viewOptions = views.map((v) => ({ value: v.name, label: v.name === view.name && edited ? `${v.name} · edited` : v.name }));
  const hpShare = Math.round(fig.harborPointShare);
  const upbProgress = fig.upb / pool.targetUpb;

  const ids = {
    hint: useId(),
    issues: useId(),
    tab: useId(),
    panel: useId(),
    filtersHeading: useId(),
    summaryHeading: useId(),
    issuesHeading: useId(),
  };

  const grid = (
    <DataGrid
      label={`Pool loans${chips.length ? `, filtered by ${chips.map((c) => c.label).join(", ")}` : ""}`}
      columns={COLUMNS}
      rows={rows}
      tones={TONES}
      rowKey="id"
      selected={gridSelected}
      onSelectedChange={(next) => {
        if (selection.mode === "all") {
          // Changing one row ends "all matching": keep the rows still checked on this page.
          setSelection({ mode: "ids", ids: next.filter((id) => pageIds.includes(id)) });
        } else {
          setSelection({ mode: "ids", ids: next });
        }
      }}
      sort={shownQuery.sort}
      onSortChange={(next) => {
        setSort(next);
        setPage(1);
      }}
      unsortable={["reason"]}
      fill
      loading={skeletonRows}
      loadingLabel="Loading pool loans…"
      emptyLabel={
        load === "error" ? "Couldn't load pool loans" : shown.count === 0 ? "No pool loans match these filters" : "These loans aren't in the sample"
      }
      empty={
        load === "error" ? (
          <EmptyState
            tone="critical"
            title="Couldn't load pool loans"
            message="The loan list didn't load. Your filters and selection are kept. Try again."
            onAction={() => setReloads((n) => n + 1)}
          />
        ) : shown.count === 0 ? (
          <EmptyState
            title="No pool loans match these filters"
            message={`${shown.exact ? `None of the ${plural(fig.loanCount, "loan")} in ${pool.name} match` : "No loans in this demo's sample match"}. Remove a filter, or clear them all.`}
            onAction={() => applyFilters(EMPTY_FILTERS)}
          />
        ) : (
          <EmptyState
            title="These loans aren't in the sample"
            message={`This demo's data holds only the first page of each view. ${plural(shown.count - sorted.length, "more loan")} match in the pool.`}
            actionLabel="Back to page 1"
            onAction={() => setPage(1)}
          />
        )
      }
    />
  );

  return (
    <div className={`app ${density === "Default" ? "" : densityClass(density)}`}>
      {/* ---------------------------------------------------- Page header */}
      <header className="page-header">
        <div className="page-header__title">
          <nav aria-label="Breadcrumb" className="breadcrumb stl-text-body">
            <Link label="Pools" size="md" href="#" onClick={(e) => e.preventDefault()} />
            <span aria-hidden="true" className="muted">/</span>
          </nav>
          <h1 className="stl-text-title">{pool.name}</h1>
          <StatusChip label={poolState} tone={submitted ? "info" : "neutral"} />
        </div>
        <p className="page-header__criteria stl-text-caption muted">
          Criteria: {pool.criteria} · target {formatMillions(pool.targetUpb)}
        </p>
        <div className="page-header__actions">
          <span id={ids.issues} className={`issues-flag stl-text-label ${fig.issues ? "tone-warning" : "tone-positive"}`}>
            <Icon name={fig.issues ? "alert-triangle" : "circle-check"} />
            {issuesText}
            {fig.issues > 0 && <span className="visually-hidden"> block submission</span>}
          </span>
          <Button label="Save draft" kind="secondary" size="md" disabled={submitted} onClick={() => say("Draft saved.")} />
          <Button
            label={submitted ? "Submitted" : "Submit pool"}
            kind="primary"
            size="md"
            disabled={fig.issues > 0 || submitted}
            aria-describedby={ids.issues}
            onClick={() => {
              setPoolState("Submitted");
              say(`${pool.name} submitted.`);
            }}
          />
        </div>
      </header>

      <div className="layout">
        {/* -------------------------------------------------- Filters */}
        <aside className="panel filters" aria-labelledby={ids.filtersHeading}>
          <h2 id={ids.filtersHeading} className="stl-text-heading">Filter pool loans</h2>
          <form className="filters__form" onSubmit={submitPanel} noValidate>
            <Select
              label="Lender"
              placeholder="Any lender"
              showHelper={false}
              options={[{ value: ANY, label: "Any lender" }, ...LENDERS.map((l) => ({ value: l, label: l }))]}
              value={draft.lender ?? null}
              onValueChange={(v) => setDraft((f) => ({ ...f, lender: v === ANY ? null : v }))}
            />
            <Select
              label="Status"
              placeholder="Any status"
              showHelper={false}
              options={[{ value: ANY, label: "Any status" }, ...STATUSES.map((s) => ({ value: s, label: s }))]}
              value={draft.status ?? null}
              onValueChange={(v) => setDraft((f) => ({ ...f, status: v === ANY ? null : (v as Status) }))}
            />
            <TextInput
              label="FICO"
              placeholder="e.g. 660–679"
              inputMode="decimal"
              value={draft.fico}
              onChange={(e) => setDraft((f) => ({ ...f, fico: e.target.value }))}
              validation={draftErrors.fico ? "error" : undefined}
              helper={draftErrors.fico}
              showHelper={!!draftErrors.fico}
            />
            <TextInput
              label="LTV"
              placeholder="e.g. > 90%"
              inputMode="decimal"
              value={draft.ltv}
              onChange={(e) => setDraft((f) => ({ ...f, ltv: e.target.value }))}
              validation={draftErrors.ltv ? "error" : undefined}
              helper={draftErrors.ltv}
              showHelper={!!draftErrors.ltv}
            />
            <div className="filters__actions">
              <Button label="Reset" kind="ghost" onClick={() => applyFilters(view.filters)} />
              <Button label="Apply" kind="primary" type="submit" />
            </div>
          </form>
        </aside>

        {/* -------------------------------------------------- Loans */}
        <main className="loans">
          <TabList label="Pool" className="loans__tabs">
            <Tab id={ids.tab} label="Pool loans" count={fig.loanCount.toLocaleString("en-US")} selected aria-controls={ids.panel} />
            <Tab label="Add loans" count={`${totals.candidatesToAdd} candidates`} disabled title="Not available yet" />
          </TabList>

          <div id={ids.panel} role="tabpanel" aria-labelledby={ids.tab} className="loans__panel">
            <div className="toolbar">
              <span className="stl-text-body muted" aria-hidden="true">View</span>
              <Select
                label="View"
                showLabel={false}
                showHelper={false}
                className="toolbar__view"
                options={viewOptions}
                value={view.name}
                onValueChange={chooseView}
              />
              <div className="toolbar__chips" role="group" aria-label="Applied filters">
                {chips.length === 0 && <span className="stl-text-caption muted">No filters: every loan in the pool</span>}
                {chips.map((c) => (
                  <FilterChip key={c.field} label={c.label} onRemove={() => removeChip(c.field)} />
                ))}
                {chips.length > 1 && <Button label="Clear all" kind="ghost" onClick={() => applyFilters(EMPTY_FILTERS)} />}
              </div>
              <Button label="Save view" kind="ghost" disabled={!edited} onClick={openSaveView} />
            </div>

            {/* The status region stays in the page so each new message is announced; the buttons sit outside it. */}
            <div ref={messageRef} tabIndex={-1} className={message ? "notice" : undefined}>
              {message && <Icon name="info" />}
              <span role="status" className={message ? "stl-text-body notice__text" : "visually-hidden"}>
                {message?.text}
              </span>
              {message?.undo && <Button ref={undoRef} label="Undo" kind="secondary" onClick={() => undo(message)} />}
              {message && <Button label="Dismiss" kind="ghost" onClick={() => setMessage(null)} />}
            </div>

            <BulkActionBar
              count={countText}
              selectAll={`Select all ${current.count} matching`}
              showSelectAll={!allSelected}
              onSelectAll={() => setSelection({ mode: "all" })}
              hint="No Exception loans selected"
              showHint={selectedExceptions.length === 0}
              hintId={ids.hint}
            >
              <Button label="Clear selection" kind="ghost" onClick={() => setSelection(NONE)} />
              <Button
                label={signOffLabel}
                kind="ghost"
                showIcon
                icon="check"
                disabled={selectedExceptions.length === 0}
                aria-describedby={selectedExceptions.length === 0 ? ids.hint : undefined}
                onClick={openSignOff}
              />
              <Button label="Remove from pool" kind="secondary" onClick={askRemove} />
            </BulkActionBar>

            {grid}

            <Pagination
              range={range}
              page={`Page ${Math.min(shownQuery.page, pageCount)} of ${pageCount}`}
              previousDisabled={page <= 1}
              nextDisabled={page >= pageCount}
              onPrevious={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(pageCount, p + 1))}
            />
          </div>
        </main>

        {/* -------------------------------------------------- Summary */}
        <aside className="summary" aria-labelledby={ids.summaryHeading}>
          <h2 id={ids.summaryHeading} className="stl-text-heading">Pool summary</h2>

          <SummaryMetric
            className="summary__metric"
            label="Pool UPB"
            value={formatMillions(fig.upb)}
            progress={upbProgress}
            status={fig.upb > pool.targetUpb ? "over-target" : "normal"}
            detail={`${Math.round(upbProgress * 100)}% of ${formatMillions(pool.targetUpb)} target · $${formatAmount(fig.upb)}`}
            loading={firstLoad}
          />

          <section className="card" aria-label="Loans by status">
            <h3 className="stl-text-label muted">Loans by status</h3>
            <p className="status-links stl-text-body">
              {STATUSES.map((s, i) => (
                <span key={s}>
                  {i > 0 && <span aria-hidden="true" className="muted"> · </span>}
                  <Link
                    size="md"
                    href="#loans"
                    label={`${fig.byStatus[s]} ${s}`}
                    aria-label={`${fig.byStatus[s]} ${s}: filter by Status is ${s}`}
                    onClick={(e) => {
                      e.preventDefault();
                      addFilter({ status: s });
                    }}
                  />
                </span>
              ))}
            </p>
            <p className="stl-text-caption muted">Each adds a Status filter.</p>
          </section>

          <section
            id="issues"
            className={`card ${fig.issues ? "card--warning" : ""}`}
            aria-labelledby={ids.issuesHeading}
          >
            <h3 id={ids.issuesHeading} className={`card__heading stl-text-body-strong ${fig.issues ? "tone-warning" : "tone-positive"}`}>
              <Icon name={fig.issues ? "alert-triangle" : "circle-check"} />
              {fig.issues ? `Issues blocking submit (${fig.issues})` : "Nothing blocks submit"}
            </h3>
            {fig.issues === 0 && (
              <p className="stl-text-body">Every exception is signed off and no lender is over {CAP_PERCENT}%.</p>
            )}
            {fig.openExceptions.length > 0 && (
              <div className="issue">
                <p className="stl-text-body">Exceptions needing sign-off ({fig.openExceptions.length})</p>
                <Link
                  size="sm"
                  href="#loans"
                  label="Filter: Status is Exception"
                  onClick={(e) => {
                    e.preventDefault();
                    addFilter({ status: "Exception" });
                  }}
                />
              </div>
            )}
            {fig.overCap && (
              <div className="issue">
                <p className="stl-text-body">
                  Limits (1): {HARBOR_POINT_SHORT} at {hpShare}% (cap {CAP_PERCENT}%)
                </p>
                <Link
                  size="sm"
                  href="#loans"
                  label={`Filter: Lender is ${HARBOR_POINT_SHORT}`}
                  onClick={(e) => {
                    e.preventDefault();
                    addFilter({ lender: HARBOR_POINT });
                  }}
                />
              </div>
            )}
          </section>
        </aside>
      </div>

      {/* ---------------------------------------------------- Demo controls */}
      <footer className="demo" aria-label="Demo controls">
        <h2 className="stl-text-label muted">Demo controls</h2>
        <Select
          label="Theme"
          showHelper={false}
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
          showHelper={false}
          options={(["Compact", "Default", "Comfortable"] as Density[]).map((d) => ({ value: d, label: d }))}
          value={density}
          onValueChange={(v) => setDensity(v as Density)}
        />
        <Checkbox label="Slow loading" showLabel checked={slow ? "on" : "off"} onCheckedChange={(c) => setSlow(c === "on")} />
        <Checkbox
          label="Next load fails"
          showLabel
          checked={failNext ? "on" : "off"}
          onCheckedChange={(c) => setFailNext(c === "on")}
        />
        <Button label="Reload list" kind="secondary" onClick={() => setReloads((n) => n + 1)} />
      </footer>

      {/* ---------------------------------------------------- Dialogs */}
      <Dialog
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        title={`Remove ${plural(selectedCount, "loan")} from the pool?`}
        primaryLabel={`Remove ${plural(selectedCount, "loan")}`}
        onPrimary={remove}
      >
        <p className="stl-text-body">
          {selection.mode === "all"
            ? `This removes every loan that matches ${chips.length ? chips.map((c) => c.label).join(" and ") : "no filter — the whole pool"}, including the ${plural(
                Math.max(0, selectedCount - pageIds.length),
                "loan",
              )} not on this page.`
            : `This removes the ${plural(selectedCount, "selected loan")}, including ${plural(
                selection.ids.filter((id) => !pageIds.includes(id)).length,
                "loan",
              )} on other pages.`}
        </p>
        <p className="stl-text-body">You can undo this right after, from the message above the list.</p>
      </Dialog>

      <Dialog
        open={signing}
        onClose={() => setSigning(false)}
        title={`Sign off ${plural(selectedExceptions.length, "exception")}`}
        primaryLabel={`Sign off ${plural(selectedExceptions.length, "exception")}`}
        onPrimary={confirmSignOff}
      >
        <ul className="dialog-list stl-text-body">
          {selectedExceptions.map((l) => (
            <li key={l.id}>
              <span className="stl-text-body-strong">{l.id}</span> · {l.lender} · {reasonOf(l)}
            </li>
          ))}
        </ul>
        {selectedLoans.length > selectedExceptions.length && (
          <p className="stl-text-body muted">
            {selection.mode === "all" ? "The other matching loans aren't" : `The other ${plural(selectedLoans.length - selectedExceptions.length, "selected loan")} aren't`}{" "}
            exceptions, so they don't change.
          </p>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            confirmSignOff();
          }}
        >
          <TextInput
            label="Note (required)"
            placeholder="e.g. 12 mo reserves"
            data-autofocus
            required
            aria-required="true"
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              if (e.target.value.trim()) setNoteError(false);
            }}
            validation={noteError ? "error" : undefined}
            helper={noteError ? "Enter a note to sign off." : "Say why the exception is acceptable."}
          />
        </form>
      </Dialog>

      <Dialog
        open={saving}
        onClose={() => setSaving(false)}
        title="Save view"
        primaryLabel="Save view"
        onPrimary={confirmSaveView}
      >
        <p className="stl-text-body">
          Saves {chips.length ? chips.map((c) => c.label).join(", ") : "no filters"} as a view of your own.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            confirmSaveView();
          }}
        >
          <TextInput
            label="View name"
            placeholder={`e.g. ${view.name} (mine)`}
            data-autofocus
            value={newViewName}
            onChange={(e) => {
              setNewViewName(e.target.value);
              setViewNameError(null);
            }}
            validation={viewNameError ? "error" : undefined}
            helper={viewNameError ?? undefined}
            showHelper={!!viewNameError}
          />
        </form>
      </Dialog>
    </div>
  );
}

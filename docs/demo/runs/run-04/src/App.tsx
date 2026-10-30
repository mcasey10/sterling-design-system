import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import {
  BulkActionBar,
  Button,
  Checkbox,
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
import { FiltersPanel, parseDraft, toDraft, type Draft, type DraftErrors } from "./FiltersPanel";
import { PoolSummaryPanel } from "./PoolSummary";
import {
  INITIAL_STATE,
  INITIAL_VIEWS,
  PAGE_SIZE,
  appliedKeys,
  breaches,
  chipLabel,
  fmtLtv,
  fmtMillions,
  fmtUpb,
  liveLoans,
  plural,
  pool,
  removeIds,
  removeMatching,
  runQuery,
  sameFilters,
  signOff,
  statusOf,
  summarize,
  totals,
  type FilterKey,
  type Filters,
  type Loan,
  type PoolState,
  type Status,
  type View,
} from "./pool";

/* ------------------------------------------------------------------ Grid setup */

const TONES: Record<Status, StatusChipTone> = {
  Ready: "positive",
  Exception: "warning",
  "Signed off": "info",
  Ineligible: "critical",
};

// Numeric and ID columns are sized to their values (Data display guideline); flaggable ones get the icon
// allowance. Text columns are starting widths: the grid fills its container and they take the extra.
// A short numeric column must still fit its header label and sort icon at every density.
const fitHeader = (label: string, longestValue: string) =>
  Math.max(numericColumnWidth(longestValue, { icon: true }), numericColumnWidth(`${label} `, { icon: true }));

const COLUMNS: Column[] = [
  { key: "select", label: "Select", type: "checkbox", width: 40 },
  { key: "id", label: "Loan ID", type: "text", width: numericColumnWidth("LN-000000"), identifier: true },
  { key: "lender", label: "Lender", type: "text", width: 168 },
  { key: "upb", label: "UPB", type: "numeric", width: numericColumnWidth("9,999,999.00") },
  { key: "fico", label: "FICO", type: "numeric", width: fitHeader("FICO", "850") },
  { key: "ltv", label: "LTV", type: "numeric", width: fitHeader("LTV", "100.0%") },
  { key: "status", label: "Status", type: "chip", width: 112 },
  { key: "exception", label: "Exception", type: "text", width: 184 },
];

function toRow(loan: Loan): GridRow {
  const status = statusOf(loan);
  const found = breaches(loan);
  // Only an open problem is flagged in its cell; a signed-off exception keeps its reason in the Exception column.
  const flagged = status === "Exception" || status === "Ineligible" ? found : [];
  const descriptions: Record<string, string> = {};
  for (const b of flagged) {
    descriptions[b.field] = b.level === "warning" ? `${b.reason}, needs sign-off` : `${b.reason}, not eligible`;
  }
  if (loan.signOff) {
    descriptions.exception = `signed off by ${loan.signOff.by} on ${loan.signOff.date}: ${loan.signOff.note}`;
  }
  return {
    values: {
      id: loan.id,
      lender: loan.lender,
      upb: fmtUpb(loan.upb),
      fico: String(loan.fico),
      ltv: fmtLtv(loan.ltvPercent),
      status,
      exception: found.map((b) => b.reason).join("; ") || "—",
    },
    warning: flagged.filter((b) => b.level === "warning").map((b) => b.field),
    error: flagged.filter((b) => b.level === "error").map((b) => b.field),
    descriptions,
  };
}

/* ------------------------------------------------------------------ Screen state */

interface Query {
  filters: Filters;
  sort: GridSort;
  page: number;
}

/** Either a list of loans, or every loan that matches the filters except a few. */
interface Selection {
  all: boolean;
  ids: string[];
  excluded: string[];
}
const NO_SELECTION: Selection = { all: false, ids: [], excluded: [] };

interface Notice {
  id: number;
  text: string;
  tone: "info" | "positive";
  undo?: boolean;
  /** Move focus to the message, when the control that was used is gone or disabled. */
  focus?: boolean;
}

type DialogKind = "signoff" | "remove" | "saveview" | null;
type Theme = "system" | "light" | "dark";
type Density = "Compact" | "Default" | "Comfortable";

const LATENCY_MS = 700;
const SKELETON_AFTER_MS = 300;

const today = () => new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });

export function App() {
  // Pool data, and the one step that can be undone.
  const [store, setStore] = useState<PoolState>(INITIAL_STATE);
  const [undoState, setUndoState] = useState<{ state: PoolState; count: number } | null>(null);

  // Views and filters.
  const [views, setViews] = useState<View[]>(INITIAL_VIEWS);
  const [viewId, setViewId] = useState(INITIAL_VIEWS[0].id);
  const view = views.find((v) => v.id === viewId) ?? views[0];
  const [request, setRequest] = useState<Query>({
    filters: INITIAL_VIEWS[0].filters,
    sort: { key: "id", direction: "asc" },
    page: 1,
  });
  const [draft, setDraft] = useState<Draft>(toDraft(INITIAL_VIEWS[0].filters));
  const [draftErrors, setDraftErrors] = useState<DraftErrors>({});

  // The simulated server: what was asked, what has arrived, and how it went.
  const [arrived, setArrived] = useState<Query | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [failLoads, setFailLoads] = useState(false);

  const [selection, setSelection] = useState<Selection>(NO_SELECTION);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState(false);
  const [viewName, setViewName] = useState("");
  const [viewNameError, setViewNameError] = useState<string | null>(null);

  const [theme, setTheme] = useState<Theme>("system");
  const [density, setDensity] = useState<Density>("Default");

  const undoButton = useRef<HTMLDivElement>(null);
  const issuesTarget = "pool-issues";

  /* -------------------------------------------------------- Theme and density on the root element */

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    // On the root, so menus and dialogs that render outside the app follow it too.
    const root = document.documentElement;
    const classes = (["Compact", "Comfortable"] as const).map(densityClass);
    root.classList.remove(...classes);
    if (density !== "Default") root.classList.add(densityClass(density));
  }, [density]);

  /* -------------------------------------------------------- Loading */

  useEffect(() => {
    setPhase("loading");
    setShowSkeleton(false);
    const skeleton = setTimeout(() => setShowSkeleton(true), SKELETON_AFTER_MS);
    const done = setTimeout(() => {
      if (failLoads) {
        setPhase("error");
      } else {
        setArrived(request);
        setPhase("ready");
      }
    }, LATENCY_MS);
    return () => {
      clearTimeout(skeleton);
      clearTimeout(done);
    };
  }, [request, attempt, failLoads]);

  /* -------------------------------------------------------- Derived data */

  const summary = useMemo(() => summarize(store), [store]);
  const result = useMemo(() => (arrived ? runQuery(store, arrived.filters, arrived.sort) : null), [store, arrived]);
  const page = arrived?.page ?? 1;
  const total = result ? result.total : null;
  const knownCount = result?.rows.length ?? 0;
  const pageCount = Math.max(1, Math.ceil((total ?? knownCount) / PAGE_SIZE));
  const pageLoans = result ? result.rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : [];
  const pageIds = pageLoans.map((l) => l.id);
  const rows = pageLoans.map(toRow);

  // After removals, a page past the end moves back to the last page.
  useEffect(() => {
    if (phase === "ready" && arrived && arrived.page > pageCount) setRequest((r) => ({ ...r, page: pageCount }));
  }, [phase, arrived, pageCount]);

  const matchingTotal = total ?? knownCount;
  const selectedCount = selection.all ? matchingTotal - selection.excluded.length : selection.ids.length;
  const everythingSelected =
    selectedCount > 0 && total !== null && selectedCount === total && (selection.all ? selection.excluded.length === 0 : true);
  const selectedLoans: Loan[] = selection.all
    ? (result?.rows ?? []).filter((l) => !selection.excluded.includes(l.id))
    : liveLoans(store).filter((l) => selection.ids.includes(l.id));
  const selectedExceptions = selectedLoans.filter((l) => statusOf(l) === "Exception");
  const gridSelected = selection.all ? pageIds.filter((id) => !selection.excluded.includes(id)) : selection.ids;
  const offScreen = selectedCount - gridSelected.filter((id) => pageIds.includes(id)).length;

  const edited = !sameFilters(request.filters, view.filters);
  const chips = appliedKeys(request.filters);
  const filterCount = chips.length === 0 ? "no filters" : plural(chips.length, "filter");

  /* -------------------------------------------------------- Actions */

  const say = (text: string, tone: Notice["tone"] = "info", undo = false, focus = undo) =>
    setNotice({ id: Date.now(), text, tone, undo, focus });

  // After a removal the button that did it has gone with the selection, so focus moves to Undo; after a
  // sign-off the Sign off button may be disabled, so focus moves to the message.
  useEffect(() => {
    if (!notice?.focus) return;
    const target = notice.undo ? undoButton.current?.querySelector("button") : undoButton.current;
    target?.focus();
  }, [notice]);

  function applyFilters(filters: Filters) {
    setRequest((r) => ({ ...r, filters, page: 1 }));
    setDraft(toDraft(filters));
    setDraftErrors({});
    setSelection(NO_SELECTION);
  }

  function apply() {
    const { filters, errors } = parseDraft(draft);
    setDraftErrors(errors);
    if (errors.fico || errors.ltv) return;
    applyFilters(filters);
  }

  function removeFilter(key: FilterKey) {
    const next = { ...request.filters };
    delete next[key];
    applyFilters(next);
  }

  function chooseView(id: string) {
    const next = views.find((v) => v.id === id);
    if (!next) return;
    setViewId(id);
    applyFilters(next.filters);
  }

  function changeSelection(next: string[]) {
    if (!selection.all) {
      setSelection({ all: false, ids: next, excluded: [] });
      return;
    }
    const off = pageIds.filter((id) => !next.includes(id));
    const excluded = [...new Set([...selection.excluded.filter((id) => !next.includes(id)), ...off])];
    setSelection(matchingTotal - excluded.length === 0 ? NO_SELECTION : { all: true, ids: [], excluded });
  }

  function doRemove() {
    if (!arrived) return;
    const count = selectedCount;
    const next = selection.all
      ? removeMatching(store, arrived.filters, selection.excluded)
      : removeIds(store, selection.ids);
    setUndoState({ state: store, count });
    setStore(next);
    setSelection(NO_SELECTION);
    setDialog(null);
    say(`Removed ${plural(count, "loan")} from ${pool.name}.`, "info", true);
  }

  function askRemove() {
    // Removal can be undone, so ask only when it reaches loans that aren't on screen.
    if (offScreen > 0) setDialog("remove");
    else doRemove();
  }

  function undo() {
    if (!undoState) return;
    setStore(undoState.state);
    say(`Put ${plural(undoState.count, "loan")} back in ${pool.name}.`, "positive");
    setUndoState(null);
  }

  function openSignOff() {
    setNote("");
    setNoteError(false);
    setDialog("signoff");
  }

  function doSignOff() {
    const text = note.trim();
    if (!text) {
      setNoteError(true);
      return;
    }
    const ids = selectedExceptions.map((l) => l.id);
    setStore((s) => signOff(s, ids, { note: text, by: "You", date: today() }));
    setDialog(null);
    say(`Signed off ${plural(ids.length, "exception")}: ${ids.join(", ")}.`, "positive", false, true);
  }

  function openSaveView() {
    setViewName("");
    setViewNameError(null);
    setDialog("saveview");
  }

  function doSaveView() {
    const name = viewName.trim();
    if (!name) return setViewNameError("Enter a name for the view.");
    if (views.some((v) => v.name.toLowerCase() === name.toLowerCase())) {
      return setViewNameError("A view with this name already exists.");
    }
    const saved: View = { id: `view-${Date.now()}`, name, filters: request.filters };
    setViews((v) => [...v, saved]);
    setViewId(saved.id);
    setDialog(null);
    say(`Saved the view "${name}".`, "positive");
  }

  const notInDemo = (what: string) => (e: MouseEvent) => {
    e.preventDefault();
    say(`${what} isn't part of this demo.`);
  };

  /* -------------------------------------------------------- Grid states */

  let empty: ReactNode = undefined;
  let emptyLabel = "";
  if (phase === "error") {
    empty = (
      <EmptyState
        tone="critical"
        title="Couldn't load pool loans"
        message="The loan list didn't load. Your filters are kept. Try again."
        actionLabel="Retry"
        onAction={() => setAttempt((a) => a + 1)}
      />
    );
    emptyLabel = "Couldn't load pool loans";
  } else if (result && knownCount === 0) {
    empty = (
      <EmptyState
        tone="neutral"
        title="No loans match these filters"
        message={`No loans in ${pool.name} match ${chips.map((k) => chipLabel(k, arrived!.filters)).join(", ")}.`}
        actionLabel="Clear filters"
        onAction={() => applyFilters({})}
      />
    );
    emptyLabel = "No loans match these filters";
  } else if (result && pageLoans.length === 0) {
    const start = (page - 1) * PAGE_SIZE + 1;
    empty = (
      <EmptyState
        tone="neutral"
        title="This page isn't in the sample data"
        message={`The sample holds only the first page of each view, so loans ${start}–${Math.min(page * PAGE_SIZE, matchingTotal)} of ${matchingTotal} can't be shown.`}
        actionLabel="Go to page 1"
        onAction={() => setRequest((r) => ({ ...r, page: 1 }))}
      />
    );
    emptyLabel = "This page isn't in the sample data";
  }

  const loading = phase === "loading" && (showSkeleton || !arrived);
  const gridLoading: boolean | number = phase === "loading" && showSkeleton ? PAGE_SIZE : false;
  const showRows = phase !== "error" && !(phase === "loading" && showSkeleton);
  const rangeStart = (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, matchingTotal);
  const missingOnPage = result && pageLoans.length > 0 ? rangeEnd - rangeStart + 1 - pageLoans.length : 0;

  /* -------------------------------------------------------- Render */

  const issuesText = summary.issues > 0 ? plural(summary.issues, "pool issue") : "No pool issues";
  const canSubmit = summary.issues === 0 && !store.submitted;

  return (
    <div className="app stl-text-body">
      <header className="page-header">
        <div className="stack stack--tight">
          <div className="row">
            <nav aria-label="Breadcrumb" className="row">
              <Link size="md" href="#" label="Pools" onClick={notInDemo("The list of pools")} />
              <span aria-hidden="true" className="muted">
                /
              </span>
            </nav>
            <h1 className="stl-text-title heading">{pool.name}</h1>
            <StatusChip tone={store.submitted ? "info" : "neutral"} label={store.submitted ? "Submitted" : pool.state} />
          </div>
          <p className="stl-text-caption muted">
            Criteria: {pool.criteria} · target {fmtMillions(pool.targetUpb)} ·{" "}
            <Link href="#" label="Edit criteria" onClick={notInDemo("Editing criteria")} />
          </p>
        </div>
        <div className="row">
          {summary.issues > 0 ? (
            <span className="icon-text ink-warning">
              <Icon name="alert-triangle" />
              <Link
                id="issues-link"
                size="md"
                href={`#${issuesTarget}`}
                label={issuesText}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(issuesTarget)?.focus();
                }}
              />
            </span>
          ) : (
            <span className="icon-text ink-positive stl-text-body">
              <Icon name="circle-check" />
              {issuesText}
            </span>
          )}
          <Button
            kind="secondary"
            size="md"
            label="Save draft"
            disabled={store.submitted}
            onClick={() => say(`Saved ${pool.name} as a draft.`, "positive")}
          />
          <Button
            kind="primary"
            size="md"
            label="Submit pool"
            disabled={!canSubmit}
            aria-describedby={canSubmit ? undefined : "submit-why"}
            onClick={() => {
              setStore((s) => ({ ...s, submitted: true }));
              say(`Submitted ${pool.name}.`, "positive");
            }}
          />
          <span id="submit-why" className="visually-hidden">
            {store.submitted
              ? "The pool has been submitted."
              : `Available when no issues block submit. ${issuesText}.`}
          </span>
        </div>
      </header>

      <div className="layout">
        <div className="side stack">
          <FiltersPanel
            draft={draft}
            errors={draftErrors}
            onChange={(d) => {
              setDraft(d);
              setDraftErrors((e) => ({ fico: d.fico === draft.fico ? e.fico : undefined, ltv: d.ltv === draft.ltv ? e.ltv : undefined }));
            }}
            onApply={apply}
            onReset={() => applyFilters(view.filters)}
          />

          <section className="panel" aria-labelledby="demo-title">
            <h2 id="demo-title" className="stl-text-label muted">
              Demo settings
            </h2>
            <Select
              className="full"
              label="Color mode"
              options={[
                { value: "system", label: "Follow system" },
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
              ]}
              value={theme}
              onValueChange={(v) => setTheme(v as Theme)}
              showHelper={false}
            />
            <Select
              className="full"
              label="Density"
              options={(["Compact", "Default", "Comfortable"] as const).map((d) => ({ value: d, label: d }))}
              value={density}
              onValueChange={(v) => setDensity(v as Density)}
              showHelper={false}
            />
            <Checkbox
              label="Make the loan list fail to load"
              showLabel
              checked={failLoads ? "on" : "off"}
              onCheckedChange={(c) => setFailLoads(c === "on")}
            />
          </section>
        </div>

        <main className="main stack" id="loans">
          <TabList label="Pool loan lists">
            <Tab id="tab-pool" aria-controls="panel-pool" label="Pool loans" count={summary.count.toLocaleString("en-US")} selected />
            <Tab
              id="tab-add"
              label="Add loans"
              count={`${totals.candidatesToAdd} candidates`}
              disabled
              title="Adding loans isn't available yet"
            />
          </TabList>

          <div id="panel-pool" role="tabpanel" aria-labelledby="tab-pool" className="stack">
            <div className="row toolbar">
              <span aria-hidden="true" className="stl-text-body muted">
                View
              </span>
              <div className="view-select">
                <Select
                  className="full"
                  label="View"
                  showLabel={false}
                  showHelper={false}
                  options={views.map((v) => ({ value: v.id, label: v.id === viewId && edited ? `${v.name} · edited` : v.name }))}
                  value={viewId}
                  onValueChange={chooseView}
                />
              </div>
              <ul className="row plain-list" aria-label="Applied filters">
                {chips.map((k) => (
                  <li key={k}>
                    <FilterChip label={chipLabel(k, request.filters)} onRemove={() => removeFilter(k)} />
                  </li>
                ))}
              </ul>
              {chips.length > 1 && <Button kind="ghost" size="sm" label="Clear all" onClick={() => applyFilters({})} />}
              <span className="spacer" />
              <Button kind="ghost" size="sm" label="Save view" disabled={!edited} onClick={openSaveView} />
            </div>

            <div ref={undoButton} role="status" tabIndex={-1} className={notice ? "notice" : "visually-hidden"}>
              {notice && (
                <>
                  <span className={`icon-text ${notice.tone === "positive" ? "ink-positive" : "ink-info"}`}>
                    <Icon name={notice.tone === "positive" ? "circle-check" : "info"} />
                  </span>
                  <span className="stl-text-body notice__text">{notice.text}</span>
                  {notice.undo && undoState && <Button kind="secondary" size="sm" label="Undo" onClick={undo} />}
                  <IconButton kind="ghost" size="sm" icon="x" label="Dismiss message" onClick={() => setNotice(null)} />
                </>
              )}
            </div>

            <BulkActionBar
              count={
                selectedCount === 0
                  ? ""
                  : everythingSelected
                    ? `All ${matchingTotal.toLocaleString("en-US")} matching selected`
                    : `${selectedCount.toLocaleString("en-US")} selected`
              }
              selectAll={`Select all ${matchingTotal.toLocaleString("en-US")} matching`}
              showSelectAll={total !== null && !everythingSelected && total > selectedCount}
              onSelectAll={() => setSelection({ all: true, ids: [], excluded: [] })}
              hint="No Exception loans selected"
              showHint={selectedExceptions.length === 0}
              hintId="signoff-hint"
            >
              <Button kind="ghost" size="sm" label="Clear selection" onClick={() => setSelection(NO_SELECTION)} />
              <Button
                kind="secondary"
                size="sm"
                label="Sign off"
                showIcon
                icon="check"
                disabled={selectedExceptions.length === 0}
                aria-describedby={selectedExceptions.length === 0 ? "signoff-hint" : undefined}
                onClick={openSignOff}
              />
              <Button kind="secondary" size="sm" label="Remove from pool" onClick={askRemove} />
            </BulkActionBar>

            <DataGrid
              fill
              label={`Loans in ${pool.name}`}
              columns={COLUMNS}
              rows={showRows ? rows : []}
              tones={TONES}
              rowKey="id"
              selected={gridSelected}
              onSelectedChange={changeSelection}
              sort={request.sort}
              onSortChange={(sort) => setRequest((r) => ({ ...r, sort }))}
              unsortable={["exception"]}
              loading={gridLoading}
              loadingLabel="Loading loans…"
              empty={showRows || phase === "error" ? empty : undefined}
              emptyLabel={emptyLabel}
            />

            {phase !== "error" && result && knownCount > 0 && (
              <div className="stack stack--tight">
                <Pagination
                  range={`Showing ${rangeStart}–${rangeEnd} of ${plural(matchingTotal, total === null ? "sample loan" : "pool loan")} · ${filterCount}`}
                  page={`Page ${page} of ${pageCount}`}
                  previousDisabled={page <= 1 || loading}
                  nextDisabled={page >= pageCount || loading}
                  onPrevious={() => setRequest((r) => ({ ...r, page: page - 1 }))}
                  onNext={() => setRequest((r) => ({ ...r, page: page + 1 }))}
                />
                {total === null && (
                  <p className="stl-text-caption muted">
                    Sample data: the pool's total for these filters isn't known, so the list shows only the matching sample
                    loans, and selecting all matching isn't offered.
                  </p>
                )}
                {missingOnPage > 0 && (
                  <p className="stl-text-caption muted">
                    {plural(missingOnPage, "loan")} on this page {missingOnPage === 1 ? "isn't" : "aren't"} in the sample data.
                  </p>
                )}
              </div>
            )}
          </div>
        </main>

        <div className="side">
          <PoolSummaryPanel
            summary={summary}
            loading={!arrived && phase === "loading"}
            onFilter={(patch) => applyFilters({ ...request.filters, ...patch })}
          />
        </div>
      </div>

      <Dialog
        open={dialog === "signoff"}
        onClose={() => setDialog(null)}
        title={`Sign off ${plural(selectedExceptions.length, "exception")}`}
        primaryLabel={`Sign off ${plural(selectedExceptions.length, "loan")}`}
        onPrimary={doSignOff}
      >
        <div className="stack">
          <ul className="plain-list stack stack--tight">
            {selectedExceptions.map((l) => (
              <li key={l.id} className="stl-text-body">
                <span className="stl-text-body-strong">{l.id}</span> · {l.lender} ·{" "}
                {breaches(l)
                  .map((b) => b.reason)
                  .join("; ")}
              </li>
            ))}
          </ul>
          {selectedLoans.length > selectedExceptions.length && (
            <p className="stl-text-body muted">
              {plural(selectedCount - selectedExceptions.length, "other selected loan")}{" "}
              {selectedCount - selectedExceptions.length === 1 ? "isn't an exception, so it isn't" : "aren't exceptions, so they aren't"}{" "}
              affected.
            </p>
          )}
          <TextInput
            className="full"
            label="Sign-off note"
            placeholder="e.g. 12 mo reserves"
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              if (e.target.value.trim()) setNoteError(false);
            }}
            validation={noteError ? "error" : undefined}
            helper={noteError ? "Enter a note: say why the exception is acceptable." : "Required. Say why the exception is acceptable."}
            required
            data-autofocus=""
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                doSignOff();
              }
            }}
          />
        </div>
      </Dialog>

      <Dialog
        open={dialog === "remove"}
        onClose={() => setDialog(null)}
        title={`Remove ${plural(selectedCount, "loan")} from the pool?`}
        primaryLabel={`Remove ${plural(selectedCount, "loan")}`}
        onPrimary={doRemove}
      >
        <p className="stl-text-body">
          {selection.all ? (
            <>
              This removes every loan that matches{" "}
              {arrived && appliedKeys(arrived.filters).length > 0
                ? appliedKeys(arrived.filters)
                    .map((k) => chipLabel(k, arrived.filters))
                    .join(", ")
                : "the pool"}
              {selection.excluded.length > 0 && ` except the ${plural(selection.excluded.length, "loan")} you cleared`}.{" "}
            </>
          ) : null}
          {plural(offScreen, "of the selected loans", "of the selected loans")} {offScreen === 1 ? "isn't" : "aren't"} on this page.
          You can undo this right after.
        </p>
      </Dialog>

      <Dialog
        open={dialog === "saveview"}
        onClose={() => setDialog(null)}
        title="Save view"
        primaryLabel="Save view"
        onPrimary={doSaveView}
      >
        <div className="stack">
          <p className="stl-text-body">
            Saves {chips.length > 0 ? chips.map((k) => chipLabel(k, request.filters)).join(", ") : "no filters"} as a view you
            can pick from the View menu.
          </p>
          <TextInput
            className="full"
            label="View name"
            placeholder="e.g. Harbor Point exceptions"
            value={viewName}
            onChange={(e) => {
              setViewName(e.target.value);
              setViewNameError(null);
            }}
            validation={viewNameError ? "error" : undefined}
            helper={viewNameError ?? undefined}
            showHelper={!!viewNameError}
            data-autofocus=""
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                doSaveView();
              }
            }}
          />
        </div>
      </Dialog>
    </div>
  );
}

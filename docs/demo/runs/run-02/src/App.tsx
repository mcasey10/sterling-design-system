import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
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
  Tab,
  TabList,
  TextInput,
  densityClass,
  numericColumnWidth,
  type Column,
  type GridRow,
} from "sterling-ui";
import { FilterPanel } from "./FilterPanel";
import { PoolSummary } from "./PoolSummary";
import {
  breaches,
  filterChips,
  formatLtv,
  formatMillions,
  formatUpb,
  initialPool,
  noFilters,
  pageSize,
  plural,
  pool,
  poolTotals,
  query,
  sameFilters,
  savedViews,
  statusOf,
  totals as dataTotals,
  type FilterKey,
  type Filters,
  type Loan,
  type PoolState,
  type SavedView,
  type Sort,
  type Status,
} from "./model";

/* ---------- Grid columns ---------- */

const selectColumn: Column = { key: "select", label: "Select", type: "checkbox", width: 40 };
const dataColumns: Column[] = [
  { key: "id", label: "Loan ID", type: "text", identifier: true, width: numericColumnWidth("LN-000000") },
  { key: "lender", label: "Lender", type: "text", width: 168 },
  { key: "upb", label: "UPB", type: "numeric", width: numericColumnWidth("9,999,999.00") },
  { key: "fico", label: "FICO", type: "numeric", width: numericColumnWidth("FICO", { icon: true }) },
  { key: "ltv", label: "LTV", type: "numeric", width: numericColumnWidth("100.0%", { icon: true }) },
  { key: "status", label: "Status", type: "chip", width: 120 },
  { key: "exception", label: "Exception", type: "text", width: 192 },
];
const tones: Record<Status, string> = { Ready: "positive", Exception: "warning", "Signed off": "info" };

function toRow(loan: Loan): GridRow {
  const status = statusOf(loan);
  const found = breaches(loan);
  const descriptions: Record<string, string> = {};
  for (const b of found) descriptions[b.field] = b.reason;
  if (loan.signOff) {
    descriptions.status = `by ${loan.signOff.by}, ${loan.signOff.date}: ${loan.signOff.note}`;
  }
  return {
    values: {
      id: loan.id,
      lender: loan.lender,
      upb: formatUpb(loan.upb),
      fico: String(loan.fico),
      ltv: formatLtv(loan.ltvPercent),
      status,
      exception: found.length ? found.map((b) => b.reason).join("; ") : "—",
    },
    // Only an open exception is flagged: a signed-off one has been dealt with.
    warning: status === "Exception" ? found.map((b) => b.field) : undefined,
    descriptions,
  };
}

/* ---------- Loading ---------- */

type Load = "loading" | "done" | "error";
const SKELETON_AFTER_MS = 300;
const LOAD_MS = 700;

interface Notice {
  text: string;
  undo?: Pick<PoolState, "removed" | "removedGroups">;
}

type Theme = "system" | "light" | "dark";
type Density = "Compact" | "Default" | "Comfortable";

const today = () => new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });

export function App() {
  /* Display settings (demo only) */
  const [theme, setTheme] = useState<Theme>("system");
  const [density, setDensity] = useState<Density>("Default");
  const [failLoads, setFailLoads] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
  }, [theme]);

  /* The pool */
  const [poolState, setPoolState] = useState<PoolState>(initialPool);
  const [submitted, setSubmitted] = useState(false);
  const totals = useMemo(() => poolTotals(poolState), [poolState]);

  /* Views and filters */
  const [views, setViews] = useState<SavedView[]>(savedViews);
  const [viewName, setViewName] = useState(savedViews[0].name);
  const activeView = views.find((v) => v.name === viewName)!;
  const [applied, setApplied] = useState<Filters>(activeView.filters);
  const [draft, setDraft] = useState<Filters>(activeView.filters);
  const [extras, setExtras] = useState<("upb" | "loanId")[]>([]);
  const edited = !sameFilters(applied, activeView.filters);
  const chips = filterChips(applied);

  /* Loading */
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<Sort>({ key: "id", direction: "asc" });
  const [attempt, setAttempt] = useState(0);
  const [load, setLoad] = useState<Load>("loading");
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [loaded, setLoaded] = useState<{ filters: Filters; page: number } | null>(null);

  useEffect(() => {
    setLoad("loading");
    setShowSkeleton(false);
    const skeleton = setTimeout(() => setShowSkeleton(true), SKELETON_AFTER_MS);
    const done = setTimeout(() => {
      if (failLoads) setLoad("error");
      else {
        setLoaded({ filters: applied, page });
        setLoad("done");
      }
      setShowSkeleton(false);
    }, LOAD_MS);
    return () => {
      clearTimeout(skeleton);
      clearTimeout(done);
    };
    // failLoads is read when the request runs; changing it doesn't start a new one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applied, page, attempt]);

  const result = useMemo(
    () => (loaded ? query(poolState, loaded.filters, sort) : null),
    [poolState, loaded, sort],
  );
  const shownPage = loaded?.page ?? 0;
  const pageLoans = result ? result.sampleMatches.slice(shownPage * pageSize, (shownPage + 1) * pageSize) : [];
  const total = result?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const visibleIds = pageLoans.map((l) => l.id);

  /* Selection */
  const [selection, setSelection] = useState<string[]>([]);
  const [allMatching, setAllMatching] = useState(false);
  const clearSelection = () => {
    setSelection([]);
    setAllMatching(false);
  };
  // A new query starts a new selection.
  useEffect(clearSelection, [loaded?.filters]);

  const selectedLoans = result
    ? allMatching
      ? result.sampleMatches
      : poolState.loans.filter((l) => selection.includes(l.id) && !poolState.removed.includes(l.id))
    : [];
  const selectedCount = allMatching ? total : selectedLoans.length;
  const selectedExceptions = selectedLoans.filter((l) => statusOf(l) === "Exception");
  const beyondScreen = allMatching
    ? total > visibleIds.length
    : selectedLoans.some((l) => !visibleIds.includes(l.id));

  const onSelectedChange = (next: string[]) => {
    if (allMatching) {
      if (visibleIds.every((id) => next.includes(id))) return;
      setAllMatching(false);
    }
    setSelection(next);
  };

  /* Notices, and where focus goes after an action removes the control that had it */
  const [notice, setNotice] = useState<Notice | null>(null);
  const noticeRef = useRef<HTMLDivElement>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  const focusNext = useRef<(() => void) | null>(null);
  useEffect(() => {
    const run = focusNext.current;
    focusNext.current = null;
    run?.();
  });
  const focusGridStart = () =>
    document.querySelector<HTMLElement>("#pool-loans-grid thead input, #pool-loans-grid thead button")?.focus();

  /* Filters */
  const applyFilters = (next: Filters) => {
    setApplied(next);
    setDraft(next);
    setPage(0);
  };
  const removeChip = (key: FilterKey, index: number) => {
    applyFilters({ ...applied, [key]: noFilters[key] });
    focusNext.current = () => {
      const remaining = document.querySelectorAll<HTMLElement>(".applied-filters .stl-filter-chip");
      (remaining[Math.min(index, remaining.length - 1)] ?? document.getElementById("applied-filters"))?.focus();
    };
  };
  const showFromSummary = (filters: Filters) => {
    // If the filters are exactly a saved view's, that view is what the person is looking at.
    const view = views.find((v) => sameFilters(v.filters, filters));
    if (view) setViewName(view.name);
    applyFilters(filters);
    focusNext.current = () => document.getElementById("pool-loans-grid")?.focus();
  };
  const chooseView = (name: string) => {
    const view = views.find((v) => v.name === name);
    if (!view) return;
    setViewName(name);
    applyFilters(view.filters);
  };

  /* Actions */
  const [signOffOpen, setSignOffOpen] = useState(false);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [saveViewOpen, setSaveViewOpen] = useState(false);
  const [newViewName, setNewViewName] = useState("");
  const [viewNameError, setViewNameError] = useState<string>();
  const [submitOpen, setSubmitOpen] = useState(false);

  const openSignOff = () => {
    setNote("");
    setNoteError(false);
    setSignOffOpen(true);
  };
  const signOff = () => {
    if (!note.trim()) {
      setNoteError(true);
      document.getElementById("sign-off-note")?.focus();
      return;
    }
    const ids = selectedExceptions.map((l) => l.id);
    const signed = { note: note.trim(), by: "You", date: today() };
    setPoolState((s) => ({
      ...s,
      loans: s.loans.map((l) => (ids.includes(l.id) ? { ...l, signOff: signed } : l)),
    }));
    setSignOffOpen(false);
    clearSelection();
    setNotice({ text: `Signed off ${plural(ids.length, "exception")}: ${ids.join(", ")}.` });
    focusNext.current = () => noticeRef.current?.focus();
  };

  const remove = () => {
    if (!result) return;
    const loans = selectedLoans.map((l) => l.id);
    const groups = allMatching ? result.groups.map((g) => g.key) : [];
    const count = selectedCount;
    setPoolState((s) => ({
      ...s,
      removed: [...s.removed, ...loans],
      removedGroups: [...s.removedGroups, ...groups],
    }));
    setNotice({
      text: `Removed ${plural(count, "loan")} from the pool.`,
      undo: { removed: poolState.removed, removedGroups: poolState.removedGroups },
    });
    setRemoveOpen(false);
    clearSelection();
    focusNext.current = () => undoRef.current?.focus();
  };
  const requestRemove = () => (beyondScreen ? setRemoveOpen(true) : remove());
  const undo = () => {
    if (!notice?.undo) return;
    const previous = notice.undo;
    setPoolState((s) => ({ ...s, ...previous }));
    setNotice({ text: "Removal undone. The loans are back in the pool." });
    focusNext.current = () => noticeRef.current?.focus();
  };

  const exportCsv = () => {
    const header = "Loan ID,Lender,UPB,FICO,LTV,Status,Exception";
    const lines = selectedLoans.map((l) => {
      const row = toRow(l).values;
      return [row.id, row.lender, l.upb, l.fico, l.ltvPercent, row.status, row.exception === "—" ? "" : row.exception]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",");
    });
    const url = URL.createObjectURL(new Blob([[header, ...lines].join("\n")], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `pool-${pool.id}-loans.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setNotice({
      text:
        selectedLoans.length < selectedCount
          ? `Exported ${selectedLoans.length} of ${selectedCount} loans: the demo data holds only the first page.`
          : `Exported ${plural(selectedLoans.length, "loan")} to CSV.`,
    });
  };

  const saveView = () => {
    const name = newViewName.trim();
    const problem = !name
      ? "Enter a name for the view."
      : views.some((v) => v.name.toLowerCase() === name.toLowerCase())
        ? "A view with that name exists. Choose another name."
        : undefined;
    if (problem) {
      setViewNameError(problem);
      document.getElementById("view-name")?.focus();
      return;
    }
    setViews([...views, { name, filters: applied, mine: true }]);
    setViewName(name);
    setSaveViewOpen(false);
    setNotice({ text: `Saved the view "${name}".` });
  };

  const submit = () => {
    setSubmitted(true);
    setSubmitOpen(false);
    clearSelection();
    setNotice({ text: `${pool.name} is submitted.` });
    focusNext.current = () => noticeRef.current?.focus();
  };

  /* Grid content */
  const columns = submitted ? dataColumns : [selectColumn, ...dataColumns];
  const isLoading = load === "loading" && showSkeleton;
  const firstLoad = loaded === null;
  const gridSelected = allMatching ? visibleIds : selection;
  let empty = null;
  let emptyLabel = "";
  if (load === "error") {
    emptyLabel = "Couldn't load the pool's loans";
    empty = (
      <EmptyState
        tone="critical"
        title="Couldn't load the pool's loans"
        message="Something went wrong on our side. Your filters are kept; try again."
        onAction={() => setAttempt((n) => n + 1)}
      />
    );
  } else if (result && total === 0) {
    emptyLabel = "No loans match these filters";
    empty = (
      <EmptyState
        title="No loans match these filters"
        message="Remove a filter, or clear them all to see every loan in the pool."
        onAction={() => applyFilters(noFilters)}
      />
    );
  } else if (result && pageLoans.length === 0) {
    emptyLabel = "This page isn't in the sample data";
    empty = (
      <EmptyState
        title="This page isn't in the sample data"
        message="The demo data holds only the first page of each view. Go back to page 1."
        actionLabel="Go to page 1"
        onAction={() => setPage(0)}
      />
    );
  }
  const rows = load === "error" ? [] : pageLoans.map(toRow);
  const start = total === 0 ? 0 : shownPage * pageSize + 1;
  // The range says what's on screen: the sample can hold fewer rows than a full page.
  const end = rows.length > 0 ? start + rows.length - 1 : Math.min(total, (shownPage + 1) * pageSize);
  const filterCount = filterChips(loaded?.filters ?? applied).length;
  const range =
    load === "error"
      ? "Loans couldn't be loaded"
      : `Showing ${start}–${end} of ${plural(total, "pool loan")} · ${plural(filterCount, "filter")}`;

  const preventDefault = (e: MouseEvent) => e.preventDefault();

  return (
    <div className={`app ${densityClass(density)} stl-text-body`}>
      <header className="page-header">
        <div className="page-header__title">
          <nav aria-label="Breadcrumb" className="breadcrumb stl-text-body">
            <Link
              href="#"
              size="md"
              label="Pools"
              onClick={(e: MouseEvent) => {
                preventDefault(e);
                setNotice({ text: "The pools list isn't part of this demo." });
              }}
            />
            <span aria-hidden="true">/</span>
          </nav>
          <h1 className="stl-text-display">{pool.name}</h1>
          <StatusChip tone={submitted ? "positive" : "neutral"} label={submitted ? "Submitted" : pool.state} />
          <p className="page-header__criteria stl-text-caption">
            Criteria: {pool.criteria} · target {formatMillions(pool.targetUpb)} ·{" "}
            <Link
              href="#"
              label="Edit criteria"
              onClick={(e: MouseEvent) => {
                preventDefault(e);
                setNotice({ text: "Editing criteria isn't part of this demo." });
              }}
            />
          </p>
        </div>
        <div className="page-header__actions">
          {totals.issues > 0 ? (
            <span id="submit-blockers" className="tone-warning icon-text stl-text-label">
              <Icon name="alert-triangle" />
              {plural(totals.issues, "pool issue")}
              <span className="visually-hidden"> block submission. See Issues blocking submit.</span>
            </span>
          ) : (
            !submitted && (
              <span id="submit-blockers" className="tone-positive icon-text stl-text-label">
                <Icon name="circle-check" />
                Ready to submit
              </span>
            )
          )}
          <Button
            kind="secondary"
            size="md"
            label="Save draft"
            disabled={submitted}
            onClick={() =>
              setNotice({
                text: `Draft saved at ${new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}.`,
              })
            }
          />
          <Button
            kind="primary"
            size="md"
            label="Submit pool"
            disabled={submitted || totals.issues > 0}
            aria-describedby="submit-blockers"
            onClick={() => setSubmitOpen(true)}
          />
        </div>
      </header>

      <main className="layout">
        <FilterPanel
          draft={draft}
          onDraftChange={setDraft}
          extras={extras}
          onAddExtra={(key) => setExtras([...extras, key])}
          onApply={() => applyFilters(draft)}
          onReset={() => applyFilters(activeView.filters)}
        />

        <div className="layout__main">
          <TabList label="Pool sections" className="tabs">
            <Tab id="tab-pool" aria-controls="panel-pool" label="Pool loans" count={totals.count.toLocaleString("en-US")} selected />
            <Tab
              id="tab-add"
              label="Add loans"
              count={`${dataTotals.candidatesToAdd} candidates`}
              disabled
              aria-describedby="tab-add-note"
            />
          </TabList>
          <span id="tab-add-note" className="visually-hidden">
            Not available yet.
          </span>

          <div role="tabpanel" id="panel-pool" aria-labelledby="tab-pool" className="tab-panel">
            <div className="toolbar">
              <span className="stl-text-body toolbar__label" aria-hidden="true">
                View
              </span>
              <Select
                className="toolbar__view"
                label="View"
                showLabel={false}
                showHelper={false}
                options={views.map((v) => ({
                  value: v.name,
                  label: v.name === viewName && edited ? `${v.name} · edited` : v.name,
                }))}
                value={viewName}
                onValueChange={chooseView}
              />
              <div
                id="applied-filters"
                className="applied-filters"
                role="group"
                aria-label="Applied filters"
                tabIndex={-1}
              >
                {chips.length === 0 && <span className="stl-text-caption muted">No filters applied</span>}
                {chips.map((chip, index) => (
                  <FilterChip key={chip.key} label={chip.label} onRemove={() => removeChip(chip.key, index)} />
                ))}
                {chips.length > 1 && (
                  <Button kind="ghost" label="Clear all" onClick={() => removeAll()} />
                )}
              </div>
              <Button
                kind="ghost"
                label="Save view"
                disabled={!edited}
                onClick={() => {
                  setNewViewName("");
                  setViewNameError(undefined);
                  setSaveViewOpen(true);
                }}
              />
            </div>

            <div ref={noticeRef} className={notice ? "notice" : "notice notice--empty"} tabIndex={-1}>
              <div role="status" className="notice__text">
                {notice && (
                  <>
                    <Icon name="info" />
                    <span>{notice.text}</span>
                  </>
                )}
              </div>
              {notice?.undo && <Button ref={undoRef} kind="secondary" label="Undo" onClick={undo} />}
              {notice && (
                <Button kind="ghost" label="Dismiss" onClick={() => setNotice(null)} />
              )}
            </div>

            {!submitted && (
              <BulkActionBar
                count={
                  selectedCount === 0
                    ? ""
                    : allMatching
                      ? `All ${selectedCount.toLocaleString("en-US")} matching selected`
                      : `${selectedCount.toLocaleString("en-US")} selected`
                }
                selectAll={`Select all ${total.toLocaleString("en-US")} matching`}
                showSelectAll={!allMatching && selectedCount < total}
                onSelectAll={() => setAllMatching(true)}
                hint="No Exception loans selected"
                showHint={selectedExceptions.length === 0}
                hintId="sign-off-hint"
              >
                <Button
                  kind="ghost"
                  label="Clear selection"
                  onClick={() => {
                    clearSelection();
                    focusNext.current = focusGridStart;
                  }}
                />
                <Button kind="secondary" label="Export" onClick={exportCsv} />
                <Button
                  kind="secondary"
                  label="Sign off"
                  showIcon
                  icon="check"
                  disabled={selectedExceptions.length === 0}
                  aria-describedby={selectedExceptions.length === 0 ? "sign-off-hint" : undefined}
                  onClick={openSignOff}
                />
                <Button kind="secondary" label="Remove from pool" onClick={requestRemove} />
              </BulkActionBar>
            )}

            <div id="pool-loans-grid" tabIndex={-1} className="grid-frame">
              <DataGrid
                label={`Pool loans, sorted by ${dataColumns.find((c) => c.key === sort.key)?.label} ${sort.direction === "asc" ? "ascending" : "descending"}`}
                fill
                columns={columns}
                rows={isLoading || (firstLoad && load !== "error") ? [] : rows}
                tones={tones}
                rowKey="id"
                selected={gridSelected}
                onSelectedChange={onSelectedChange}
                sort={sort}
                onSortChange={setSort}
                loading={isLoading ? pageSize : false}
                loadingLabel="Loading loans…"
                empty={empty}
                emptyLabel={emptyLabel}
              />
            </div>

            <Pagination
              range={range}
              page={`Page ${Math.min(shownPage + 1, pageCount)} of ${pageCount}`}
              previousDisabled={shownPage === 0 || load === "error"}
              nextDisabled={shownPage + 1 >= pageCount || load === "error"}
              onPrevious={() => setPage(shownPage - 1)}
              onNext={() => setPage(shownPage + 1)}
            />
          </div>
        </div>

        <PoolSummary
          totals={totals}
          loading={firstLoad}
          onAddStatus={(status) => showFromSummary({ ...applied, status })}
          onShow={(filters) => showFromSummary({ ...noFilters, ...filters })}
        />
      </main>

      <footer className="demo-settings" aria-labelledby="demo-settings-heading">
        <h2 id="demo-settings-heading" className="stl-text-label">
          Display settings (demo only)
        </h2>
        <Select
          label="Color mode"
          showHelper={false}
          options={[
            { value: "system", label: "Follow the system" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
          value={theme}
          onValueChange={(v) => setTheme(v as Theme)}
        />
        <Select
          label="Density"
          showHelper={false}
          options={(["Compact", "Default", "Comfortable"] as const).map((d) => ({ value: d, label: d }))}
          value={density}
          onValueChange={(v) => setDensity(v as Density)}
        />
        <Checkbox
          label="Make loading the loans fail"
          showLabel
          checked={failLoads ? "on" : "off"}
          onCheckedChange={(c) => setFailLoads(c === "on")}
        />
      </footer>

      <Dialog
        open={signOffOpen}
        onClose={() => setSignOffOpen(false)}
        title={`Sign off ${plural(selectedExceptions.length, "exception")}?`}
        primaryLabel={`Sign off ${plural(selectedExceptions.length, "loan")}`}
        onPrimary={signOff}
      >
        <div className="dialog-body">
          <ul className="dialog-list">
            {selectedExceptions.map((l) => (
              <li key={l.id}>
                <span className="stl-text-body-strong">{l.id}</span> · {l.lender} ·{" "}
                {breaches(l)
                  .map((b) => b.reason)
                  .join("; ")}
              </li>
            ))}
          </ul>
          {selectedCount > selectedExceptions.length && (
            <p>
              The other {plural(selectedCount - selectedExceptions.length, "selected loan")}{" "}
              {selectedCount - selectedExceptions.length === 1 ? "isn't an exception" : "aren't exceptions"} and won't
              change.
            </p>
          )}
          <TextInput
            id="sign-off-note"
            data-autofocus
            label="Sign-off note"
            placeholder="e.g. 12 mo reserves"
            autoComplete="off"
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              if (e.target.value.trim()) setNoteError(false);
            }}
            validation={noteError ? "error" : undefined}
            helper={noteError ? "Enter a note to sign off." : "Required. Say why the exception is acceptable."}
            onKeyDown={(e) => {
              if (e.key === "Enter") signOff();
            }}
          />
        </div>
      </Dialog>

      <Dialog
        open={removeOpen}
        onClose={() => setRemoveOpen(false)}
        title={`Remove ${plural(selectedCount, "loan")} from the pool?`}
        primaryLabel={`Remove ${plural(selectedCount, "loan")}`}
        onPrimary={remove}
      >
        <div className="dialog-body">
          <p>
            {allMatching
              ? `This removes every loan that matches ${chips.map((c) => c.label).join(", ") || "the view"}, including ${plural(selectedCount - visibleIds.length, "loan")} not on this page.`
              : `This includes ${plural(selectedLoans.filter((l) => !visibleIds.includes(l.id)).length, "selected loan")} not on this page.`}
          </p>
          <p>You can undo this right after, from the message above the list.</p>
        </div>
      </Dialog>

      <Dialog
        open={saveViewOpen}
        onClose={() => setSaveViewOpen(false)}
        title="Save view"
        primaryLabel="Save view"
        onPrimary={saveView}
      >
        <div className="dialog-body">
          <p>Saves these filters as a view of your own: {chips.map((c) => c.label).join(", ") || "no filters"}.</p>
          <TextInput
            id="view-name"
            data-autofocus
            label="View name"
            placeholder="e.g. Harbor Point over 300k"
            autoComplete="off"
            value={newViewName}
            onChange={(e) => {
              setNewViewName(e.target.value);
              setViewNameError(undefined);
            }}
            validation={viewNameError ? "error" : undefined}
            helper={viewNameError}
            showHelper={!!viewNameError}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveView();
            }}
          />
        </div>
      </Dialog>

      <Dialog
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        title={`Submit ${pool.name}?`}
        primaryLabel="Submit pool"
        onPrimary={submit}
      >
        <div className="dialog-body">
          <p>
            You're submitting {plural(totals.count, "loan")} with a balance of {formatMillions(totals.upb)} (
            {Math.round((totals.upb / pool.targetUpb) * 100)}% of the {formatMillions(pool.targetUpb)} target).
          </p>
          <p>Once it's submitted, the pool can't be edited.</p>
        </div>
      </Dialog>
    </div>
  );

  function removeAll() {
    applyFilters(noFilters);
    focusNext.current = () => document.getElementById("applied-filters")?.focus();
  }
}

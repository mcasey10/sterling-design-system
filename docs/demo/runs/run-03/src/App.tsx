import { Fragment, useEffect, useMemo, useRef, useState } from "react";
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
  textClass,
  type Column,
  type GridRow,
  type GridSort,
} from "sterling-ui";
import {
  LENDERS,
  PAGE_SIZE,
  STATUSES,
  breaks,
  formatMillions,
  formatPercent,
  formatShare,
  formatUpb,
  plural,
  pool,
  rules,
  sampleLoans,
  savedViews,
  shortLender,
  statusOf,
  totals,
  unseenGroups,
  type GroupId,
  type Loan,
  type LoanStatus,
  type SignOff,
} from "./data";
import {
  NO_FILTERS,
  chipsFor,
  filtersFromView,
  matchesGroup,
  matchesLoan,
  parseRange,
  sameFilters,
  type Filters,
} from "./filters";
import "./app.css";

/* ---------- Grid setup ---------- */

const TONES: Record<LoanStatus, string> = { Ready: "positive", Exception: "warning", "Signed off": "info" };

const COLUMNS: Column[] = [
  { key: "select", label: "", type: "checkbox", width: 40 },
  { key: "id", label: "Loan ID", type: "text", identifier: true, width: numericColumnWidth("LN-000000") },
  { key: "lender", label: "Lender", type: "text", width: 176 },
  { key: "upb", label: "UPB", type: "numeric", width: numericColumnWidth("9,999,999.00") },
  { key: "fico", label: "FICO", type: "numeric", width: numericColumnWidth("850", { icon: true }) },
  { key: "ltv", label: "LTV", type: "numeric", width: numericColumnWidth("100.0%", { icon: true }) },
  { key: "status", label: "Status", type: "chip", width: 120 },
  { key: "exception", label: "Exception", type: "text", width: 200 },
];
const READ_ONLY_COLUMNS = COLUMNS.filter((c) => c.type !== "checkbox");

const SORT_VALUE: Record<string, (l: Loan, s: LoanStatus) => string | number> = {
  id: (l) => l.id,
  lender: (l) => l.lender,
  upb: (l) => l.upb,
  fico: (l) => l.fico,
  ltv: (l) => l.ltvPercent,
  status: (_, s) => STATUSES.indexOf(s),
  exception: (l) => breaks(l).map((b) => b.reason).join(" "),
};

/** How long the simulated server takes, and when the skeleton appears (the pattern's ~300 ms). */
const LATENCY_MS = 800;
const SKELETON_AFTER_MS = 300;

/* ---------- State types ---------- */

interface View {
  name: string;
  filters: Filters;
  mine?: boolean;
}
interface Query {
  filters: Filters;
  sort: GridSort;
  page: number;
}
interface Removal {
  ids: string[];
  groups: GroupId[];
  count: number;
}
interface Notice {
  key: number;
  text: string;
  undo?: Removal;
}
type Phase = "pending" | "loading" | "done" | "error";

const INITIAL_VIEWS: View[] = savedViews.map((v) => ({ name: v.name, filters: filtersFromView(v) }));
const TODAY = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });

export function App() {
  /* Preview settings: color mode, density, and a way to see the error state. */
  const [theme, setTheme] = useState("system");
  const [density, setDensity] = useState("Default");
  const [failNext, setFailNext] = useState(false);
  useEffect(() => {
    if (theme === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
  }, [theme]);

  /* The pool. */
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [removedGroups, setRemovedGroups] = useState<Set<GroupId>>(new Set());
  const [signOffs, setSignOffs] = useState<Record<string, SignOff>>({});
  const [submitted, setSubmitted] = useState(false);

  /* Views and filters. Starting state: the trader's "Harbor Point loans" view. */
  const [views, setViews] = useState<View[]>(INITIAL_VIEWS);
  const [viewIndex, setViewIndex] = useState(0);
  const activeView = views[viewIndex];
  const [applied, setApplied] = useState<Filters>(activeView.filters);
  const [draft, setDraft] = useState<Filters>(activeView.filters);
  const [draftErrors, setDraftErrors] = useState<{ fico?: string; ltv?: string }>({});
  const [sort, setSort] = useState<GridSort>({ key: "id", direction: "asc" });
  const [page, setPage] = useState(1);

  /* Loading: the grid shows the last query that finished loading until the next one does. */
  const query: Query = { filters: applied, sort, page };
  const queryKey = JSON.stringify(query);
  const [reloads, setReloads] = useState(0);
  const [phase, setPhase] = useState<Phase>("pending");
  const [loaded, setLoaded] = useState<Query | null>(null);
  const failNextRef = useRef(failNext);
  failNextRef.current = failNext;
  useEffect(() => {
    setPhase("pending");
    const next = JSON.parse(queryKey) as Query;
    const showSkeleton = setTimeout(() => setPhase("loading"), SKELETON_AFTER_MS);
    const finish = setTimeout(() => {
      if (failNextRef.current) {
        setFailNext(false);
        setPhase("error");
      } else {
        setLoaded(next);
        setPhase("done");
      }
    }, LATENCY_MS);
    return () => {
      clearTimeout(showSkeleton);
      clearTimeout(finish);
    };
  }, [queryKey, reloads]);

  /* Selection: loan IDs, or every loan that matches. */
  const [selection, setSelection] = useState<string[]>([]);
  const [allMatching, setAllMatching] = useState(false);

  /* Messages and dialogs. */
  const [notice, setNotice] = useState<Notice | null>(null);
  const noticeRef = useRef<HTMLDivElement>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  const [signOffOpen, setSignOffOpen] = useState(false);
  const [signOffNote, setSignOffNote] = useState("");
  const [signOffError, setSignOffError] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [saveViewOpen, setSaveViewOpen] = useState(false);
  const [viewName, setViewName] = useState("");
  const [viewNameError, setViewNameError] = useState("");
  const [submitOpen, setSubmitOpen] = useState(false);

  useEffect(() => {
    if (!notice) return;
    (notice.undo ? undoRef.current : noticeRef.current)?.focus();
  }, [notice?.key]);

  const say = (text: string, undo?: Removal) => setNotice({ key: Date.now(), text, undo });

  /* ---------- The pool, as it stands ---------- */

  const statusById = useMemo(() => {
    const m = new Map<string, LoanStatus>();
    for (const l of sampleLoans) m.set(l.id, statusOf(l, signOffs));
    return m;
  }, [signOffs]);
  const status = (l: Loan) => statusById.get(l.id)!;
  const liveLoans = sampleLoans.filter((l) => !removedIds.has(l.id));
  const liveGroups = unseenGroups.filter((g) => !removedGroups.has(g.id));

  const poolCount = liveLoans.length + liveGroups.reduce((s, g) => s + g.count, 0);
  const poolUpb = liveLoans.reduce((s, l) => s + l.upb, 0) + liveGroups.reduce((s, g) => s + g.upb, 0);
  const byStatus: Record<LoanStatus, number> = { Ready: 0, Exception: 0, "Signed off": 0 };
  for (const l of liveLoans) byStatus[status(l)]++;
  byStatus.Ready += liveGroups.reduce((s, g) => s + g.count, 0);

  const openExceptions = liveLoans.filter((l) => status(l) === "Exception");
  const lenderShares = (() => {
    const upbBy = new Map<string, number>();
    for (const l of liveLoans) upbBy.set(shortLender(l.lender), (upbBy.get(shortLender(l.lender)) ?? 0) + l.upb);
    for (const g of liveGroups) if (g.lender) upbBy.set(g.lender, (upbBy.get(g.lender) ?? 0) + g.upb);
    // Only lenders whose whole book is known can be checked: the file names the one over the cap.
    const known = new Set(totals.lendersOverTheCap.map((l) => l.lender));
    return [...upbBy]
      .filter(([lender]) => known.has(lender))
      .map(([lender, upb]) => ({ lender, share: poolUpb ? (upb / poolUpb) * 100 : 0 }));
  })();
  const overCap = lenderShares.filter((l) => l.share > rules.lenderSharePercentCap);
  const issueCount = openExceptions.length + overCap.length;

  /* ---------- The list ---------- */

  const shown = loaded ?? query;
  const matching = liveLoans
    .filter((l) => matchesLoan(l, status(l), shown.filters))
    .sort((a, b) => {
      const get = SORT_VALUE[shown.sort.key];
      const [x, y] = [get(a, status(a)), get(b, status(b))];
      const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
      return shown.sort.direction === "asc" ? c : -c;
    });
  const groupMatches = liveGroups.map((g) => ({ group: g, match: matchesGroup(g, shown.filters) }));
  const countKnown = groupMatches.every((m) => m.match !== "unknown");
  const matchingGroups = groupMatches.filter((m) => m.match === "all").map((m) => m.group);
  const matchCount = matching.length + matchingGroups.reduce((s, g) => s + g.count, 0);
  const pageCount = Math.max(1, Math.ceil(matchCount / PAGE_SIZE));
  // The file holds only the first page of a view, so later pages are out of reach unless every match is in it.
  const pageRows =
    shown.page === 1 || matchCount === matching.length
      ? matching.slice((shown.page - 1) * PAGE_SIZE, shown.page * PAGE_SIZE)
      : [];
  const pageIds = pageRows.map((l) => l.id);

  const gridRows: GridRow[] = pageRows.map((l) => {
    const s = status(l);
    const why = breaks(l);
    const signOff = l.signOff ?? signOffs[l.id];
    const descriptions: Record<string, string> = {};
    for (const b of why) descriptions[b.key] = b.reason;
    if (signOff) descriptions.status = `Signed off by ${signOff.by}, ${signOff.date}: ${signOff.note}`;
    return {
      values: {
        id: l.id,
        lender: l.lender,
        upb: formatUpb(l.upb),
        fico: String(l.fico),
        ltv: formatPercent(l.ltvPercent),
        status: s,
        exception: why.length ? why.map((b) => b.reason).join("; ") : "—",
      },
      warning: s === "Exception" ? why.map((b) => b.key) : undefined,
      descriptions,
    };
  });

  /* ---------- Selection ---------- */

  const selectedCount = allMatching ? matchCount : selection.length;
  const selectedLoans = allMatching ? matching : liveLoans.filter((l) => selection.includes(l.id));
  const selectedExceptions = selectedLoans.filter((l) => status(l) === "Exception");
  const beyondPage = allMatching
    ? matchCount > pageIds.length
    : selection.some((id) => !pageIds.includes(id));

  const clearSelection = () => {
    setSelection([]);
    setAllMatching(false);
  };

  /* ---------- Filters and views ---------- */

  const applyFilters = (f: Filters) => {
    setApplied(f);
    setDraft(f);
    setDraftErrors({});
    setPage(1);
    clearSelection();
  };

  const onApply = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: typeof draftErrors = {};
    if (draft.fico.trim() && !parseRange(draft.fico)) errors.fico = "Enter a score or range, like 660–679 or > 700.";
    if (draft.ltv.trim() && !parseRange(draft.ltv)) errors.ltv = "Enter a percent or range, like 80–90 or > 90%.";
    setDraftErrors(errors);
    if (errors.fico || errors.ltv) return;
    applyFilters(draft);
  };

  const removeChip = (field: keyof Filters) =>
    applyFilters({ ...applied, [field]: field === "lender" || field === "status" ? null : "" });

  const chooseView = (index: number) => {
    setViewIndex(index);
    applyFilters(views[index].filters);
  };

  const viewEdited = !sameFilters(applied, activeView.filters);
  const chips = chipsFor(applied);
  const shownChipCount = chipsFor(shown.filters).length;

  const saveView = () => {
    const name = viewName.trim();
    const error = !name
      ? "Enter a name for the view."
      : views.some((v) => v.name.toLowerCase() === name.toLowerCase())
        ? "A view with this name already exists. Choose another name."
        : "";
    if (error) {
      setViewNameError(error);
      document.getElementById("view-name")?.focus();
      return;
    }
    setViews([...views, { name, filters: applied, mine: true }]);
    setViewIndex(views.length);
    setSaveViewOpen(false);
    say(`Saved the view "${name}".`);
  };

  /* ---------- Actions ---------- */

  const remove = () => {
    const ids = selectedLoans.map((l) => l.id);
    const groups = allMatching ? matchingGroups.map((g) => g.id) : [];
    const removal: Removal = { ids, groups, count: selectedCount };
    setRemovedIds(new Set([...removedIds, ...ids]));
    setRemovedGroups(new Set([...removedGroups, ...groups]));
    setConfirmRemove(false);
    clearSelection();
    say(`Removed ${plural(removal.count, "loan")} from the pool.`, removal);
  };

  const onRemove = () => (beyondPage ? setConfirmRemove(true) : remove());

  const undo = (r: Removal) => {
    setRemovedIds(new Set([...removedIds].filter((id) => !r.ids.includes(id))));
    setRemovedGroups(new Set([...removedGroups].filter((g) => !r.groups.includes(g))));
    say(`Put ${plural(r.count, "loan")} back in the pool.`);
  };

  const openSignOff = () => {
    setSignOffNote("");
    setSignOffError("");
    setSignOffOpen(true);
  };

  const signOff = () => {
    const note = signOffNote.trim();
    if (!note) {
      setSignOffError("Enter a note that says why the exception is acceptable.");
      document.getElementById("sign-off-note")?.focus();
      return;
    }
    const next = { ...signOffs };
    for (const l of selectedExceptions) next[l.id] = { note, by: "You", date: TODAY };
    setSignOffs(next);
    setSignOffOpen(false);
    say(`Signed off ${plural(selectedExceptions.length, "exception")}.`);
  };

  const submit = () => {
    setSubmitted(true);
    setSubmitOpen(false);
    clearSelection();
    say(`${pool.name} was submitted.`);
  };

  /* ---------- What the list area shows ---------- */

  const firstLoad = loaded === null && phase !== "error";
  const gridLoading = phase === "loading" || (firstLoad && phase !== "pending") ? PAGE_SIZE : false;
  let empty: React.ReactNode = null;
  let emptyLabel = "";
  if (phase === "error") {
    emptyLabel = "Couldn't load pool loans";
    empty = (
      <EmptyState
        tone="critical"
        title="Couldn't load pool loans"
        message="The list didn't load. Your filters are kept, so try again."
        actionLabel="Retry"
        onAction={() => setReloads((n) => n + 1)}
      />
    );
  } else if (matchCount === 0) {
    emptyLabel = "No loans match these filters";
    empty = (
      <EmptyState
        title="No loans match these filters"
        message={`No loans in ${pool.name} match ${chips.map((c) => c.label).join(", ")}. Clear the filters to see every loan in the pool.`}
        showAction={chips.length > 0}
        actionLabel="Clear filters"
        onAction={() => applyFilters(NO_FILTERS)}
      />
    );
  } else if (pageRows.length === 0) {
    emptyLabel = `Page ${shown.page} isn't in this demo's data`;
    empty = (
      <EmptyState
        title={`Page ${shown.page} isn't in this demo's data`}
        message="The sample data holds only the first page of each view. The counts and the summary cover the whole pool."
        actionLabel="Back to page 1"
        onAction={() => setPage(1)}
      />
    );
  }
  const errorOrLoading = phase === "error" || firstLoad;
  const gridRowsShown = errorOrLoading ? [] : gridRows;

  const from = (shown.page - 1) * PAGE_SIZE + 1;
  const to = Math.min(shown.page * PAGE_SIZE, matchCount);
  const range =
    `Showing ${from}–${to} of ${plural(matchCount, "pool loan")}` +
    (countKnown ? "" : " in the sample") +
    (shownChipCount ? ` · ${plural(shownChipCount, "filter")}` : "");

  const signOffHintId = "sign-off-hint";
  const issuesId = "pool-issues";
  const panelClass = densityClass(density);
  const pct = Math.round((poolUpb / pool.targetUpb) * 100);

  return (
    <div className={`app ${panelClass} ${textClass("Body")}`}>
      {/* ---------- Pool header ---------- */}
      <header className="pool-header">
        <div className="pool-header__title">
          <nav aria-label="Breadcrumb" className="breadcrumb">
            <Link href="#" label="Pools" size="md" />
            <span aria-hidden="true" className="breadcrumb__sep">/</span>
          </nav>
          <h1 className={textClass("Display")}>{pool.name}</h1>
          <StatusChip
            tone={submitted ? "positive" : "neutral"}
            label={submitted ? "Submitted" : pool.state}
          />
        </div>
        <p className={`pool-header__criteria ${textClass("Caption")}`}>
          Criteria: {pool.criteria} · target {formatMillions(pool.targetUpb)}
        </p>
        <div className="pool-header__actions">
          <span id={issuesId} className={`issues-badge ${textClass("Label")}`} data-clear={issueCount === 0 || undefined}>
            <Icon name={issueCount ? "alert-triangle" : "circle-check"} />
            {submitted
              ? "Submitted"
              : issueCount
                ? `${plural(issueCount, "pool issue")} ${issueCount === 1 ? "blocks" : "block"} submit`
                : "No issues: ready to submit"}
          </span>
          <Button kind="secondary" size="md" label="Save draft" disabled={submitted} onClick={() => say("Draft saved.")} />
          <Button
            kind="primary"
            size="md"
            label="Submit pool"
            disabled={submitted || issueCount > 0}
            aria-describedby={issuesId}
            onClick={() => setSubmitOpen(true)}
          />
        </div>
      </header>

      <main className="workspace">
        {/* ---------- Filter panel ---------- */}
        <section className="card filter-panel" aria-labelledby="filters-heading">
          <h2 id="filters-heading" className={textClass("Heading")}>Filter pool loans</h2>
          <form className="filter-panel__form" onSubmit={onApply} noValidate>
            <Select
              label="Lender"
              options={[{ value: "", label: "Any lender" }, ...LENDERS.map((l) => ({ value: l, label: l }))]}
              value={draft.lender ?? ""}
              onValueChange={(v) => setDraft({ ...draft, lender: v || null })}
            />
            <Select
              label="Status"
              options={[{ value: "", label: "Any status" }, ...STATUSES.map((s) => ({ value: s, label: s }))]}
              value={draft.status ?? ""}
              onValueChange={(v) => setDraft({ ...draft, status: (v || null) as LoanStatus | null })}
            />
            <TextInput
              label="FICO"
              placeholder="e.g. 660–679"
              value={draft.fico}
              onChange={(e) => setDraft({ ...draft, fico: e.target.value })}
              validation={draftErrors.fico ? "error" : undefined}
              helper={draftErrors.fico}
              showHelper={!!draftErrors.fico}
            />
            <TextInput
              label="LTV"
              placeholder="e.g. > 90%"
              value={draft.ltv}
              onChange={(e) => setDraft({ ...draft, ltv: e.target.value })}
              validation={draftErrors.ltv ? "error" : undefined}
              helper={draftErrors.ltv}
              showHelper={!!draftErrors.ltv}
            />
            <div className="filter-panel__actions">
              <Button kind="ghost" label="Reset" onClick={() => applyFilters(activeView.filters)} />
              <Button kind="primary" label="Apply" type="submit" />
            </div>
          </form>
        </section>

        {/* ---------- Tabs and the list ---------- */}
        <div className="list-area">
          <TabList label="Pool sections">
            <Tab id="tab-pool" aria-controls="panel-pool" label="Pool loans" count={poolCount.toLocaleString("en-US")} selected />
            <Tab id="tab-add" label="Add loans" count={`${totals.candidatesToAdd} candidates`} disabled />
          </TabList>

          <div id="panel-pool" role="tabpanel" aria-labelledby="tab-pool" className="list-panel">
            <div className="toolbar">
              <span className={`toolbar__label ${textClass("Body")}`} aria-hidden="true">View</span>
              <Select
                className="toolbar__view"
                label="View"
                showLabel={false}
                options={views.map((v, i) => ({
                  value: String(i),
                  label: i === viewIndex && viewEdited ? `${v.name} · edited` : v.mine ? `${v.name} (mine)` : v.name,
                }))}
                value={String(viewIndex)}
                onValueChange={(v) => chooseView(Number(v))}
              />
              <div role="group" aria-label="Applied filters" className="toolbar__chips">
                {chips.length === 0 && <span className={`muted ${textClass("Caption")}`}>No filters: every loan in the pool</span>}
                {chips.map((c) => (
                  <FilterChip key={c.field} label={c.label} onRemove={() => removeChip(c.field)} />
                ))}
                {chips.length > 1 && <Button kind="ghost" label="Clear all" onClick={() => applyFilters(NO_FILTERS)} />}
              </div>
              <Button
                kind="ghost"
                label="Save view"
                className="toolbar__save"
                disabled={!viewEdited}
                onClick={() => {
                  setViewName("");
                  setViewNameError("");
                  setSaveViewOpen(true);
                }}
              />
            </div>

            <div
              ref={noticeRef}
              tabIndex={-1}
              role="status"
              className={notice ? "notice" : "notice notice--empty"}
            >
              {notice && (
                <>
                  <Icon name="circle-check" />
                  <span className="notice__text">{notice.text}</span>
                  {notice.undo && (
                    <Button
                      ref={undoRef}
                      kind="secondary"
                      label="Undo"
                      onClick={() => notice.undo && undo(notice.undo)}
                    />
                  )}
                  <Button kind="ghost" label="Dismiss" onClick={() => setNotice(null)} />
                </>
              )}
            </div>

            {!submitted && (
              <BulkActionBar
                count={
                  selectedCount === 0
                    ? ""
                    : allMatching
                      ? `All ${plural(matchCount, "matching loan")} selected`
                      : `${selectedCount} selected`
                }
                selectAll={`Select all ${matchCount} matching`}
                showSelectAll={!allMatching && matchCount > selectedCount}
                onSelectAll={() => setAllMatching(true)}
                hint="No Exception loans selected"
                showHint={selectedExceptions.length === 0}
                hintId={signOffHintId}
              >
                <Button kind="ghost" label="Clear selection" onClick={clearSelection} />
                <Button
                  kind="secondary"
                  label={selectedExceptions.length ? `Sign off ${selectedExceptions.length}` : "Sign off"}
                  showIcon
                  icon="check"
                  disabled={selectedExceptions.length === 0}
                  aria-describedby={selectedExceptions.length === 0 ? signOffHintId : undefined}
                  onClick={openSignOff}
                />
                <Button kind="secondary" label="Remove from pool" onClick={onRemove} />
              </BulkActionBar>
            )}

            <DataGrid
              label={`Pool loans, ${activeView.name}${viewEdited ? " (edited)" : ""}`}
              fill
              columns={submitted ? READ_ONLY_COLUMNS : COLUMNS}
              rows={gridRowsShown}
              tones={TONES}
              rowKey="id"
              selected={allMatching ? pageIds : selection}
              onSelectedChange={(next) => {
                setAllMatching(false);
                setSelection(next);
              }}
              sort={sort}
              onSortChange={setSort}
              unsortable={["select"]}
              loading={gridLoading}
              loadingLabel="Loading loans…"
              empty={empty}
              emptyLabel={emptyLabel}
            />

            {!errorOrLoading && matchCount > 0 && (
              <Pagination
                range={range}
                page={`Page ${shown.page} of ${pageCount}`}
                previousDisabled={page <= 1}
                nextDisabled={page >= pageCount}
                onPrevious={() => setPage((p) => Math.max(1, p - 1))}
                onNext={() => setPage((p) => Math.min(pageCount, p + 1))}
              />
            )}
          </div>
        </div>

        {/* ---------- Pool summary ---------- */}
        <aside className="summary" aria-labelledby="summary-heading">
          <h2 id="summary-heading" className={textClass("Heading")}>Pool summary</h2>
          <SummaryMetric
            label="Pool UPB"
            value={formatMillions(poolUpb)}
            progress={poolUpb / pool.targetUpb}
            status={poolUpb > pool.targetUpb ? "over-target" : "normal"}
            detail={`${pct}% of ${formatMillions(pool.targetUpb)} target`}
            loading={firstLoad}
            className="summary__metric"
          />

          <section className="card" aria-labelledby="by-status-heading">
            <h3 id="by-status-heading" className={`muted ${textClass("Label")}`}>Loans by status</h3>
            <p className="link-row">
              {STATUSES.map((s, i) => (
                <Fragment key={s}>
                  {i > 0 && <span aria-hidden="true"> · </span>}
                  <Link
                    className="link-row__item"
                    href="#"
                    size="md"
                    label={`${byStatus[s].toLocaleString("en-US")} ${s}`}
                    aria-label={`${byStatus[s]} ${s}: show ${s} loans`}
                    onClick={(e) => {
                      e.preventDefault();
                      applyFilters({ ...applied, status: s });
                    }}
                  />
                </Fragment>
              ))}
            </p>
            <p className={`muted ${textClass("Caption")}`}>Each adds a Status filter.</p>
          </section>

          <section className="card" aria-labelledby="issues-heading">
            <h3
              id="issues-heading"
              className={`issues-heading ${textClass("Body-strong")}`}
              data-clear={issueCount === 0 || undefined}
            >
              <Icon name={issueCount ? "alert-triangle" : "circle-check"} />
              {issueCount ? `Issues blocking submit (${issueCount})` : "Nothing blocks submit"}
            </h3>
            {issueCount === 0 && (
              <p className={`muted ${textClass("Caption")}`}>
                Every exception is signed off and no lender is over {rules.lenderSharePercentCap}%.
              </p>
            )}
            {openExceptions.length > 0 && (
              <div className="issue">
                <p>Exceptions needing sign-off ({openExceptions.length})</p>
                <Link
                  href="#"
                  label="Filter: Status is Exception"
                  onClick={(e) => {
                    e.preventDefault();
                    const i = views.findIndex((v) => sameFilters(v.filters, { ...NO_FILTERS, status: "Exception" }));
                    if (i >= 0) chooseView(i);
                    else applyFilters({ ...NO_FILTERS, status: "Exception" });
                  }}
                />
              </div>
            )}
            {overCap.length > 0 && (
              <div className="issue">
                <p>
                  Limits ({overCap.length}):{" "}
                  {overCap.map((l) => `${l.lender} at ${formatShare(l.share)}`).join(", ")} (cap{" "}
                  {rules.lenderSharePercentCap}%)
                </p>
                {overCap.map((l) => (
                  <Link
                    key={l.lender}
                    href="#"
                    label={`Filter: Lender is ${l.lender}`}
                    onClick={(e) => {
                      e.preventDefault();
                      const i = views.findIndex((v) => sameFilters(v.filters, { ...NO_FILTERS, lender: l.lender }));
                      if (i >= 0) chooseView(i);
                      else applyFilters({ ...NO_FILTERS, lender: l.lender });
                    }}
                  />
                ))}
              </div>
            )}
          </section>
        </aside>
      </main>

      {/* ---------- Preview settings (not part of the product screen) ---------- */}
      <footer className="preview" aria-labelledby="preview-heading">
        <h2 id="preview-heading" className={`muted ${textClass("Label")}`}>Preview settings</h2>
        <Select
          label="Color mode"
          options={[
            { value: "system", label: "Follow system" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
          value={theme}
          onValueChange={setTheme}
        />
        <Select
          label="Density"
          options={["Compact", "Default", "Comfortable"].map((d) => ({ value: d, label: d }))}
          value={density}
          onValueChange={setDensity}
        />
        <div className="preview__check">
          <Checkbox
            label="Make the next load fail"
            showLabel
            checked={failNext ? "on" : "off"}
            onCheckedChange={(c) => setFailNext(c === "on")}
          />
          <Button kind="secondary" label="Reload the list" showIcon icon="refresh" onClick={() => setReloads((n) => n + 1)} />
        </div>
      </footer>

      {/* ---------- Dialogs ---------- */}
      <Dialog
        open={signOffOpen}
        onClose={() => setSignOffOpen(false)}
        title={`Sign off ${plural(selectedExceptions.length, "exception")}?`}
        primaryLabel={`Sign off ${plural(selectedExceptions.length, "exception")}`}
        onPrimary={signOff}
      >
        <div className="dialog-body">
          <ul className="dialog-list">
            {selectedExceptions.map((l) => (
              <li key={l.id}>
                <span className={textClass("Body-strong")}>{l.id}</span> · {breaks(l).map((b) => b.reason).join("; ")}
              </li>
            ))}
          </ul>
          {selectedLoans.length > selectedExceptions.length && (
            <p className="muted">
              {selectedLoans.length - selectedExceptions.length === 1
                ? "The other selected loan isn't an exception and stays as it is."
                : `The other ${plural(selectedLoans.length - selectedExceptions.length, "selected loan")} aren't exceptions and stay as they are.`}
            </p>
          )}
          <TextInput
            data-autofocus
            id="sign-off-note"
            label="Sign-off note"
            placeholder="e.g. 12 mo reserves"
            value={signOffNote}
            onChange={(e) => {
              setSignOffNote(e.target.value);
              if (signOffError) setSignOffError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && signOff()}
            required
            validation={signOffError ? "error" : undefined}
            helper={signOffError || "Required. Say why the exception is acceptable."}
          />
        </div>
      </Dialog>

      <Dialog
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        title={`Remove ${plural(selectedCount, "loan")} from the pool?`}
        primaryLabel={`Remove ${plural(selectedCount, "loan")}`}
        onPrimary={remove}
      >
        <p className="dialog-body">
          {allMatching
            ? `This includes every loan that matches ${chips.map((c) => c.label).join(", ") || "the pool"}: ${
                matchCount - pageIds.length
              } of them aren't on this page.`
            : `${plural(selection.filter((id) => !pageIds.includes(id)).length, "selected loan")} aren't on this page.`}{" "}
          You can undo this right after.
        </p>
      </Dialog>

      <Dialog
        open={saveViewOpen}
        onClose={() => setSaveViewOpen(false)}
        title="Save view"
        primaryLabel="Save view"
        onPrimary={saveView}
      >
        <div className="dialog-body">
          <p className="muted">Saves these filters: {chips.map((c) => c.label).join(", ") || "none"}.</p>
          <TextInput
            data-autofocus
            id="view-name"
            label="View name"
            placeholder="e.g. Harbor Point, high LTV"
            value={viewName}
            onChange={(e) => {
              setViewName(e.target.value);
              if (viewNameError) setViewNameError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && saveView()}
            validation={viewNameError ? "error" : undefined}
            helper={viewNameError}
            showHelper={!!viewNameError}
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
        <p className="dialog-body">
          {plural(poolCount, "loan")}, {formatMillions(poolUpb)} ({pct}% of the {formatMillions(pool.targetUpb)} target).
          After you submit, the pool can't be changed here.
        </p>
      </Dialog>
    </div>
  );
}

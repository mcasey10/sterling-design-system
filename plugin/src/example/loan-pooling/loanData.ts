// Loan-pooling example: sample data, workflow terms, and rules. Hypothetical data only — fictional
// lenders and loan IDs. The screens and the About frame both read from here, so they can't drift.
//
// Pool workflow: Draft → Submit pool → Submitted. Submit pool is enabled only with 0 issues;
// submitted pools are read-only.
// Loan workflow (inside a Draft pool): Available → Add to pool → Ready (eligible) or Exception
// (needs sign-off); Exception → Sign off → Signed off; Remove from pool returns any loan to
// Available; Ineligible loans can't be added. Loans lock with the pool.
// Issues (block Submit pool): each Exception loan, and each limit breach.

import { stretches } from "../../library/components/grid";
import type { Column, Dataset, GridRow } from "../../library/components/grid";
import { columnSpan } from "../../core/layout";
import { numericColumnWidth } from "../../core/helpers";

// ------------------------------------------------------------ Grid widths

/** The grid area between the filter panel and the summary panel: 8 of 12 columns. */
export const MAIN_WIDTH = columnSpan(8);
/** A grid component is 2px wider than its columns (its 1px border on each side). */
export const GRID_BORDER = 2;

/**
 * Column set that fills `total` exactly, so the grid spans the space between the panels with no
 * horizontal gap. Each column's width is its minimum; the leftover space is shared among the columns that
 * stretch (descriptive text; see `stretches` in grid.ts) in proportion to those minimums, rounded to whole
 * pixels, and `flexKey` (Lender) absorbs the rounding remainder. Numeric, identifier, chip, and checkbox
 * columns stay at their value-sized minimums: a numeric column wider than its values would pull the header's
 * sort icon away from its right-aligned label, and an ID gains nothing from extra room.
 */
export function fitColumns(columns: Column[], flexKey: string, total = MAIN_WIDTH - GRID_BORDER): Column[] {
  const grows = stretches;
  const base = columns.reduce((a, c) => a + c.width, 0);
  const growBase = columns.filter(grows).reduce((a, c) => a + c.width, 0);
  const extra = Math.max(0, total - base);
  const sized = columns.map((c) => (grows(c) ? { ...c, width: Math.floor(c.width + (extra * c.width) / growBase) } : c));
  const used = sized.reduce((a, c) => a + c.width, 0);
  return sized.map((c) => (c.key === flexKey ? { ...c, width: c.width + (total - used) } : c));
}

// ------------------------------------------------------------ Pool and counts

export const POOL = {
  id: "2026-07",
  name: "Pool 2026-07",
  /** Breadcrumb link back to the pool list; the title follows it on the same line. */
  breadcrumb: "Pools",
  state: "Draft",
  criteria: "30-yr fixed · coupon 5.750–7.250%",
  coupon: [5.75, 7.25] as [number, number],
  targetM: 50.0,
  upbM: 42.6,
};

/** Totals beyond the visible page; the visible rows below must not contradict them. */
export const COUNTS = {
  pool: { Ready: 181, Exception: 2, "Signed off": 3 } as Record<PoolStatus, number>,
  candidates: { Eligible: 56, Exception: 4, Ineligible: 2 } as Record<Eligibility, number>,
  limitBreaches: [{ lender: "Harbor Point", share: 32, cap: 30 }],
};

export const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);
export const poolTotal = () => sum(COUNTS.pool);
export const candidateTotal = () => sum(COUNTS.candidates);
/** Ineligible loans can't be selected. */
export const addableTotal = () => COUNTS.candidates.Eligible + COUNTS.candidates.Exception;
export const issueCount = () => COUNTS.pool.Exception + COUNTS.limitBreaches.length;
export const PAGE_SIZE = 12;
export const pages = (n: number) => Math.ceil(n / PAGE_SIZE);

// ------------------------------------------------------------ Eligibility rules

export type Eligibility = "Eligible" | "Exception" | "Ineligible";
export type PoolStatus = "Ready" | "Exception" | "Signed off";

export const RULES = {
  eligible: "FICO ≥ 680 and LTV ≤ 90%",
  exception: "FICO 660–679 or LTV 90–95%",
  ineligible: "FICO < 660 or LTV > 95%",
  limit: "Largest lender share ≤ 30% of pool UPB",
};

/** Eligibility from FICO and LTV, with the failing fields and their explanation ("FICO 672 — below 680"). */
export function classify(fico: number, ltv: number): { eligibility: Eligibility; failing: { key: "fico" | "ltv"; text: string }[] } {
  const ltvText = `${ltv.toFixed(1)}%`;
  if (fico < 660 || ltv > 95) {
    const failing: { key: "fico" | "ltv"; text: string }[] = [];
    if (fico < 660) failing.push({ key: "fico", text: `FICO ${fico} — below 660` });
    if (ltv > 95) failing.push({ key: "ltv", text: `LTV ${ltvText} — above 95%` });
    return { eligibility: "Ineligible", failing };
  }
  const failing: { key: "fico" | "ltv"; text: string }[] = [];
  if (fico < 680) failing.push({ key: "fico", text: `FICO ${fico} — below 680` });
  if (ltv > 90) failing.push({ key: "ltv", text: `LTV ${ltvText} — above 90%` });
  return { eligibility: failing.length ? "Exception" : "Eligible", failing };
}

/** 412500 → "412,500.00". Explicit, because toLocaleString ignores locales in Figma's plugin sandbox. */
const money = (n: number) => {
  const [whole, cents] = n.toFixed(2).split(".");
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${cents}`;
};
export const millions = (m: number) => `$${m.toFixed(1)}M`;

// ------------------------------------------------------------ Pool loans

interface PoolLoan {
  id: string;
  lender: string;
  upb: number;
  fico: number;
  ltv: number;
  signOff?: { note: string; by: string; date: string };
  selected?: boolean;
}

/**
 * Sample of the pool's 186 loans. The Pool loans screen shows the saved view "Harbor Point loans"
 * (12 of 58); the Exceptions view shows both open exceptions. Every Exception and Signed-off loan in
 * the pool is in this sample (2 and 3), so those views are complete.
 */
export const POOL_LOANS: PoolLoan[] = [
  { id: "LN-204207", lender: "Harbor Point Lending", upb: 198400, fico: 728, ltv: 76.0 },
  { id: "LN-204219", lender: "Harbor Point Lending", upb: 264750, fico: 744, ltv: 81.5, selected: true },
  { id: "LN-204233", lender: "Harbor Point Lending", upb: 175900, fico: 701, ltv: 88.0 },
  { id: "LN-204248", lender: "Harbor Point Lending", upb: 309200, fico: 762, ltv: 70.4, selected: true },
  { id: "LN-204261", lender: "Harbor Point Lending", upb: 221300, fico: 671, ltv: 84.0, signOff: { note: "12 mo reserves", by: "J. Moore", date: "Oct 7" } },
  { id: "LN-204277", lender: "Harbor Point Lending", upb: 156800, fico: 719, ltv: 79.9 },
  { id: "LN-204290", lender: "Harbor Point Lending", upb: 287600, fico: 735, ltv: 74.0, selected: true },
  { id: "LN-204305", lender: "Harbor Point Lending", upb: 233450, fico: 692, ltv: 86.0 },
  { id: "LN-204318", lender: "Harbor Point Lending", upb: 190250, fico: 755, ltv: 68.5 },
  { id: "LN-204381", lender: "Harbor Point Lending", upb: 412500, fico: 742, ltv: 78.5 },
  { id: "LN-204382", lender: "Cedar Ridge Capital", upb: 287900, fico: 718, ltv: 80.0 },
  { id: "LN-204383", lender: "Northgate Home Loans", upb: 615000, fico: 781, ltv: 65.2 },
  { id: "LN-204384", lender: "Quarry Lane Mortgage", upb: 198250, fico: 694, ltv: 91.5, signOff: { note: "DTI 28%", by: "J. Moore", date: "Oct 6" } },
  { id: "LN-204385", lender: "Tallgrass Lending Co.", upb: 356400, fico: 735, ltv: 75.0 },
  { id: "LN-204386", lender: "Pinecrest Funding", upb: 522000, fico: 672, ltv: 85.0 },
  { id: "LN-204387", lender: "Harbor Point Lending", upb: 243800, fico: 755, ltv: 82.0 },
  { id: "LN-204388", lender: "Cedar Ridge Capital", upb: 471150, fico: 664, ltv: 88.0, signOff: { note: "24 mo reserves", by: "J. Moore", date: "Oct 8" } },
  { id: "LN-204389", lender: "Harbor Point Lending", upb: 305600, fico: 702, ltv: 93.0 },
  { id: "LN-204390", lender: "Quarry Lane Mortgage", upb: 389900, fico: 749, ltv: 72.4 },
  { id: "LN-204391", lender: "Tallgrass Lending Co.", upb: 164300, fico: 701, ltv: 80.0 },
  { id: "LN-204392", lender: "Pinecrest Funding", upb: 598700, fico: 792, ltv: 60.0 },
];

export function poolStatus(l: PoolLoan): PoolStatus {
  const { eligibility } = classify(l.fico, l.ltv);
  if (eligibility === "Eligible") return "Ready";
  return l.signOff ? "Signed off" : "Exception";
}

// ------------------------------------------------------------ Filters and views

/** One filter: the chip text, the panel field it fills, and the test every visible row must pass. */
export interface Filter<T> {
  chip: string;
  field: string;
  panel: string;
  test: (row: T) => boolean;
}

const HARBOR_POINT = COUNTS.limitBreaches[0].lender;

/** Pool loans screen: the saved view "Harbor Point loans" (the same filter as the limit issue's link). */
export const POOL_VIEW = {
  name: "Harbor Point loans",
  edited: false,
  filters: [
    { chip: `Lender is ${HARBOR_POINT}`, field: "Lender", panel: HARBOR_POINT, test: (l: PoolLoan) => l.lender.startsWith(HARBOR_POINT) },
  ] as Filter<PoolLoan>[],
  /** Matching pool loans: 58 × ~$235K ≈ $13.6M = 32% of $42.6M. */
  total: 58,
};

/** Exceptions to sign off: Status is Exception (2 loans), plus the Sign-off note column. */
export const EXCEPTIONS_VIEW = {
  name: "Exceptions to sign off",
  edited: false,
  filters: [
    { chip: "Status is Exception", field: "Status", panel: "Exception", test: (l: PoolLoan) => poolStatus(l) === "Exception" },
  ] as Filter<PoolLoan>[],
  total: COUNTS.pool.Exception,
};

const poolMatches = (view: { filters: Filter<PoolLoan>[] }) => POOL_LOANS.filter((l) => view.filters.every((f) => f.test(l)));

// Minimum widths: numeric columns from numericColumnWidth() for the longest value, with room for the
// warning / error icon in columns whose cells can be flagged (FICO, LTV); chips fit "Signed off" /
// "Ineligible"; Lender fits the longest lender name.
const UPB_WIDTH = numericColumnWidth("598,700.00"); // 104
const FICO_WIDTH = numericColumnWidth("672", { icon: true }); // 64
const LTV_WIDTH = numericColumnWidth("93.0%", { icon: true }); // 80
const RATE_WIDTH = numericColumnWidth("6.875%"); // 72
// fitColumns shares the remaining width across the descriptive text columns (Loan ID is an identifier).
const BASE_POOL_COLUMNS: Column[] = [
  { key: "select", label: "", type: "checkbox", width: 40 },
  { key: "loanId", label: "Loan ID", type: "text", width: 88, identifier: true },
  { key: "lender", label: "Lender", type: "text", width: 160 },
  { key: "upb", label: "UPB", type: "numeric", width: UPB_WIDTH },
  { key: "fico", label: "FICO", type: "numeric", width: FICO_WIDTH },
  { key: "ltv", label: "LTV", type: "numeric", width: LTV_WIDTH },
  { key: "status", label: "Status", type: "chip", width: 104 },
  { key: "exception", label: "Exception", type: "text", width: 168 }, // fits "LTV 93.0% — above 90%"
];
/** Pool views without the note column (All pool loans, Harbor Point loans): the other columns have room. */
const POOL_COLUMNS = fitColumns(BASE_POOL_COLUMNS, "lender");
/**
 * Exceptions to sign off: adds Sign-off note. In this view the note only ever says "Needs sign-off", so
 * the column is 112px and UPB stays. (The Signed off view adds a wider note column for the full note.)
 */
const EXCEPTION_COLUMNS = fitColumns(
  [...BASE_POOL_COLUMNS, { key: "note", label: "Sign-off note", type: "text", width: 112 }], "lender"
);

const STATUS_TONES: Record<PoolStatus, string> = { Ready: "positive", Exception: "warning", "Signed off": "info" };

function poolRow(l: PoolLoan): GridRow {
  const status = poolStatus(l);
  const { failing } = classify(l.fico, l.ltv);
  const exception = failing.map((f) => f.text).join("; ") || "—";
  const note = status === "Exception" ? "Needs sign-off" : l.signOff ? `${l.signOff.note} · ${l.signOff.by} · ${l.signOff.date}` : "—";
  const ink: Record<string, string> = {};
  if (status !== "Exception") ink.exception = "text/secondary"; // "—", or kept for audit once signed off
  if (status === "Ready") ink.note = "text/secondary";
  if (status === "Exception") ink.note = "status/warning-strong";
  return {
    values: {
      loanId: l.id, lender: l.lender, upb: money(l.upb), fico: String(l.fico), ltv: `${l.ltv.toFixed(1)}%`,
      status, exception, note,
    },
    selected: l.selected,
    // Only open exceptions flag their failing cell; signed-off loans show normal cells.
    warning: status === "Exception" ? failing.map((f) => f.key) : undefined,
    ink,
  };
}

/** Pool loans screen grid: page 1 of the Harbor Point loans view. */
export const POOL_DATA: Dataset = {
  columns: POOL_COLUMNS,
  rows: poolMatches(POOL_VIEW).slice(0, PAGE_SIZE).map(poolRow),
  tones: STATUS_TONES,
  sortKey: "loanId",
  inkOverrides: true,
};

/** The view "Exceptions to sign off" (Status is Exception): every open exception, none selected. */
export const EXCEPTIONS_DATA: Dataset = {
  ...POOL_DATA,
  columns: EXCEPTION_COLUMNS,
  rows: poolMatches(EXCEPTIONS_VIEW).map((l) => poolRow({ ...l, selected: false })),
};

/** Selected rows on the Pool loans screen (all Ready → the bulk bar shows Remove from pool). */
export const SELECTED_POOL_LOANS = poolMatches(POOL_VIEW).slice(0, PAGE_SIZE).filter((l) => l.selected);
/** The loan in the Sign off dialog: the Exception selected in bar state a, which opens the dialog. */
export const SIGN_OFF_LOAN = POOL_LOANS.find((l) => l.id === "LN-204389")!;

// ------------------------------------------------------------ Bulk action bar states

/** State a: one Exception and one Ready loan selected on the Harbor Point view → "Sign off 1 exception". */
export const BAR_STATE_A = ["LN-204387", "LN-204389"];

/** Exceptions among loans (for "Sign off N exception(s)"). */
export const exceptionsIn = (ids: string[]) =>
  POOL_LOANS.filter((l) => ids.includes(l.id) && poolStatus(l) === "Exception").length;

/** Every loan matching the Harbor Point view (state b: all 58 selected) — only those in the sample are known. */
export const viewExceptions = () => poolMatches(POOL_VIEW).filter((l) => poolStatus(l) === "Exception").length;

/** Page 1 of the Harbor Point view with a different selection (bar states a and b), built as its own grid. */
const poolPageWith = (selected: (id: string) => boolean): Dataset => ({
  ...POOL_DATA,
  rows: poolMatches(POOL_VIEW).slice(0, PAGE_SIZE).map((l) => poolRow({ ...l, selected: selected(l.id) })),
});
export const POOL_STATE_A_DATA = poolPageWith((id) => BAR_STATE_A.includes(id));
export const POOL_STATE_B_DATA = poolPageWith(() => true);

export const signOffLabel = (n: number) => (n ? `Sign off ${n} exception${n === 1 ? "" : "s"}` : "Sign off");
export const removeLabel = (n: number) => `Remove ${n} loan${n === 1 ? "" : "s"}`;
export const SIGN_OFF_HINT = "No Exception loans selected";

/** State d: a submitted pool, read-only (no checkboxes, no bar). Illustrative rows: Ready and Signed off only. */
export const SUBMITTED_DATA: Dataset = {
  columns: fitColumns(BASE_POOL_COLUMNS.filter((c) => c.type !== "checkbox"), "lender"),
  rows: ["LN-204207", "LN-204219", "LN-204233", "LN-204261"]
    .map((id) => POOL_LOANS.find((l) => l.id === id)!)
    .map((l) => poolRow({ ...l, selected: false })),
  tones: STATUS_TONES,
  sortKey: "loanId",
  inkOverrides: true,
};

// ------------------------------------------------------------ Candidates (Add loans)

interface Candidate {
  id: string;
  lender: string;
  upb: number;
  rate: number;
  fico: number;
  ltv: number;
  selected?: boolean;
}

/**
 * Sample of the 62 candidates (purchased loans not yet in any pool that meet the pool criteria; loans in other pools
 * are excluded). Both Ineligible candidates are here. The Add loans screen shows those matching its
 * edited view.
 */
const CANDIDATES: Candidate[] = [
  { id: "LN-204501", lender: "Cedar Ridge Capital", upb: 318200, rate: 6.25, fico: 731, ltv: 79.0 },
  { id: "LN-204502", lender: "Northgate Home Loans", upb: 512600, rate: 6.125, fico: 768, ltv: 72.0, selected: true },
  { id: "LN-204503", lender: "Quarry Lane Mortgage", upb: 276450, rate: 6.5, fico: 702, ltv: 86.5 },
  { id: "LN-204504", lender: "Tallgrass Lending Co.", upb: 387400, rate: 6.375, fico: 712, ltv: 92.0, selected: true },
  { id: "LN-204505", lender: "Pinecrest Funding", upb: 441900, rate: 6.0, fico: 755, ltv: 74.3 },
  { id: "LN-204506", lender: "Harbor Point Lending", upb: 233700, rate: 6.875, fico: 651, ltv: 88.0 },
  { id: "LN-204507", lender: "Cedar Ridge Capital", upb: 205300, rate: 6.625, fico: 714, ltv: 92.5 },
  { id: "LN-204508", lender: "Northgate Home Loans", upb: 362800, rate: 5.875, fico: 790, ltv: 68.0 },
  { id: "LN-204509", lender: "Quarry Lane Mortgage", upb: 298150, rate: 7.0, fico: 722, ltv: 96.8 },
  { id: "LN-204510", lender: "Tallgrass Lending Co.", upb: 455000, rate: 6.25, fico: 741, ltv: 80.0 },
  { id: "LN-204511", lender: "Pinecrest Funding", upb: 189600, rate: 6.75, fico: 699, ltv: 89.5 },
  { id: "LN-204512", lender: "Harbor Point Lending", upb: 507250, rate: 6.125, fico: 736, ltv: 77.0 },
  { id: "LN-204513", lender: "Cedar Ridge Capital", upb: 279300, rate: 6.5, fico: 746, ltv: 77.5 },
  { id: "LN-204515", lender: "Pinecrest Funding", upb: 212800, rate: 6.375, fico: 727, ltv: 81.0 },
  { id: "LN-204516", lender: "Tallgrass Lending Co.", upb: 398600, rate: 5.99, fico: 769, ltv: 66.0 },
];

/** Add loans screen: "All candidates", edited with two filters (so Save view is enabled). */
export const CANDIDATE_VIEW = {
  name: "All candidates",
  edited: true,
  filters: [
    { chip: `Lender is not ${HARBOR_POINT}`, field: "Lender", panel: `Not ${HARBOR_POINT}`, test: (c: Candidate) => !c.lender.startsWith(HARBOR_POINT) },
    { chip: "FICO ≥ 700", field: "FICO", panel: "≥ 700", test: (c: Candidate) => c.fico >= 700 },
  ] as Filter<Candidate>[],
  /** Of 62 candidates, ~14 are Harbor Point; 36 of the other 48 have FICO ≥ 700. */
  total: 36,
};

const candidateMatches = () => CANDIDATES.filter((c) => CANDIDATE_VIEW.filters.every((f) => f.test(c)));
/** Ineligible candidates matching the view: all Ineligible candidates are in the sample, so this is exact. */
export const filteredIneligible = () => candidateMatches().filter((c) => classify(c.fico, c.ltv).eligibility === "Ineligible").length;
/** "Select all N addable" on the filtered view. */
export const filteredAddable = () => CANDIDATE_VIEW.total - filteredIneligible();

const CANDIDATE_COLUMNS = fitColumns([
  { key: "select", label: "", type: "checkbox", width: 40 },
  { key: "loanId", label: "Loan ID", type: "text", width: 88, identifier: true },
  { key: "lender", label: "Lender", type: "text", width: 160 },
  { key: "upb", label: "UPB", type: "numeric", width: UPB_WIDTH },
  { key: "rate", label: "Rate", type: "numeric", width: RATE_WIDTH },
  { key: "fico", label: "FICO", type: "numeric", width: FICO_WIDTH },
  { key: "ltv", label: "LTV", type: "numeric", width: LTV_WIDTH },
  { key: "eligibility", label: "Eligibility", type: "chip", width: 112 },
], "lender");

function candidateRow(c: Candidate): GridRow {
  const { eligibility, failing } = classify(c.fico, c.ltv);
  const keys = failing.map((f) => f.key);
  return {
    values: {
      loanId: c.id, lender: c.lender, upb: money(c.upb), rate: `${c.rate.toFixed(3)}%`, fico: String(c.fico),
      ltv: `${c.ltv.toFixed(1)}%`, eligibility,
    },
    selected: c.selected,
    // Exception: warning cell, still selectable. Ineligible: error cells, not selectable, row muted.
    warning: eligibility === "Exception" ? keys : undefined,
    error: eligibility === "Ineligible" ? keys : undefined,
    disabled: eligibility === "Ineligible",
  };
}

/** Add loans screen grid: page 1 of the edited candidate view. */
export const CANDIDATE_DATA: Dataset = {
  columns: CANDIDATE_COLUMNS,
  rows: candidateMatches().slice(0, PAGE_SIZE).map(candidateRow),
  tones: { Eligible: "positive", Exception: "warning", Ineligible: "critical" },
  sortKey: "loanId",
  inkOverrides: true,
};

/** "If you add the selected" preview. */
export function preview() {
  const selected = CANDIDATES.filter((c) => c.selected);
  const addM = selected.reduce((a, c) => a + c.upb, 0) / 1e6;
  const upbM = Math.round((POOL.upbM + addM) * 10) / 10;
  const newExceptions = selected.filter((c) => classify(c.fico, c.ltv).eligibility === "Exception").length;
  return {
    count: selected.length,
    addM,
    upbM,
    pct: Math.round((upbM / POOL.targetM) * 100),
    exceptionsBefore: COUNTS.pool.Exception,
    exceptionsAfter: COUNTS.pool.Exception + newExceptions,
  };
}

// ------------------------------------------------------------ Consistency

/** Every problem found; logged as warnings on each build so the screens and About stay true. */
export function consistencyProblems(): string[] {
  const problems: string[] = [];
  const expect = (ok: boolean, msg: string) => { if (!ok) problems.push(msg); };
  expect(poolTotal() === 186, `pool total is ${poolTotal()}, expected 181 + 2 + 3 = 186`);
  expect(candidateTotal() === 62, `candidate total is ${candidateTotal()}, expected 56 + 4 + 2 = 62`);
  expect(addableTotal() === 60, `addable is ${addableTotal()}, expected 56 + 4 = 60`);
  expect(issueCount() === 3, `issues are ${issueCount()}, expected 2 exceptions + 1 limit = 3`);

  // Pool sample: statuses within the totals; every Exception and Signed-off loan is in the sample.
  const byStatus: Record<string, number> = {};
  for (const l of POOL_LOANS) {
    const e = classify(l.fico, l.ltv).eligibility;
    expect(e !== "Ineligible", `${l.id} is Ineligible but in the pool`);
    expect(!l.signOff || e === "Exception", `${l.id} has a sign-off but isn't an exception`);
    byStatus[poolStatus(l)] = (byStatus[poolStatus(l)] ?? 0) + 1;
  }
  expect((byStatus.Ready ?? 0) <= COUNTS.pool.Ready, `${byStatus.Ready} Ready loans in the sample but only ${COUNTS.pool.Ready} in the pool`);
  expect(byStatus.Exception === COUNTS.pool.Exception, `${byStatus.Exception} exceptions in the sample, expected ${COUNTS.pool.Exception}`);
  expect(byStatus["Signed off"] === COUNTS.pool["Signed off"], `${byStatus["Signed off"]} signed off in the sample, expected ${COUNTS.pool["Signed off"]}`);

  // Pool views: every visible row matches; totals within range; Harbor Point share is plausible.
  for (const [view, rows] of [[POOL_VIEW, POOL_DATA.rows], [EXCEPTIONS_VIEW, EXCEPTIONS_DATA.rows]] as const) {
    const matches = poolMatches(view);
    expect(rows.length === Math.min(PAGE_SIZE, matches.length), `${view.name}: ${rows.length} rows shown, ${matches.length} match`);
    expect(view.total <= poolTotal() && view.total >= matches.length, `${view.name}: total ${view.total} must be ≥ ${matches.length} and ≤ ${poolTotal()}`);
    for (const l of matches) for (const f of view.filters) expect(f.test(l), `${l.id} doesn't match "${f.chip}"`);
  }
  expect(EXCEPTIONS_DATA.rows.map((r) => r.values.loanId).join() === "LN-204386,LN-204389", "Exceptions view should list LN-204386 and LN-204389");
  const hp = poolMatches(POOL_VIEW).slice(0, PAGE_SIZE);
  const statuses = new Set(hp.map(poolStatus));
  expect(statuses.size === 3, `Harbor Point view should show Ready, Exception and Signed off; shows ${[...statuses].join(", ")}`);
  const avg = hp.reduce((a, l) => a + l.upb, 0) / hp.length;
  const shareM = (COUNTS.limitBreaches[0].share / 100) * POOL.upbM;
  expect(Math.abs((POOL_VIEW.total * avg) / 1e6 - shareM) / shareM <= 0.1,
    `Harbor Point: ${POOL_VIEW.total} × $${Math.round(avg)} isn't within 10% of ${COUNTS.limitBreaches[0].share}% of ${millions(POOL.upbM)}`);
  expect(SELECTED_POOL_LOANS.length === 3 && SELECTED_POOL_LOANS.every((l) => poolStatus(l) === "Ready"),
    "Pool loans should have 3 selected Ready loans (bulk bar: Remove from pool)");
  expect(poolStatus(SIGN_OFF_LOAN) === "Exception", "the Sign off dialog's loan should be an Exception");

  // Candidates: sample within totals; visible rows match the edited view; selection and preview valid.
  const seen: Record<string, number> = {};
  for (const c of CANDIDATES) {
    const e = classify(c.fico, c.ltv).eligibility;
    seen[e] = (seen[e] ?? 0) + 1;
    expect(c.rate >= POOL.coupon[0] && c.rate <= POOL.coupon[1], `${c.id} rate ${c.rate}% is outside the pool criteria`);
    expect(!(c.selected && e === "Ineligible"), `${c.id} is Ineligible but selected`);
    expect(!(c.selected && c.lender.startsWith(HARBOR_POINT)), `${c.id} is selected but would change the lender limit`);
  }
  for (const e of Object.keys(COUNTS.candidates) as Eligibility[]) {
    expect((seen[e] ?? 0) <= COUNTS.candidates[e], `${seen[e]} ${e} candidates in the sample but only ${COUNTS.candidates[e]} exist`);
  }
  expect(seen.Ineligible === COUNTS.candidates.Ineligible, "every Ineligible candidate should be in the sample (filteredAddable relies on it)");
  const shown = candidateMatches();
  expect(shown.length >= PAGE_SIZE && CANDIDATE_DATA.rows.length === PAGE_SIZE, `Add loans should show ${PAGE_SIZE} rows; ${shown.length} match`);
  expect(CANDIDATE_VIEW.total <= candidateTotal() && CANDIDATE_VIEW.total >= shown.length, `candidate view total ${CANDIDATE_VIEW.total} out of range`);
  for (const c of shown) for (const f of CANDIDATE_VIEW.filters) expect(f.test(c), `${c.id} doesn't match "${f.chip}"`);
  const shownElig = new Set(shown.map((c) => classify(c.fico, c.ltv).eligibility));
  expect(shownElig.has("Exception") && shownElig.has("Ineligible"), "Add loans should show at least one Exception and one Ineligible candidate");
  const p = preview();
  expect(p.count === 2 && CANDIDATES.filter((c) => c.selected).every((c) => shown.includes(c)), "the 2 selected candidates should be visible");
  expect(Math.abs(p.upbM - (POOL.upbM + p.addM)) < 0.05, "preview UPB isn't the pool UPB plus the selected UPBs");

  for (const [name, data] of [["pool", POOL_DATA], ["exceptions", EXCEPTIONS_DATA], ["candidate", CANDIDATE_DATA]] as [string, Dataset][]) {
    const lender = data.columns.find((c) => c.key === "lender")!.width;
    expect(lender >= 150, `${name} grid: Lender is only ${Math.round(lender)}px, so names will truncate`);
    const sumW = data.columns.reduce((a, c) => a + c.width, 0);
    expect(Math.abs(sumW - (MAIN_WIDTH - GRID_BORDER)) < 0.01, `${name} grid: columns total ${sumW}px, not ${MAIN_WIDTH - GRID_BORDER}px`);
  }
  // Bulk action bar states.
  expect(exceptionsIn(BAR_STATE_A) === 1, `bar state a should select exactly 1 exception, has ${exceptionsIn(BAR_STATE_A)}`);
  expect(BAR_STATE_A.every((id) => poolMatches(POOL_VIEW).slice(0, PAGE_SIZE).some((l) => l.id === id)),
    "bar state a's loans should be on page 1 of the Harbor Point view");
  expect(BAR_STATE_A.includes(SIGN_OFF_LOAN.id), "the Sign off dialog's loan should be the exception selected in bar state a");
  expect(viewExceptions() === 1, `bar state b ("all ${POOL_VIEW.total} matching") expects 1 exception in the view, found ${viewExceptions()}`);
  expect(exceptionsIn(SELECTED_POOL_LOANS.map((l) => l.id)) === 0, "Pool loans selection should have no exceptions (Sign off disabled)");
  expect(SUBMITTED_DATA.rows.every((r) => r.values.status !== "Exception"), "the submitted pool shows an Exception loan");
  return problems;
}

// ------------------------------------------------------------ Words shared by the screen and About

// A view is a named filter set plus columns and sort; `filter` is its menu description.
export const VIEWS = {
  pool: [
    { name: "All pool loans", filter: "No filters" },
    { name: "Exceptions to sign off", filter: "Status is Exception · adds Sign-off note column", chip: "Status is Exception" },
    { name: "Signed off", filter: "Status is Signed off · adds Sign-off note column", chip: "Status is Signed off" },
  ],
  saved: [
    { name: "Large balances", filter: "UPB ≥ 500,000" },
    { name: "Harbor Point loans", filter: "Lender is Harbor Point", selected: true },
  ],
};

/** Filter panel fields per tab (each tab keeps its own filters). Empty fields show their placeholder. */
export const FILTER_FIELDS: Record<"pool" | "add", { label: string; kind: "select" | "text"; placeholder: string }[]> = {
  pool: [
    { label: "Lender", kind: "select", placeholder: "Any lender" },
    { label: "Status", kind: "select", placeholder: "Any status" },
    { label: "FICO", kind: "text", placeholder: "e.g. 660–679" },
    { label: "LTV", kind: "text", placeholder: "e.g. > 90%" },
  ],
  add: [
    { label: "Lender", kind: "select", placeholder: "Any lender" },
    { label: "Eligibility", kind: "select", placeholder: "Any eligibility" },
    { label: "FICO", kind: "text", placeholder: "e.g. 660–679" },
    { label: "LTV", kind: "text", placeholder: "e.g. > 90%" },
  ],
};

export const FILTER_MODEL: [string, string][] = [
  ["Filter", "One condition, e.g. Status is Exception."],
  ["Filter set", "The filters currently applied, always shown as chips above the grid. Edit it in the filter panel, or with the side panel's shortcuts."],
  ["Filter panel", "One per tab (\"Filter pool loans\" / \"Filter candidates\"), and each tab keeps its own filters. It filters the grid only. Fields: Lender, Status (or Eligibility), FICO, LTV; + Add filter adds any other column; Reset clears, Apply applies. Panel and chips stay in sync: applied filters show as chips, removing a chip clears that field, and choosing a view fills both."],
  ["View", "A named filter set (plus columns and sort), predefined or saved. Choose one from the View menu; Save view saves the current filter set under Saved by me. Views set columns too: Exceptions to sign off and Signed off add the Sign-off note column."],
  ["Status", "Just a field. Shortcuts — the status counts and issue links in the side panel — add a normal filter chip."],
  ["Edited view", "Changing a view's filters keeps its name with \"· edited\" (e.g. All candidates · edited) and enables Save view. Save view is disabled while a view is unchanged."],
  ["Totals vs filtered", "Tab counts, the header's issue count and the side panels always show totals. The grid footer and the chips show the filtered result (e.g. Showing 1–12 of 58 pool loans · 1 filter)."],
  ["Pool criteria", "Not filters: they define which loans are candidates (30-yr fixed, coupon 5.750–7.250%). Edit them with Edit criteria in the header."],
];

export const ASSUMPTIONS =
  "One role: the trader builds the pool, signs off exceptions, and submits. A second approver is out of scope.";

// ------------------------------------------------------------ Business context (About, section 1)

export const CONTEXT = {
  intro:
    "This example is set at a mortgage guarantor, a company that buys home loans from lenders, bundles them into pools, " +
    "and guarantees the resulting mortgage-backed securities (MBS) to investors. The screen is used by a pooling trader " +
    "on the guarantor's capital markets desk.",
  parties: [
    ["Borrower", "Takes out a mortgage to buy a home."],
    ["Lender", "Originates the loan, then sells it to the guarantor to free up cash to lend again."],
    ["Guarantor", "Buys loans for cash, pools them, and guarantees that MBS investors receive principal and interest even if borrowers default. Earns a guaranty fee on each loan."],
    ["Pooling trader (the user of this screen)", "Assembles purchased loans into a pool that meets a size target and the pool's rules, then submits it to become an MBS."],
    ["Dealers and investors", "Dealers buy the MBS and distribute it to investors (pension funds, banks, insurers)."],
  ] as string[][],
  /** Money-flow diagram: loans and securities left to right; edges[i] badges the arrow after node i. */
  flow: {
    nodes: [
      { title: "Borrower", subtitle: "buys a home" },
      { title: "Lender", subtitle: "makes the loan" },
      { title: "Guarantor", subtitle: "buys and guarantees" },
      { title: "Pool", subtitle: "loans grouped" },
      { title: "MBS", subtitle: "bond backed by the pool" },
      { title: "Dealers", subtitle: "buy and resell" },
      { title: "Investors", subtitle: "receive payments" },
    ],
    highlight: "Pool",
    edges: ["1", "2", "3", "4", "5", "5"],
  },
  /** Return path: monthly payments. */
  payments: {
    label: "Monthly payments",
    nodes: [
      { title: "Borrower" },
      { title: "Guarantor", subtitle: "servicing" },
      { title: "Investors" },
    ],
    edges: ["7", "7"],
    note: "Passed through to investors, minus the guaranty fee.",
  },
  steps: [
    ["1", "Borrower gets a mortgage from a lender."],
    ["2", "Lender sells the loan to the guarantor for cash."],
    ["3", "The trader groups purchased loans into a pool. This screen."],
    ["4", "The pool is submitted and becomes an MBS backed by those loans."],
    ["5", "The MBS is sold to dealers, who sell it on to investors."],
    ["6", "Sale proceeds fund the guarantor's next loan purchases; lenders use their cash to make new loans."],
    ["7", "Borrowers' monthly payments pass through to investors. The guarantor keeps a small guaranty fee and covers losses if borrowers default."],
  ] as [string, string][],
  whyRules: [
    ["Credit risk", "The guarantor pays investors even when borrowers default, so loans must meet credit standards. FICO (credit score) and LTV (loan amount ÷ home value) are the two standards used here."],
    ["Exceptions", "Loans just outside the standards can be accepted with a documented sign-off, so the risk decision is recorded."],
    ["Concentration", "Limiting any one lender's share of a pool keeps a pool from depending on a single lender's underwriting."],
  ] as [string, string][],
  fits:
    "Loans are already purchased and the pool already exists with its target and criteria. This screen covers choosing " +
    "loans, resolving issues, and submitting.",
  glossary: [
    ["Mortgage-backed security (MBS)", "A bond whose payments come from the monthly payments on a pool of mortgages."],
    ["Pool", "A group of loans bundled together to back one MBS."],
    ["Guaranty fee", "A small fee, taken from each loan's interest, that pays the guarantor for covering defaults."],
    ["FICO", "A borrower's credit score (300–850); higher means lower risk."],
    ["LTV", "Loan-to-value: the loan amount divided by the home's value; lower means more equity and lower risk."],
    ["Exception", "A loan just outside a credit standard that can join a pool with a recorded sign-off."],
    ["Sign-off", "The trader's recorded decision, with a note, to accept an exception."],
    ["Concentration limit", "A cap on any one lender's share of a pool's balance (30% here)."],
    ["UPB", "Unpaid principal balance: what's still owed on a loan. The screens use it in the UPB column and the pool total."],
  ] as [string, string][],
  /** The only place in the file where real company names appear. */
  sourceNote:
    "Modeled on the U.S. agency MBS market (government-sponsored enterprises such as Fannie Mae and Freddie Mac). " +
    "Simplified from public information; not affiliated with or endorsed by any company. All lenders, loans, pools, " +
    "and figures are fictional.",
};

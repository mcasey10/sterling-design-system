import data from "../data/pool-2026-07.json";

// The data file holds the pool, its totals, and a sample of its loans (the first page of each saved view).
// Every open exception and every signed-off loan is in the sample, so the loans outside it are all Ready.
// Counts and balances for those outside loans come from the totals, never from invented loans.

export type Status = "Ready" | "Exception" | "Signed off";

export interface SignOff {
  note: string;
  by: string;
  date: string;
}

export interface Loan {
  id: string;
  lender: string;
  upb: number;
  fico: number;
  ltvPercent: number;
  signOff?: SignOff;
}

export interface Filters {
  lender: string | null;
  status: Status | null;
  fico: string;
  ltv: string;
}

export interface SavedView {
  name: string;
  filters: Filters;
  mine?: boolean;
}

/** Loans outside the sample, by the two groups the totals describe. */
export interface OffSample {
  all: { count: number; upb: number };
  harborPoint: { count: number; upb: number };
}

export interface PoolState {
  loans: Loan[];
  removed: string[];
  offSample: OffSample;
}

export const pool = data.pool;
export const rules = data.rules;
export const totals = data.totals;
export const pageSize = data.pageSize;

const CAPPED = data.totals.lendersOverTheCap[0];
export const CAP_PERCENT = rules.lenderSharePercentCap;

/** The lender the totals describe ("Harbor Point" is the start of "Harbor Point Lending"). */
export const HARBOR_POINT = data.loans.find((l) => l.lender.startsWith(CAPPED.lender))!.lender;
export const HARBOR_POINT_SHORT = CAPPED.lender;

export const LENDERS = [...new Set(data.loans.map((l) => l.lender))].sort();

export const EMPTY_FILTERS: Filters = { lender: null, status: null, fico: "", ltv: "" };

const lenderFrom = (value: string) => LENDERS.find((l) => l.startsWith(value)) ?? value;

export const PREDEFINED_VIEWS: SavedView[] = data.savedViews.map((view) => {
  const filters: Filters = { ...EMPTY_FILTERS };
  for (const f of view.filters) {
    if (f.field === "Lender") filters.lender = lenderFrom(f.value);
    if (f.field === "Status") filters.status = f.value as Status;
  }
  return { name: view.name, filters };
});

export function initialState(): PoolState {
  const loans = data.loans as Loan[];
  const sum = (list: Loan[]) => list.reduce((s, l) => s + l.upb, 0);
  const hpSample = loans.filter((l) => l.lender === HARBOR_POINT);
  const hpView = data.savedViews.find((v) => v.filters.some((f) => f.field === "Lender"))!;
  const hpUpb = (pool.upb * CAPPED.sharePercent) / 100;
  return {
    loans,
    removed: [],
    offSample: {
      all: { count: totals.loansInPool - loans.length, upb: pool.upb - sum(loans) },
      harborPoint: { count: hpView.matchingLoans - hpSample.length, upb: hpUpb - sum(hpSample) },
    },
  };
}

// ---------------------------------------------------------------- Rules

export function statusOf(loan: Loan): Status {
  const ready = loan.fico >= rules.ready.minFico && loan.ltvPercent <= rules.ready.maxLtvPercent;
  if (ready) return "Ready";
  return loan.signOff ? "Signed off" : "Exception";
}

export const ficoBreaks = (loan: Loan) => loan.fico < rules.ready.minFico;
export const ltvBreaks = (loan: Loan) => loan.ltvPercent > rules.ready.maxLtvPercent;

export const ficoReason = (loan: Loan) => `FICO ${loan.fico} — below ${rules.ready.minFico}`;
export const ltvReason = (loan: Loan) =>
  `LTV ${formatPercent(loan.ltvPercent)} — above ${rules.ready.maxLtvPercent}%`;

/** What rule the loan breaks, in words, or null for a Ready loan. */
export function reasonOf(loan: Loan): string | null {
  const reasons = [ficoBreaks(loan) && ficoReason(loan), ltvBreaks(loan) && ltvReason(loan)].filter(Boolean);
  return reasons.length ? reasons.join("; ") : null;
}

// ---------------------------------------------------------------- Formatting

export const formatAmount = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const formatPercent = (n: number) => `${n.toFixed(1)}%`;
export const formatMillions = (n: number) => `$${(n / 1_000_000).toFixed(1)}M`;
export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

// ---------------------------------------------------------------- Range filters (FICO, LTV)

export interface Range {
  min: number;
  max: number;
  minOpen: boolean;
  maxOpen: boolean;
}

/** Reads "660–679", "660-679", "> 90", ">= 680", "< 700", "≤ 80%", or a single number. Null when unreadable. */
export function parseRange(text: string): Range | null {
  const t = text.replace(/%/g, "").replace(/\s+/g, "").replace(/≥/g, ">=").replace(/≤/g, "<=");
  if (!t) return null;
  const between = t.match(/^(\d+(?:\.\d+)?)[–—-](\d+(?:\.\d+)?)$/);
  if (between) {
    const [a, b] = [Number(between[1]), Number(between[2])];
    return { min: Math.min(a, b), max: Math.max(a, b), minOpen: false, maxOpen: false };
  }
  const compare = t.match(/^(>=|<=|>|<|=)?(\d+(?:\.\d+)?)$/);
  if (!compare) return null;
  const n = Number(compare[2]);
  switch (compare[1]) {
    case ">": return { min: n, max: Infinity, minOpen: true, maxOpen: false };
    case ">=": return { min: n, max: Infinity, minOpen: false, maxOpen: false };
    case "<": return { min: -Infinity, max: n, minOpen: false, maxOpen: true };
    case "<=": return { min: -Infinity, max: n, minOpen: false, maxOpen: false };
    default: return { min: n, max: n, minOpen: false, maxOpen: false };
  }
}

const inRange = (value: number, r: Range) =>
  (r.minOpen ? value > r.min : value >= r.min) && (r.maxOpen ? value < r.max : value <= r.max);

/** The range in plain words, for a filter chip: "660–679", "over 90%". */
export function describeRange(text: string, unit = ""): string {
  const r = parseRange(text);
  if (!r) return text;
  const u = (n: number) => `${n}${unit}`;
  if (r.min === r.max) return u(r.min);
  if (r.max === Infinity) return `${r.minOpen ? "over" : "at least"} ${u(r.min)}`;
  if (r.min === -Infinity) return `${r.maxOpen ? "under" : "at most"} ${u(r.max)}`;
  return `${r.min}–${u(r.max)}`;
}

// ---------------------------------------------------------------- Matching

export function matches(loan: Loan, f: Filters): boolean {
  if (f.lender && loan.lender !== f.lender) return false;
  if (f.status && statusOf(loan) !== f.status) return false;
  const fico = parseRange(f.fico);
  if (fico && !inRange(loan.fico, fico)) return false;
  const ltv = parseRange(f.ltv);
  if (ltv && !inRange(loan.ltvPercent, ltv)) return false;
  return true;
}

export const activeLoans = (s: PoolState) => s.loans.filter((l) => !s.removed.includes(l.id));

/**
 * How many of the loans outside the sample match, when the totals can say. They are all Ready; the totals give
 * counts for the whole pool and for Harbor Point only, and know nothing about their FICO or LTV.
 */
function offSampleMatch(s: PoolState, f: Filters): { count: number; upb: number; known: boolean } {
  if (f.status && f.status !== "Ready") return { count: 0, upb: 0, known: true };
  if (parseRange(f.fico) || parseRange(f.ltv)) return { count: 0, upb: 0, known: false };
  if (!f.lender) return { ...s.offSample.all, known: true };
  if (f.lender === HARBOR_POINT) return { ...s.offSample.harborPoint, known: true };
  return { count: 0, upb: 0, known: false };
}

export interface Matching {
  /** Matching loans in the sample, unsorted. */
  sample: Loan[];
  /** All matching loans in the pool. */
  count: number;
  /** False when the totals can't say how many loans outside the sample match: count is the sample's. */
  exact: boolean;
}

export function matching(s: PoolState, f: Filters): Matching {
  const sample = activeLoans(s).filter((l) => matches(l, f));
  const off = offSampleMatch(s, f);
  return { sample, count: sample.length + off.count, exact: off.known };
}

// ---------------------------------------------------------------- Pool figures

export interface Figures {
  loanCount: number;
  upb: number;
  byStatus: Record<Status, number>;
  harborPointShare: number;
  openExceptions: Loan[];
  overCap: boolean;
  issues: number;
}

export function figures(s: PoolState): Figures {
  const active = activeLoans(s);
  const byStatus: Record<Status, number> = { Ready: s.offSample.all.count, Exception: 0, "Signed off": 0 };
  for (const l of active) byStatus[statusOf(l)]++;
  const upb = active.reduce((sum, l) => sum + l.upb, s.offSample.all.upb);
  const hpUpb = active.filter((l) => l.lender === HARBOR_POINT).reduce((sum, l) => sum + l.upb, s.offSample.harborPoint.upb);
  const harborPointShare = upb > 0 ? (hpUpb / upb) * 100 : 0;
  const openExceptions = active.filter((l) => statusOf(l) === "Exception");
  // Round as the summary shows it, so "30%" never counts as over a 30% cap.
  const overCap = Math.round(harborPointShare) > CAP_PERCENT;
  return {
    loanCount: active.length + s.offSample.all.count,
    upb,
    byStatus,
    harborPointShare,
    openExceptions,
    overCap,
    issues: openExceptions.length + (overCap ? 1 : 0),
  };
}

// ---------------------------------------------------------------- Changes

export function removeLoans(s: PoolState, ids: string[]): PoolState {
  return { ...s, removed: [...new Set([...s.removed, ...ids])] };
}

/** Removes every loan matching the filters, including those outside the sample when the totals cover them. */
export function removeMatching(s: PoolState, f: Filters): PoolState {
  const m = matching(s, f);
  const next = removeLoans(s, m.sample.map((l) => l.id));
  const off = offSampleMatch(s, f);
  if (!off.known || off.count === 0) return next;
  if (f.lender === HARBOR_POINT) {
    const hp = s.offSample.harborPoint;
    return {
      ...next,
      offSample: {
        all: { count: s.offSample.all.count - hp.count, upb: s.offSample.all.upb - hp.upb },
        harborPoint: { count: 0, upb: 0 },
      },
    };
  }
  return { ...next, offSample: { all: { count: 0, upb: 0 }, harborPoint: { count: 0, upb: 0 } } };
}

export function signOff(s: PoolState, ids: string[], note: string, by: string, date: string): PoolState {
  return {
    ...s,
    loans: s.loans.map((l) => (ids.includes(l.id) && statusOf(l) === "Exception" ? { ...l, signOff: { note, by, date } } : l)),
  };
}

// ---------------------------------------------------------------- Sorting

export type SortKey = "id" | "lender" | "upb" | "fico" | "ltv" | "status" | "reason";

export function sortLoans(loans: Loan[], key: SortKey, direction: "asc" | "desc"): Loan[] {
  const value = (l: Loan): string | number => {
    switch (key) {
      case "id": return l.id;
      case "lender": return l.lender;
      case "upb": return l.upb;
      case "fico": return l.fico;
      case "ltv": return l.ltvPercent;
      case "status": return statusOf(l);
      case "reason": return reasonOf(l) ?? "";
    }
  };
  const sign = direction === "asc" ? 1 : -1;
  return [...loans].sort((a, b) => {
    const [x, y] = [value(a), value(b)];
    const order = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
    return order !== 0 ? order * sign : a.id.localeCompare(b.id);
  });
}

import raw from "../data/pool-2026-07.json";

/*
 * The data file holds the pool's totals and a sample of its loans: the first page of each saved view.
 * Everything else here is derived from those numbers. Loans outside the sample are never invented: they are
 * counted in two groups (the rest of Harbor Point, and the rest of the pool), and a query whose rows would
 * include them reports that its rows aren't in the sample.
 */

export type Status = "Ready" | "Exception" | "Signed off";
export const STATUSES: Status[] = ["Ready", "Exception", "Signed off"];

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

export const pool = raw.pool;
export const rules = raw.rules;
export const totals = raw.totals;
export const PAGE_SIZE = raw.pageSize;
export const sampleLoans: Loan[] = raw.loans;

// ------------------------------------------------------------------ Rules

export interface Breach {
  field: "fico" | "ltv";
  reason: string;
}

/** The eligibility rules a loan breaks, with the reason in words. */
export function breaches(loan: Loan): Breach[] {
  const found: Breach[] = [];
  if (loan.fico < rules.ready.minFico) {
    found.push({ field: "fico", reason: `FICO ${loan.fico} — below ${rules.ready.minFico}` });
  }
  if (loan.ltvPercent > rules.ready.maxLtvPercent) {
    found.push({
      field: "ltv",
      reason: `LTV ${formatPercent(loan.ltvPercent)} — above ${rules.ready.maxLtvPercent}%`,
    });
  }
  return found;
}

export function statusOf(loan: Loan): Status {
  if (breaches(loan).length === 0) return "Ready";
  return loan.signOff ? "Signed off" : "Exception";
}

// ------------------------------------------------------------------ Lenders

/** Short lender names as the data file uses them (saved views, limits), e.g. "Harbor Point". */
const SHORT_NAMES = [
  ...raw.savedViews.flatMap((view) => view.filters.filter((f) => f.field === "Lender").map((f) => f.value)),
  ...totals.lendersOverTheCap.map((entry) => entry.lender),
];

export function shortLender(lender: string): string {
  return SHORT_NAMES.find((short) => lender.startsWith(short)) ?? lender;
}

export function lenderFromShort(short: string): string {
  return sampleLoans.find((loan) => shortLender(loan.lender) === short)?.lender ?? short;
}

export const LENDERS = [...new Set(sampleLoans.map((loan) => loan.lender))].sort();

const CAPPED = totals.lendersOverTheCap[0];
export const CAPPED_LENDER = lenderFromShort(CAPPED.lender);

// ------------------------------------------------------------------ Ranges (FICO and LTV filters)

export interface Range {
  min: number | null;
  minInclusive: boolean;
  max: number | null;
  maxInclusive: boolean;
}

/** Reads "660-679", "660–679", "> 700", ">= 700", "≤ 90%", "< 80", or "700". Returns null if it can't. */
export function parseRange(text: string): Range | null {
  const t = text.replace(/%/g, "").replace(/\s+/g, "").replace(/≥/g, ">=").replace(/≤/g, "<=");
  if (t === "") return null;
  const between = t.match(/^(\d+(?:\.\d+)?)(?:-|–|—|to)(\d+(?:\.\d+)?)$/i);
  if (between) {
    const [a, b] = [Number(between[1]), Number(between[2])];
    return { min: Math.min(a, b), minInclusive: true, max: Math.max(a, b), maxInclusive: true };
  }
  const compare = t.match(/^(>=|<=|>|<)(\d+(?:\.\d+)?)$/);
  if (compare) {
    const n = Number(compare[2]);
    const op = compare[1];
    if (op.startsWith(">")) return { min: n, minInclusive: op === ">=", max: null, maxInclusive: false };
    return { min: null, minInclusive: false, max: n, maxInclusive: op === "<=" };
  }
  if (/^\d+(?:\.\d+)?$/.test(t)) {
    const n = Number(t);
    return { min: n, minInclusive: true, max: n, maxInclusive: true };
  }
  return null;
}

export function inRange(value: number, r: Range): boolean {
  if (r.min !== null && (r.minInclusive ? value < r.min : value <= r.min)) return false;
  if (r.max !== null && (r.maxInclusive ? value > r.max : value >= r.max)) return false;
  return true;
}

/** How a filter range relates to the values [lo, hi]: all of them match, none do, or it depends. */
function coverage(r: Range | null, lo: number, hi: number): "all" | "none" | "some" {
  if (!r) return "all";
  const belowLo = r.max !== null && (r.max < lo || (r.max === lo && !r.maxInclusive));
  const aboveHi = r.min !== null && (r.min > hi || (r.min === hi && !r.minInclusive));
  if (belowLo || aboveHi) return "none";
  const coversLo = r.min === null || r.min < lo || (r.min === lo && r.minInclusive);
  const coversHi = r.max === null || r.max > hi || (r.max === hi && r.maxInclusive);
  return coversLo && coversHi ? "all" : "some";
}

export function describeRange(field: string, r: Range, unit = ""): string {
  const v = (n: number) => `${n}${unit}`;
  if (r.min !== null && r.max !== null) {
    if (r.min === r.max) return `${field} is ${v(r.min)}`;
    return `${field} is ${v(r.min)}–${v(r.max)}`;
  }
  if (r.min !== null) return `${field} is ${r.minInclusive ? `${v(r.min)} or more` : `over ${v(r.min)}`}`;
  if (r.max !== null) return `${field} is ${r.maxInclusive ? `${v(r.max)} or less` : `under ${v(r.max)}`}`;
  return field;
}

// ------------------------------------------------------------------ Filters

export interface Filters {
  lender: string | null;
  status: Status | null;
  fico: string;
  ltv: string;
}

export const NO_FILTERS: Filters = { lender: null, status: null, fico: "", ltv: "" };

export function sameFilters(a: Filters, b: Filters): boolean {
  return a.lender === b.lender && a.status === b.status && a.fico.trim() === b.fico.trim() && a.ltv.trim() === b.ltv.trim();
}

export function filterCount(f: Filters): number {
  return [f.lender, f.status, f.fico.trim(), f.ltv.trim()].filter(Boolean).length;
}

function matches(loan: Loan, f: Filters): boolean {
  if (f.lender && loan.lender !== f.lender) return false;
  if (f.status && statusOf(loan) !== f.status) return false;
  const fico = parseRange(f.fico);
  if (fico && !inRange(loan.fico, fico)) return false;
  const ltv = parseRange(f.ltv);
  if (ltv && !inRange(loan.ltvPercent, ltv)) return false;
  return true;
}

// ------------------------------------------------------------------ Saved views

export interface View {
  id: string;
  name: string;
  filters: Filters;
  mine?: boolean;
}

export const PREDEFINED_VIEWS: View[] = raw.savedViews.map((view, index) => {
  const filters: Filters = { ...NO_FILTERS };
  for (const f of view.filters) {
    if (f.field === "Lender") filters.lender = lenderFromShort(f.value);
    if (f.field === "Status") filters.status = f.value as Status;
  }
  return { id: `view-${index}`, name: view.name, filters };
});

// ------------------------------------------------------------------ The pool

/**
 * Loans not in the sample, by group. Every one of them is Ready: all of the pool's exceptions and sign-offs
 * are in the sample (2 and 3 of them, matching the totals). Their FICO and LTV are unknown, but being Ready
 * puts them within the Ready limits.
 */
export interface UnseenGroup {
  key: "capped" | "other";
  /** The lender, when the whole group has one. */
  lender: string | null;
  count: number;
  upb: number;
}

const sum = (loans: Loan[]) => loans.reduce((total, loan) => total + loan.upb, 0);
const cappedSample = sampleLoans.filter((loan) => loan.lender === CAPPED_LENDER);
const cappedView = raw.savedViews.find((view) =>
  view.filters.length === 1 && view.filters[0].field === "Lender" && view.filters[0].value === CAPPED.lender,
);
const cappedCount = cappedView?.matchingLoans ?? cappedSample.length;
const cappedUpb = (pool.upb * CAPPED.sharePercent) / 100;

export const UNSEEN: UnseenGroup[] = [
  {
    key: "capped",
    lender: CAPPED_LENDER,
    count: cappedCount - cappedSample.length,
    upb: cappedUpb - sum(cappedSample),
  },
  {
    key: "other",
    lender: null,
    count: totals.loansInPool - cappedCount - (sampleLoans.length - cappedSample.length),
    upb: pool.upb - cappedUpb - (sum(sampleLoans) - sum(cappedSample)),
  },
];

export interface PoolState {
  loans: Loan[];
  /** Sample loans removed from the pool. */
  removedIds: ReadonlySet<string>;
  /** Unseen groups removed from the pool (through "all matching"). */
  removedGroups: ReadonlySet<UnseenGroup["key"]>;
}

export function initialPool(): PoolState {
  return { loans: sampleLoans.map((loan) => ({ ...loan })), removedIds: new Set(), removedGroups: new Set() };
}

const activeLoans = (state: PoolState) => state.loans.filter((loan) => !state.removedIds.has(loan.id));
const activeGroups = (state: PoolState) => UNSEEN.filter((group) => !state.removedGroups.has(group.key));

export interface PoolSummary {
  loanCount: number;
  upb: number;
  byStatus: Record<Status, number>;
  cappedShare: number;
  openExceptions: Loan[];
  overCap: boolean;
  issueCount: number;
}

export function summarize(state: PoolState): PoolSummary {
  const loans = activeLoans(state);
  const groups = activeGroups(state);
  const byStatus: Record<Status, number> = { Ready: 0, Exception: 0, "Signed off": 0 };
  for (const loan of loans) byStatus[statusOf(loan)]++;
  byStatus.Ready += groups.reduce((n, g) => n + g.count, 0);
  const upb = sum(loans) + groups.reduce((n, g) => n + g.upb, 0);
  const cappedUpbNow =
    sum(loans.filter((loan) => loan.lender === CAPPED_LENDER)) +
    groups.filter((g) => g.lender === CAPPED_LENDER).reduce((n, g) => n + g.upb, 0);
  const cappedShare = upb > 0 ? (cappedUpbNow / upb) * 100 : 0;
  const openExceptions = loans.filter((loan) => statusOf(loan) === "Exception");
  // Compare in whole basis points so floating-point noise can't flip the limit.
  const overCap = Math.round(cappedShare * 100) > rules.lenderSharePercentCap * 100;
  return {
    loanCount: loans.length + groups.reduce((n, g) => n + g.count, 0),
    upb,
    byStatus,
    cappedShare,
    openExceptions,
    overCap,
    issueCount: openExceptions.length + (overCap ? 1 : 0),
  };
}

// ------------------------------------------------------------------ Queries

export type SortKey = "id" | "lender" | "upb" | "fico" | "ltv" | "status";
export interface Sort {
  key: SortKey;
  direction: "asc" | "desc";
}

export interface QueryResult {
  /** How many loans match, or null if the sample can't say. */
  total: number | null;
  /** The sample loans that match, sorted. */
  sampleMatches: Loan[];
  /** Unseen groups whose loans all match. */
  unseenMatches: UnseenGroup[];
  /** The rows of the requested page, or null when they aren't in the sample. */
  rows: Loan[] | null;
}

function compare(a: Loan, b: Loan, key: SortKey): number {
  switch (key) {
    case "upb":
      return a.upb - b.upb;
    case "fico":
      return a.fico - b.fico;
    case "ltv":
      return a.ltvPercent - b.ltvPercent;
    case "lender":
      return a.lender.localeCompare(b.lender) || a.id.localeCompare(b.id);
    case "status":
      return STATUSES.indexOf(statusOf(a)) - STATUSES.indexOf(statusOf(b)) || a.id.localeCompare(b.id);
    default:
      return a.id.localeCompare(b.id);
  }
}

/** Unseen loans are Ready: FICO 680 and up, LTV up to 90%. */
const UNSEEN_FICO: [number, number] = [rules.ready.minFico, 850];
const UNSEEN_LTV: [number, number] = [0, rules.ready.maxLtvPercent];

export function query(state: PoolState, f: Filters, sort: Sort, page: number): QueryResult {
  const sampleMatches = activeLoans(state)
    .filter((loan) => matches(loan, f))
    .sort((a, b) => compare(a, b, sort.key) * (sort.direction === "asc" ? 1 : -1));

  let unknown = false;
  const unseenMatches: UnseenGroup[] = [];
  for (const group of activeGroups(state)) {
    let fit: "all" | "none" | "some" = "all";
    if (f.status && f.status !== "Ready") fit = "none";
    if (f.lender && group.lender && f.lender !== group.lender) fit = "none";
    if (fit !== "none" && f.lender && !group.lender) fit = f.lender === CAPPED_LENDER ? "none" : "some";
    for (const c of [coverage(parseRange(f.fico), ...UNSEEN_FICO), coverage(parseRange(f.ltv), ...UNSEEN_LTV)]) {
      if (fit === "none" || c === "all") continue;
      fit = c;
    }
    if (fit === "all") unseenMatches.push(group);
    if (fit === "some") unknown = true;
  }

  const total = unknown ? null : sampleMatches.length + unseenMatches.reduce((n, g) => n + g.count, 0);

  // Rows are known when every match is in the sample, or for the first page of the saved view whose first
  // page the sample holds (one lender, nothing else).
  let rows: Loan[] | null = null;
  const start = page * PAGE_SIZE;
  if (!unknown && unseenMatches.length === 0) {
    rows = sampleMatches.slice(start, start + PAGE_SIZE);
  } else if (!unknown && page === 0 && isSampledView(f)) {
    rows = sampleMatches.slice(0, PAGE_SIZE);
  }
  return { total, sampleMatches, unseenMatches, rows };
}

function isSampledView(f: Filters): boolean {
  return PREDEFINED_VIEWS.some((view) => sameFilters(view.filters, f));
}

// ------------------------------------------------------------------ Formatting

const money = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const formatUpb = (n: number) => money.format(n);
export const formatPercent = (n: number) => `${n.toFixed(1)}%`;
export const formatMillions = (n: number) => `$${(n / 1_000_000).toFixed(1)}M`;
export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

/** A lender's share, rounded, with a decimal when rounding would hide that it is over the cap. */
export function formatShare(share: number): string {
  const whole = Math.round(share);
  if (whole <= rules.lenderSharePercentCap && share > rules.lenderSharePercentCap) return `${share.toFixed(1)}%`;
  return `${whole}%`;
}

/** Today, in the data's date style ("Oct 14"). */
export const today = () => new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });

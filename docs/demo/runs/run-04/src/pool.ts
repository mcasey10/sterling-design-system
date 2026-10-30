// The pool's data and rules, and a small in-memory stand-in for the server.
//
// The data file holds only a sample of the pool: the first page of each saved view (21 loans). Every
// non-Ready loan in the pool is in that sample (5 of them, matching totals.loansByStatus), so the loans
// that aren't in the sample are all Ready. They are kept as counts ("buckets"), never as invented loans.
import raw from "../data/pool-2026-07.json";
import type { GridSort } from "sterling-ui";

export type Status = "Ready" | "Exception" | "Signed off" | "Ineligible";
export const FILTER_STATUSES: Status[] = ["Ready", "Exception", "Signed off"];

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

export interface Breach {
  field: "fico" | "ltv";
  level: "warning" | "error";
  reason: string;
}

export const pool = raw.pool;
export const rules = raw.rules;
export const totals = raw.totals;
export const PAGE_SIZE = raw.pageSize;

const SAMPLE: Loan[] = raw.loans;

export const LENDERS = [...new Set(SAMPLE.map((l) => l.lender))].sort();

/** The data names some lenders by a short name ("Harbor Point"); loans carry the full name. */
export const fullLender = (name: string) => LENDERS.find((l) => l.startsWith(name)) ?? name;
export const shortLender = (full: string) =>
  totals.lendersOverTheCap.find((l) => full.startsWith(l.lender))?.lender ?? full;

/* ------------------------------------------------------------------ Formatting */

export const fmtUpb = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtLtv = (n: number) => `${n.toFixed(1)}%`;
export const fmtMillions = (n: number) => `$${(n / 1_000_000).toFixed(1)}M`;
/** A share as a whole percent, or with one decimal when rounding would hide that it is over a limit. */
export const fmtShare = (n: number) => (Math.abs(n - Math.round(n)) < 0.05 ? `${Math.round(n)}%` : `${n.toFixed(1)}%`);
export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

/* ------------------------------------------------------------------ Rules */

export function breaches(loan: Loan): Breach[] {
  const { ready, exception } = rules;
  const out: Breach[] = [];
  if (loan.fico < exception.minFico) {
    out.push({ field: "fico", level: "error", reason: `FICO ${loan.fico} — below ${exception.minFico}` });
  } else if (loan.fico < ready.minFico) {
    out.push({ field: "fico", level: "warning", reason: `FICO ${loan.fico} — below ${ready.minFico}` });
  }
  if (loan.ltvPercent > exception.maxLtvPercent) {
    out.push({ field: "ltv", level: "error", reason: `LTV ${fmtLtv(loan.ltvPercent)} — above ${exception.maxLtvPercent}%` });
  } else if (loan.ltvPercent > ready.maxLtvPercent) {
    out.push({ field: "ltv", level: "warning", reason: `LTV ${fmtLtv(loan.ltvPercent)} — above ${ready.maxLtvPercent}%` });
  }
  return out;
}

export function statusOf(loan: Loan): Status {
  const found = breaches(loan);
  if (found.some((b) => b.level === "error")) return "Ineligible";
  if (found.length > 0) return loan.signOff ? "Signed off" : "Exception";
  return "Ready";
}

/* ------------------------------------------------------------------ Filters */

export interface Range {
  min?: number;
  minInclusive: boolean;
  max?: number;
  maxInclusive: boolean;
  /** How the range reads in a chip: "660–679", "> 90%". */
  text: string;
}

export interface Filters {
  lender?: string;
  status?: Status;
  fico?: Range;
  ltv?: Range;
}

export type FilterKey = keyof Filters;

/** Reads "660–679", "660-679", "> 90", "<=80%", or "700". Empty is no filter; anything else is invalid. */
export function parseRange(input: string, unit: "" | "%"): Range | null | "invalid" {
  const s = input.replace(/%/g, "").replace(/\s+/g, "");
  if (!s) return null;
  const num = "(\\d+(?:\\.\\d+)?)";
  let m = new RegExp(`^${num}[-–]${num}$`).exec(s);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a > b) return "invalid";
    return { min: a, minInclusive: true, max: b, maxInclusive: true, text: `${a}–${b}${unit}` };
  }
  m = new RegExp(`^(>=|≥|>|<=|≤|<)${num}$`).exec(s);
  if (m) {
    const n = Number(m[2]);
    const op = m[1].replace(">=", "≥").replace("<=", "≤");
    const text = `${op} ${n}${unit}`;
    if (op === ">" || op === "≥") return { min: n, minInclusive: op === "≥", maxInclusive: false, text };
    return { max: n, maxInclusive: op === "≤", minInclusive: false, text };
  }
  m = new RegExp(`^${num}$`).exec(s);
  if (m) {
    const n = Number(m[1]);
    return { min: n, minInclusive: true, max: n, maxInclusive: true, text: `${n}${unit}` };
  }
  return "invalid";
}

const inRange = (v: number, r: Range) =>
  (r.min === undefined || v > r.min || (r.minInclusive && v === r.min)) &&
  (r.max === undefined || v < r.max || (r.maxInclusive && v === r.max));

export function matches(loan: Loan, f: Filters) {
  return (
    (!f.lender || loan.lender === f.lender) &&
    (!f.status || statusOf(loan) === f.status) &&
    (!f.fico || inRange(loan.fico, f.fico)) &&
    (!f.ltv || inRange(loan.ltvPercent, f.ltv))
  );
}

export function chipLabel(key: FilterKey, f: Filters): string {
  switch (key) {
    case "lender":
      return `Lender is ${f.lender}`;
    case "status":
      return `Status is ${f.status}`;
    case "fico":
      return `FICO ${f.fico!.text}`;
    case "ltv":
      return `LTV ${f.ltv!.text}`;
  }
}

export const FILTER_KEYS: FilterKey[] = ["lender", "status", "fico", "ltv"];
export const appliedKeys = (f: Filters) => FILTER_KEYS.filter((k) => f[k] !== undefined);

export function sameFilters(a: Filters, b: Filters) {
  return FILTER_KEYS.every((k) => {
    const [x, y] = [a[k], b[k]];
    if (x === undefined || y === undefined) return x === y;
    return typeof x === "string" ? x === y : (x as Range).text === (y as Range).text;
  });
}

/* ------------------------------------------------------------------ Saved views */

export interface View {
  id: string;
  name: string;
  filters: Filters;
}

export const INITIAL_VIEWS: View[] = raw.savedViews.map((v, i) => {
  const filters: Filters = {};
  for (const f of v.filters) {
    if (f.field === "Lender") filters.lender = fullLender(f.value);
    if (f.field === "Status") filters.status = f.value as Status;
  }
  return { id: `view-${i}`, name: v.name, filters };
});

/* ------------------------------------------------------------------ Pool state */

/** Loans that aren't in the sample: all Ready, known only as a count and a balance. */
export interface Bucket {
  /** The one lender of every loan in the bucket, or null for a mix of lenders. */
  lender: string | null;
  count: number;
  upb: number;
}

export interface PoolState {
  loans: Loan[];
  removed: string[];
  buckets: Bucket[];
  submitted: boolean;
}

function initialBuckets(): Bucket[] {
  const buckets: Bucket[] = [];
  // A lender's loan count comes from a saved view filtered to it; its balance from its share of the pool.
  for (const over of totals.lendersOverTheCap) {
    const lender = fullLender(over.lender);
    const view = raw.savedViews.find(
      (v) => v.filters.length === 1 && v.filters[0].field === "Lender" && fullLender(v.filters[0].value) === lender
    );
    if (!view) continue;
    const sample = SAMPLE.filter((l) => l.lender === lender);
    buckets.push({
      lender,
      count: view.matchingLoans - sample.length,
      upb: Math.round((pool.upb * over.sharePercent) / 100) - sample.reduce((s, l) => s + l.upb, 0),
    });
  }
  const sampleUpb = SAMPLE.reduce((s, l) => s + l.upb, 0);
  const known = buckets.reduce((s, b) => ({ count: s.count + b.count, upb: s.upb + b.upb }), { count: 0, upb: 0 });
  buckets.push({
    lender: null,
    count: totals.loansInPool - SAMPLE.length - known.count,
    upb: pool.upb - sampleUpb - known.upb,
  });
  return buckets;
}

export const INITIAL_STATE: PoolState = {
  loans: SAMPLE,
  removed: [],
  buckets: initialBuckets(),
  submitted: false,
};

export const liveLoans = (s: PoolState) => s.loans.filter((l) => !s.removed.includes(l.id));

/* ------------------------------------------------------------------ Querying */

type Match = "in" | "out" | "unknown";

/** Whether every value in [lo, hi] is in the range ("in"), none is ("out"), or it depends ("unknown"). */
function rangeVsInterval(r: Range, lo: number, hi: number): Match {
  const below = r.max !== undefined && (r.max < lo || (r.max === lo && !r.maxInclusive));
  const above = r.min !== undefined && (r.min > hi || (r.min === hi && !r.minInclusive));
  if (below || above) return "out";
  const coversLo = r.min === undefined || r.min < lo || (r.min === lo && r.minInclusive);
  const coversHi = r.max === undefined ? true : hi !== Infinity && (r.max > hi || (r.max === hi && r.maxInclusive));
  return coversLo && coversHi ? "in" : "unknown";
}

function bucketMatch(b: Bucket, f: Filters, buckets: Bucket[]): Match {
  const parts: Match[] = [];
  if (f.status) parts.push(f.status === "Ready" ? "in" : "out");
  if (f.lender) {
    if (b.lender) parts.push(b.lender === f.lender ? "in" : "out");
    else parts.push(buckets.some((x) => x.lender === f.lender) ? "out" : "unknown");
  }
  // Loans outside the sample are Ready: FICO 680 or more, LTV 90% or less.
  if (f.fico) parts.push(rangeVsInterval(f.fico, rules.ready.minFico, Infinity));
  if (f.ltv) parts.push(rangeVsInterval(f.ltv, 0, rules.ready.maxLtvPercent));
  if (parts.includes("out")) return "out";
  return parts.includes("unknown") ? "unknown" : "in";
}

const STATUS_RANK: Record<Status, number> = { Ineligible: 0, Exception: 1, "Signed off": 2, Ready: 3 };

function compare(a: Loan, b: Loan, key: string): number {
  switch (key) {
    case "lender":
      return a.lender.localeCompare(b.lender) || a.id.localeCompare(b.id);
    case "upb":
      return a.upb - b.upb;
    case "fico":
      return a.fico - b.fico;
    case "ltv":
      return a.ltvPercent - b.ltvPercent;
    case "status":
      return STATUS_RANK[statusOf(a)] - STATUS_RANK[statusOf(b)] || a.id.localeCompare(b.id);
    default:
      return a.id.localeCompare(b.id);
  }
}

export interface QueryResult {
  /** The matching loans that are in the sample, sorted. */
  rows: Loan[];
  /** Every matching loan in the pool, or null when the sample can't say (e.g. FICO 700–720). */
  total: number | null;
}

export function runQuery(s: PoolState, f: Filters, sort: GridSort): QueryResult {
  const rows = liveLoans(s)
    .filter((l) => matches(l, f))
    .sort((a, b) => compare(a, b, sort.key) * (sort.direction === "asc" ? 1 : -1));
  let total: number | null = rows.length;
  for (const b of s.buckets) {
    if (b.count === 0) continue;
    const m = bucketMatch(b, f, s.buckets);
    if (m === "unknown") total = null;
    else if (m === "in" && total !== null) total += b.count;
  }
  return { rows, total };
}

/* ------------------------------------------------------------------ Changes */

/** Removes every matching loan, in the sample or not, except the excluded ones. */
export function removeMatching(s: PoolState, f: Filters, excluded: string[]): PoolState {
  const ids = liveLoans(s)
    .filter((l) => matches(l, f) && !excluded.includes(l.id))
    .map((l) => l.id);
  return {
    ...s,
    removed: [...s.removed, ...ids],
    buckets: s.buckets.map((b) => (bucketMatch(b, f, s.buckets) === "in" ? { ...b, count: 0, upb: 0 } : b)),
  };
}

export function removeIds(s: PoolState, ids: string[]): PoolState {
  return { ...s, removed: [...s.removed, ...ids] };
}

export function signOff(s: PoolState, ids: string[], signoff: SignOff): PoolState {
  return { ...s, loans: s.loans.map((l) => (ids.includes(l.id) ? { ...l, signOff: signoff } : l)) };
}

/* ------------------------------------------------------------------ Summary */

export interface LenderOverCap {
  lender: string;
  sharePercent: number;
  capPercent: number;
}

export interface PoolSummary {
  count: number;
  upb: number;
  byStatus: Record<Status, number>;
  openExceptions: Loan[];
  overCap: LenderOverCap[];
  issues: number;
}

export function summarize(s: PoolState): PoolSummary {
  const live = liveLoans(s);
  const hidden = s.buckets.reduce((t, b) => ({ count: t.count + b.count, upb: t.upb + b.upb }), { count: 0, upb: 0 });
  const upb = live.reduce((t, l) => t + l.upb, 0) + hidden.upb;
  const byStatus: Record<Status, number> = { Ready: hidden.count, Exception: 0, "Signed off": 0, Ineligible: 0 };
  for (const l of live) byStatus[statusOf(l)]++;
  const openExceptions = live.filter((l) => statusOf(l) === "Exception");
  // Only lenders whose whole book in the pool is known can be checked against the cap.
  const cap = rules.lenderSharePercentCap;
  const overCap: LenderOverCap[] = [];
  for (const b of s.buckets) {
    if (!b.lender) continue;
    const lenderUpb = b.upb + live.filter((l) => l.lender === b.lender).reduce((t, l) => t + l.upb, 0);
    const share = upb > 0 ? (lenderUpb / upb) * 100 : 0;
    if (share > cap) overCap.push({ lender: shortLender(b.lender), sharePercent: share, capPercent: cap });
  }
  return {
    count: live.length + hidden.count,
    upb,
    byStatus,
    openExceptions,
    overCap,
    issues: openExceptions.length + overCap.length,
  };
}

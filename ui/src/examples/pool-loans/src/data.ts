import raw from "../data/pool-2026-07.json";

/*
 * The data file holds the pool's totals and a sample of its loans: the first page of each saved view. As
 * delivered, loans outside the sample were never invented: they were counted in two groups, and a query whose
 * rows would include them said its rows weren't in the sample. In use that looked broken ("Any lender" showed
 * no loans), so the rest of the pool is generated below (ADDED_LOANS): added after delivery, in correction e,
 * to complete the sample. The data file itself is unchanged.
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

function matches_(loan: Loan, f: Filters): boolean {
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

const sum = (loans: Loan[]) => loans.reduce((total, loan) => total + loan.upb, 0);

/** A small seeded random number generator, so the added loans are the same on every load. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * ADDED AFTER DELIVERY (correction e), to complete the sample: the 165 loans of the pool that the data file
 * leaves out, generated once, deterministically, and fictional like the rest. They make the totals the data file
 * states: the rest of Harbor Point's loans (its saved view's matchingLoans), and the rest of the pool spread over
 * the sample's other lenders; together they bring Harbor Point to its share of the pool (lendersOverTheCap) and
 * the pool to its UPB. Every one is Ready (FICO 680 and up, LTV up to 90%), since all of the pool's exceptions
 * and sign-offs are in the sample. Their loan IDs follow the sample's, so each saved view's first page, sorted
 * by loan ID, is still the sample the session had.
 */
export const ADDED_LOANS: Loan[] = (() => {
  const random = seeded(202607);
  const cappedSample = sampleLoans.filter((loan) => loan.lender === CAPPED_LENDER);
  const cappedView = raw.savedViews.find(
    (view) => view.filters.length === 1 && view.filters[0].field === "Lender" && view.filters[0].value === CAPPED.lender,
  );
  const cappedCount = cappedView?.matchingLoans ?? cappedSample.length;
  const cappedUpb = (pool.upb * CAPPED.sharePercent) / 100;
  const others = LENDERS.filter((lender) => lender !== CAPPED_LENDER);
  const groups = [
    { count: cappedCount - cappedSample.length, upb: cappedUpb - sum(cappedSample), lender: () => CAPPED_LENDER },
    {
      count: totals.loansInPool - cappedCount - (sampleLoans.length - cappedSample.length),
      upb: pool.upb - cappedUpb - (sum(sampleLoans) - sum(cappedSample)),
      lender: (i: number) => others[i % others.length],
    },
  ];
  const added: Loan[] = [];
  let id = Math.max(...sampleLoans.map((loan) => Number(loan.id.replace(/\D/g, ""))));
  for (const group of groups) {
    // Amounts vary around the group's average, in whole hundreds; the last loan takes the remainder, so the
    // group adds up to its UPB exactly.
    const weights = Array.from({ length: group.count }, () => 0.6 + random() * 0.8);
    const scale = group.upb / weights.reduce((a, b) => a + b, 0);
    let left = group.upb;
    weights.forEach((weight, i) => {
      const upb = i === group.count - 1 ? Math.round(left * 100) / 100 : Math.round((weight * scale) / 100) * 100;
      left -= upb;
      added.push({
        id: `LN-${++id}`,
        lender: group.lender(i),
        upb,
        fico: rules.ready.minFico + Math.floor(random() * 121),
        ltvPercent: Math.round((55 + random() * (rules.ready.maxLtvPercent - 55)) * 10) / 10,
      });
    });
  }
  return added;
})();

/** Every loan in the pool: the data file's sample, then the loans added to complete it. */
export const POOL_LOANS: Loan[] = [...sampleLoans, ...ADDED_LOANS];

export interface PoolState {
  loans: Loan[];
  /** Loans removed from the pool. */
  removedIds: ReadonlySet<string>;
}

export function initialPool(): PoolState {
  return { loans: POOL_LOANS.map((loan) => ({ ...loan })), removedIds: new Set() };
}

const activeLoans = (state: PoolState) => state.loans.filter((loan) => !state.removedIds.has(loan.id));

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
  const byStatus: Record<Status, number> = { Ready: 0, Exception: 0, "Signed off": 0 };
  for (const loan of loans) byStatus[statusOf(loan)]++;
  const upb = sum(loans);
  const cappedShare = upb > 0 ? (sum(loans.filter((loan) => loan.lender === CAPPED_LENDER)) / upb) * 100 : 0;
  const openExceptions = loans.filter((loan) => statusOf(loan) === "Exception");
  // Compare in whole basis points so floating-point noise can't flip the limit.
  const overCap = Math.round(cappedShare * 100) > rules.lenderSharePercentCap * 100;
  return {
    loanCount: loans.length,
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
  /** How many loans match. */
  total: number;
  /** Every loan that matches, sorted. */
  matches: Loan[];
  /** The rows of the requested page. */
  rows: Loan[];
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

export function query(state: PoolState, f: Filters, sort: Sort, page: number): QueryResult {
  const matches = activeLoans(state)
    .filter((loan) => matches_(loan, f))
    .sort((a, b) => compare(a, b, sort.key) * (sort.direction === "asc" ? 1 : -1));
  const start = page * PAGE_SIZE;
  return { total: matches.length, matches, rows: matches.slice(start, start + PAGE_SIZE) };
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

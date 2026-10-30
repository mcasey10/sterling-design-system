import data from "../data/pool-2026-07.json";

/* The pool, its rules, and what the screen can know about its loans.
   The data file holds a sample of the pool (the first page of each saved view) and its totals. Counts come
   from the totals; rows come only from the sample. Every Exception and Signed off loan is in the sample, so
   the loans that aren't are all Ready, and we know how many there are and their total balance. */

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

export const pool = data.pool;
export const rules = data.rules;
export const pageSize = data.pageSize;
export const totals = data.totals;
export const sampleLoans: Loan[] = data.loans;

const CAP = rules.lenderSharePercentCap;

/* ---------- Rules ---------- */

export interface Breach {
  field: "fico" | "ltv";
  reason: string;
}

export const formatLtv = (ltv: number) => `${ltv.toFixed(1)}%`;

/** What rules a loan breaks. Ready loans break none. */
export function breaches(loan: Loan): Breach[] {
  const found: Breach[] = [];
  if (loan.fico < rules.ready.minFico) {
    found.push({ field: "fico", reason: `FICO ${loan.fico} — below ${rules.ready.minFico}` });
  }
  if (loan.ltvPercent > rules.ready.maxLtvPercent) {
    found.push({
      field: "ltv",
      reason: `LTV ${formatLtv(loan.ltvPercent)} — above ${rules.ready.maxLtvPercent}%`,
    });
  }
  return found;
}

export function statusOf(loan: Loan): Status {
  if (breaches(loan).length === 0) return "Ready";
  return loan.signOff ? "Signed off" : "Exception";
}

/* ---------- Lenders ---------- */

/** "Harbor Point Lending" → "Harbor Point": the short name the filters and limits use. */
export const shortLender = (lender: string) =>
  lender.replace(/\s+(Lending Co\.|Lending|Capital|Home Loans|Mortgage|Funding)$/, "");

export const lenders = [...new Set(sampleLoans.map((l) => shortLender(l.lender)))].sort();

const HP = totals.lendersOverTheCap[0];
export const capLender = HP.lender; // "Harbor Point"

/* ---------- What isn't in the sample ---------- */

const sum = (loans: Loan[]) => loans.reduce((total, loan) => total + loan.upb, 0);
const sampleHp = sampleLoans.filter((l) => shortLender(l.lender) === capLender);
const sampleOther = sampleLoans.filter((l) => shortLender(l.lender) !== capLender);
const hpTotalCount = data.savedViews.find((v) => v.name === "Harbor Point loans")!.matchingLoans;
const hpTotalUpb = (pool.upb * HP.sharePercent) / 100;

/** Loans not in the sample, in two groups: Harbor Point's and everyone else's. All are Ready. */
export interface HiddenGroup {
  key: "hp" | "other";
  /** The short lender name, when the group is one lender. */
  lender: string | null;
  count: number;
  upb: number;
}

export const hiddenGroups: HiddenGroup[] = [
  { key: "hp", lender: capLender, count: hpTotalCount - sampleHp.length, upb: hpTotalUpb - sum(sampleHp) },
  {
    key: "other",
    lender: null,
    count: totals.loansInPool - hpTotalCount - sampleOther.length,
    upb: pool.upb - hpTotalUpb - sum(sampleOther),
  },
];

/* ---------- Pool state ---------- */

export interface PoolState {
  loans: Loan[];
  /** Ids of sample loans removed from the pool. */
  removed: string[];
  /** Hidden groups removed from the pool (by removing every matching loan). */
  removedGroups: HiddenGroup["key"][];
}

export const initialPool: PoolState = { loans: sampleLoans, removed: [], removedGroups: [] };

export const loansInPool = (state: PoolState) => state.loans.filter((l) => !state.removed.includes(l.id));
const groupsInPool = (state: PoolState) => hiddenGroups.filter((g) => !state.removedGroups.includes(g.key));

export interface PoolTotals {
  count: number;
  upb: number;
  byStatus: Record<Status, number>;
  /** Lenders over the share cap, with their share in percent. */
  overCap: { lender: string; sharePercent: number }[];
  openExceptions: Loan[];
  issues: number;
}

export function poolTotals(state: PoolState): PoolTotals {
  const inPool = loansInPool(state);
  const groups = groupsInPool(state);
  const count = inPool.length + groups.reduce((n, g) => n + g.count, 0);
  const upb = sum(inPool) + groups.reduce((n, g) => n + g.upb, 0);
  const openExceptions = inPool.filter((l) => statusOf(l) === "Exception");
  const signedOff = inPool.filter((l) => statusOf(l) === "Signed off").length;
  const byStatus = {
    Ready: count - openExceptions.length - signedOff,
    Exception: openExceptions.length,
    "Signed off": signedOff,
  };
  // Only the capped lender's share is known; the data says no other lender is over the cap.
  const hpUpb =
    sum(inPool.filter((l) => shortLender(l.lender) === capLender)) +
    groups.filter((g) => g.lender === capLender).reduce((n, g) => n + g.upb, 0);
  const share = upb > 0 ? (hpUpb / upb) * 100 : 0;
  const overCap = share > CAP ? [{ lender: capLender, sharePercent: share }] : [];
  return { count, upb, byStatus, overCap, openExceptions, issues: openExceptions.length + overCap.length };
}

/* ---------- Filters ---------- */

export interface Filters {
  lender: string | null;
  status: Status | null;
  fico: string;
  ltv: string;
  upb: string;
  loanId: string;
}

export const noFilters: Filters = { lender: null, status: null, fico: "", ltv: "", upb: "", loanId: "" };

export type FilterKey = keyof Filters;

interface Range {
  min?: number;
  minInclusive: boolean;
  max?: number;
  maxInclusive: boolean;
}

/** "660–679", "660-679", "> 90%", ">= 680", "<700", "700". Null when empty; "invalid" when unreadable. */
export function parseRange(text: string): Range | null | "invalid" {
  const t = text.replace(/[%,$\s]/g, "");
  if (t === "") return null;
  const between = t.match(/^(\d+(?:\.\d+)?)[-–—](\d+(?:\.\d+)?)$/);
  if (between) {
    const [a, b] = [Number(between[1]), Number(between[2])];
    return { min: Math.min(a, b), max: Math.max(a, b), minInclusive: true, maxInclusive: true };
  }
  const limit = t.match(/^(>=|<=|≥|≤|>|<|=)?(\d+(?:\.\d+)?)$/);
  if (!limit) return "invalid";
  const n = Number(limit[2]);
  switch (limit[1]) {
    case ">":
      return { min: n, minInclusive: false, maxInclusive: true };
    case ">=":
    case "≥":
      return { min: n, minInclusive: true, maxInclusive: true };
    case "<":
      return { max: n, minInclusive: true, maxInclusive: false };
    case "<=":
    case "≤":
      return { max: n, minInclusive: true, maxInclusive: true };
    default:
      return { min: n, max: n, minInclusive: true, maxInclusive: true };
  }
}

const inRange = (value: number, r: Range) =>
  (r.min === undefined || (r.minInclusive ? value >= r.min : value > r.min)) &&
  (r.max === undefined || (r.maxInclusive ? value <= r.max : value < r.max));

/** The range fields, with their labels and what the panel offers as an example. */
export const rangeFields = {
  fico: { label: "FICO", placeholder: "e.g. 660–679", percent: false },
  ltv: { label: "LTV", placeholder: "e.g. > 90%", percent: true },
  upb: { label: "UPB", placeholder: "e.g. > 300,000", percent: false },
} as const;

export type RangeKey = keyof typeof rangeFields;

/** The extra fields Add filter offers. */
export const extraFields: { key: "upb" | "loanId"; label: string }[] = [
  { key: "upb", label: "UPB" },
  { key: "loanId", label: "Loan ID" },
];

function matches(loan: Loan, f: Filters): boolean {
  if (f.lender && shortLender(loan.lender) !== f.lender) return false;
  if (f.status && statusOf(loan) !== f.status) return false;
  for (const [key, value] of [
    ["fico", loan.fico],
    ["ltv", loan.ltvPercent],
    ["upb", loan.upb],
  ] as const) {
    const r = parseRange(f[key]);
    if (r && r !== "invalid" && !inRange(value, r)) return false;
  }
  if (f.loanId.trim() && !loan.id.toLowerCase().includes(f.loanId.trim().toLowerCase())) return false;
  return true;
}

/** Hidden loans are all Ready; their FICO, LTV, UPB, and IDs are unknown, so a value filter excludes them. */
function groupMatches(group: HiddenGroup, f: Filters): boolean {
  if (f.status && f.status !== "Ready") return false;
  if (f.fico.trim() || f.ltv.trim() || f.upb.trim() || f.loanId.trim()) return false;
  if (f.lender) return group.lender === f.lender;
  return true;
}

/** The applied filters, each as a chip label in plain words. */
export function filterChips(f: Filters): { key: FilterKey; label: string }[] {
  const chips: { key: FilterKey; label: string }[] = [];
  if (f.lender) chips.push({ key: "lender", label: `Lender is ${f.lender}` });
  if (f.status) chips.push({ key: "status", label: `Status is ${f.status}` });
  for (const key of ["fico", "ltv", "upb"] as const) {
    const text = f[key].trim();
    if (!text) continue;
    const pretty = text
      .replace(/\s*(>=|<=|>|<)\s*/, (_, op: string) => `${op} `)
      .replace(/\s*[-–—]\s*/, "–");
    chips.push({ key, label: `${rangeFields[key].label} ${/^[<>=]/.test(pretty) ? pretty : `is ${pretty}`}` });
  }
  if (f.loanId.trim()) chips.push({ key: "loanId", label: `Loan ID contains ${f.loanId.trim()}` });
  return chips;
}

export const sameFilters = (a: Filters, b: Filters) =>
  (Object.keys(noFilters) as FilterKey[]).every((k) => (a[k] ?? "") === (b[k] ?? ""));

/* ---------- Saved views ---------- */

export interface SavedView {
  name: string;
  filters: Filters;
  mine?: boolean;
}

export const savedViews: SavedView[] = data.savedViews.map((v) => {
  const filters = { ...noFilters };
  for (const f of v.filters) {
    if (f.field === "Lender") filters.lender = f.value;
    if (f.field === "Status") filters.status = f.value as Status;
  }
  return { name: v.name, filters };
});

/* ---------- Query ---------- */

export type SortKey = "id" | "lender" | "upb" | "fico" | "ltv" | "status" | "exception";
export interface Sort {
  key: string;
  direction: "asc" | "desc";
}

const sortValue = (loan: Loan, key: string): string | number => {
  switch (key) {
    case "upb":
      return loan.upb;
    case "fico":
      return loan.fico;
    case "ltv":
      return loan.ltvPercent;
    case "lender":
      return loan.lender;
    case "status":
      return statusOf(loan);
    case "exception":
      return breaches(loan)
        .map((b) => b.reason)
        .join("; ");
    default:
      return loan.id;
  }
};

export interface QueryResult {
  /** Every sample loan that matches, sorted. */
  sampleMatches: Loan[];
  /** Hidden groups that match. */
  groups: HiddenGroup[];
  /** How many loans in the pool match. */
  total: number;
}

export function query(state: PoolState, f: Filters, sort: Sort): QueryResult {
  const sampleMatches = loansInPool(state)
    .filter((l) => matches(l, f))
    .sort((a, b) => {
      const [x, y] = [sortValue(a, sort.key), sortValue(b, sort.key)];
      const order = typeof x === "number" ? x - (y as number) : String(x).localeCompare(String(y));
      return (sort.direction === "asc" ? order : -order) || a.id.localeCompare(b.id);
    });
  const groups = groupsInPool(state).filter((g) => groupMatches(g, f));
  return { sampleMatches, groups, total: sampleMatches.length + groups.reduce((n, g) => n + g.count, 0) };
}

/* ---------- Formatting ---------- */

export const formatUpb = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatMillions = (n: number) => `$${(n / 1_000_000).toFixed(1)}M`;

/** 32 → "32%", 31.34 → "31.3%". A share just over the cap never rounds down to it. */
export const formatShare = (n: number) => {
  const whole = Math.round(n);
  const nearWhole = Math.abs(n - whole) < 0.05;
  return nearWhole && !(n > CAP && whole <= CAP) ? `${whole}%` : `${(Math.ceil(n * 10) / 10).toFixed(1)}%`;
};

export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

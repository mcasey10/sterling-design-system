import raw from "../data/pool-2026-07.json";

// The pool model. The data file holds a sample of the pool (the first page of each saved view) plus totals.
// Loans outside the sample are never invented: they are only counted, and their UPB is only summed.

export type Status = "Ready" | "Exception" | "Signed off" | "Ineligible";
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

export const POOL = raw.pool;
export const RULES = raw.rules;
export const PAGE_SIZE = raw.pageSize;
export const CANDIDATES = raw.totals.candidatesToAdd;
const OVER_CAP = raw.totals.lendersOverTheCap[0];

/** The over-cap lender's full name, as the loans spell it ("Harbor Point" → "Harbor Point Lending"). */
export const CAPPED_LENDER =
  raw.loans.find((loan) => loan.lender.startsWith(OVER_CAP.lender))?.lender ?? OVER_CAP.lender;

export interface Breach {
  field: "fico" | "ltvPercent";
  reason: string;
  /** Outside even the exception limits: can't be signed off. */
  ineligible: boolean;
}

export const formatLtv = (ltv: number) => `${ltv.toFixed(1)}%`;

/** The eligibility rules each loan breaks. */
export function breaches(loan: Loan): Breach[] {
  const out: Breach[] = [];
  if (loan.fico < RULES.ready.minFico) {
    out.push({
      field: "fico",
      reason: `FICO ${loan.fico} — below ${RULES.ready.minFico}`,
      ineligible: loan.fico < RULES.exception.minFico,
    });
  }
  if (loan.ltvPercent > RULES.ready.maxLtvPercent) {
    out.push({
      field: "ltvPercent",
      reason: `LTV ${formatLtv(loan.ltvPercent)} — above ${RULES.ready.maxLtvPercent}%`,
      ineligible: loan.ltvPercent > RULES.exception.maxLtvPercent,
    });
  }
  return out;
}

export function statusOf(loan: Loan): Status {
  const found = breaches(loan);
  if (found.length === 0) return "Ready";
  if (found.some((b) => b.ineligible)) return "Ineligible";
  return loan.signOff ? "Signed off" : "Exception";
}

export interface PoolState {
  /** The sampled loans, with any sign-offs made on this screen. */
  loans: Loan[];
  /** Sampled loans removed from the pool. */
  removed: string[];
  /** Loans outside the sample, by lender group. The totals say they are all Ready. */
  unseenCapped: number;
  unseenOther: number;
  /** Their combined UPB. */
  unseenCappedUpb: number;
  unseenOtherUpb: number;
}

function initialPool(): PoolState {
  const loans: Loan[] = raw.loans.map((loan) => ({ ...loan }));
  const cappedView = raw.savedViews.find((view) =>
    view.filters.some((f) => f.field === "Lender" && f.value === OVER_CAP.lender),
  );
  const cappedTotal = cappedView?.matchingLoans ?? 0;
  const sampledCapped = loans.filter((loan) => loan.lender === CAPPED_LENDER);
  const sampledOther = loans.filter((loan) => loan.lender !== CAPPED_LENDER);
  const sum = (list: Loan[]) => list.reduce((total, loan) => total + loan.upb, 0);
  // The capped lender's UPB follows from its share of the pool.
  const cappedUpb = (POOL.upb * OVER_CAP.sharePercent) / 100;
  return {
    loans,
    removed: [],
    unseenCapped: cappedTotal - sampledCapped.length,
    unseenOther: raw.totals.loansInPool - cappedTotal - sampledOther.length,
    unseenCappedUpb: cappedUpb - sum(sampledCapped),
    unseenOtherUpb: POOL.upb - cappedUpb - sum(sampledOther),
  };
}

export const INITIAL_POOL = initialPool();

export const LENDERS = [...new Set(raw.loans.map((loan) => loan.lender))].sort();

export const inPool = (pool: PoolState) => pool.loans.filter((loan) => !pool.removed.includes(loan.id));

export interface PoolTotals {
  loans: number;
  upb: number;
  byStatus: Record<Status, number>;
  cappedShare: number;
  openExceptions: Loan[];
  overCap: boolean;
  issues: number;
}

export function totalsOf(pool: PoolState): PoolTotals {
  const loans = inPool(pool);
  const byStatus: Record<Status, number> = { Ready: 0, Exception: 0, "Signed off": 0, Ineligible: 0 };
  for (const loan of loans) byStatus[statusOf(loan)] += 1;
  byStatus.Ready += pool.unseenCapped + pool.unseenOther;
  const sampledUpb = loans.reduce((total, loan) => total + loan.upb, 0);
  const upb = sampledUpb + pool.unseenCappedUpb + pool.unseenOtherUpb;
  const cappedUpb =
    loans.filter((loan) => loan.lender === CAPPED_LENDER).reduce((t, loan) => t + loan.upb, 0) +
    pool.unseenCappedUpb;
  const cappedShare = upb > 0 ? (cappedUpb / upb) * 100 : 0;
  const openExceptions = loans.filter((loan) => {
    const status = statusOf(loan);
    return status === "Exception" || status === "Ineligible";
  });
  const overCap = cappedShare > RULES.lenderSharePercentCap + 1e-9;
  return {
    loans: loans.length + pool.unseenCapped + pool.unseenOther,
    upb,
    byStatus,
    cappedShare,
    openExceptions,
    overCap,
    issues: openExceptions.length + (overCap ? 1 : 0),
  };
}

// ---- Filters ---------------------------------------------------------------------------------------------

export interface Range {
  min?: number;
  max?: number;
  minExclusive?: boolean;
  maxExclusive?: boolean;
}

/**
 * Reads "660–679", "660-679", "660 to 679", "≥ 680", ">= 680", "> 90%", "< 680", or a single value.
 * Returns null when the text isn't one of those.
 */
export function parseRange(text: string): Range | null {
  const t = text.trim().replace(/%/g, "").replace(/,/g, "");
  const num = "(\\d+(?:\\.\\d+)?)";
  let m = t.match(new RegExp(`^${num}\\s*(?:-|–|—|to)\\s*${num}$`, "i"));
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    return { min: Math.min(a, b), max: Math.max(a, b) };
  }
  m = t.match(new RegExp(`^(>=|≥|>|<=|≤|<)\\s*${num}$`));
  if (m) {
    const v = Number(m[2]);
    switch (m[1]) {
      case ">":
        return { min: v, minExclusive: true };
      case ">=":
      case "≥":
        return { min: v };
      case "<":
        return { max: v, maxExclusive: true };
      default:
        return { max: v };
    }
  }
  m = t.match(new RegExp(`^${num}$`));
  if (m) return { min: Number(m[1]), max: Number(m[1]) };
  return null;
}

export function inRange(value: number, r: Range): boolean {
  if (r.min !== undefined && (r.minExclusive ? value <= r.min : value < r.min)) return false;
  if (r.max !== undefined && (r.maxExclusive ? value >= r.max : value > r.max)) return false;
  return true;
}

/** Plain words for a range, e.g. "660–679", "≥ 680", "> 90%". */
export function describeRange(r: Range, unit = "", grouped = false): string {
  const n = (v: number) => (grouped ? v.toLocaleString("en-US") : String(v));
  if (r.min !== undefined && r.max !== undefined && !r.minExclusive && !r.maxExclusive) {
    return r.min === r.max ? `${n(r.min)}${unit}` : `${n(r.min)}–${n(r.max)}${unit}`;
  }
  if (r.min !== undefined) return `${r.minExclusive ? ">" : "≥"} ${n(r.min)}${unit}`;
  if (r.max !== undefined) return `${r.maxExclusive ? "<" : "≤"} ${n(r.max)}${unit}`;
  return "";
}

/** The filters in effect. Empty fields add no condition. */
export interface Filters {
  lender: string | null;
  status: Status | null;
  fico: string;
  ltv: string;
  upb: string;
}

export const NO_FILTERS: Filters = { lender: null, status: null, fico: "", ltv: "", upb: "" };

export type FilterKey = keyof Filters;

export function filtersEqual(a: Filters, b: Filters): boolean {
  return (
    a.lender === b.lender &&
    a.status === b.status &&
    a.fico.trim() === b.fico.trim() &&
    a.ltv.trim() === b.ltv.trim() &&
    a.upb.trim() === b.upb.trim()
  );
}

/** One chip per applied filter, in plain words. */
export function chipsFor(f: Filters): { key: FilterKey; label: string }[] {
  const chips: { key: FilterKey; label: string }[] = [];
  if (f.lender) chips.push({ key: "lender", label: `Lender is ${f.lender}` });
  if (f.status) chips.push({ key: "status", label: `Status is ${f.status}` });
  const fico = f.fico.trim() ? parseRange(f.fico) : null;
  if (fico) chips.push({ key: "fico", label: `FICO ${fico.min === fico.max ? "is " : ""}${describeRange(fico)}` });
  const ltv = f.ltv.trim() ? parseRange(f.ltv) : null;
  if (ltv) chips.push({ key: "ltv", label: `LTV ${ltv.min === ltv.max ? "is " : ""}${describeRange(ltv, "%")}` });
  const upb = f.upb.trim() ? parseRange(f.upb) : null;
  if (upb) chips.push({ key: "upb", label: `UPB ${upb.min === upb.max ? "is " : ""}${describeRange(upb, "", true)}` });
  return chips;
}

export function describeFilters(f: Filters): string {
  const chips = chipsFor(f);
  return chips.length ? chips.map((c) => c.label).join(" · ") : "No filters";
}

export interface QueryResult {
  /** The sampled loans that match, in the pool. */
  rows: Loan[];
  /** How many loans in the pool match. */
  total: number;
  /** False when the count can only cover the sample (a filter the totals can't answer). */
  exact: boolean;
  /** How many loans outside the sample match. */
  unseen: number;
}

export function query(pool: PoolState, f: Filters): QueryResult {
  const fico = f.fico.trim() ? parseRange(f.fico) : null;
  const ltv = f.ltv.trim() ? parseRange(f.ltv) : null;
  const upb = f.upb.trim() ? parseRange(f.upb) : null;
  const rows = inPool(pool).filter(
    (loan) =>
      (!f.lender || loan.lender === f.lender) &&
      (!f.status || statusOf(loan) === f.status) &&
      (!fico || inRange(loan.fico, fico)) &&
      (!ltv || inRange(loan.ltvPercent, ltv)) &&
      (!upb || inRange(loan.upb, upb)),
  );

  // Loans outside the sample are all Ready: FICO ≥ 680 and LTV ≤ 90%, but their exact values are unknown.
  let exact = true;
  let unseen = 0;
  const statusAllows = !f.status || f.status === "Ready";
  const minFico = RULES.ready.minFico;
  const maxLtv = RULES.ready.maxLtvPercent;
  const ficoExcludesReady =
    fico?.max !== undefined && (fico.max < minFico || (fico.max === minFico && !!fico.maxExclusive));
  const ltvExcludesReady =
    ltv?.min !== undefined && (ltv.min > maxLtv || (ltv.min === maxLtv && !!ltv.minExclusive));
  if (statusAllows && !ficoExcludesReady && !ltvExcludesReady) {
    if (fico || ltv || upb) exact = false;
    else if (!f.lender) unseen = pool.unseenCapped + pool.unseenOther;
    else if (f.lender === CAPPED_LENDER) unseen = pool.unseenCapped;
    else exact = false;
  }
  return { rows, total: rows.length + unseen, exact, unseen };
}

// ---- Saved views -----------------------------------------------------------------------------------------

export interface SavedView {
  id: string;
  name: string;
  group: "Predefined" | "Saved by me";
  filters: Filters;
}

function viewFilters(list: { field: string; value: string }[]): Filters {
  const f: Filters = { ...NO_FILTERS };
  for (const { field, value } of list) {
    if (field === "Lender") f.lender = LENDERS.find((l) => l.startsWith(value)) ?? value;
    if (field === "Status") f.status = value as Status;
  }
  return f;
}

export const INITIAL_VIEWS: SavedView[] = [
  { id: "all", name: "All pool loans", group: "Predefined", filters: { ...NO_FILTERS } },
  ...raw.savedViews.map(
    (view, index): SavedView => ({
      id: `view-${index}`,
      name: view.name,
      // The trader's own view is the starting state; the exceptions view reads as a predefined one.
      group: view.name === "Harbor Point loans" ? "Saved by me" : "Predefined",
      filters: viewFilters(view.filters),
    }),
  ),
];

export const START_VIEW_ID = INITIAL_VIEWS.find((v) => v.name === "Harbor Point loans")!.id;

// ---- Formatting ------------------------------------------------------------------------------------------

export const formatUpb = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatMillions = (n: number) => `$${(n / 1_000_000).toFixed(1)}M`;

export const formatShare = (n: number) => `${Number(n.toFixed(1))}%`;

export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

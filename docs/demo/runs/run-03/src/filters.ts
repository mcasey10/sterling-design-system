import { shortLender, type Loan, type LoanStatus, type UnseenGroup } from "./data";

export interface Filters {
  lender: string | null;
  status: LoanStatus | null;
  /** As typed: "660–679", "> 700", "< 680". Empty doesn't filter. */
  fico: string;
  ltv: string;
}

export const NO_FILTERS: Filters = { lender: null, status: null, fico: "", ltv: "" };

export interface Range {
  min?: number;
  max?: number;
  minInclusive: boolean;
  maxInclusive: boolean;
}

/** Reads "660–679", "660 to 679", "> 90", ">= 680", "≤ 80%", or "720". Returns null if it can't. */
export function parseRange(text: string): Range | null {
  const t = text.trim().replace(/%/g, "").replace(/\s+/g, " ");
  const num = "(\\d+(?:\\.\\d+)?)";
  let m = t.match(new RegExp(`^${num} ?(?:-|–|—|to) ?${num}$`, "i"));
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    return { min: Math.min(a, b), max: Math.max(a, b), minInclusive: true, maxInclusive: true };
  }
  m = t.match(new RegExp(`^(>=|≥|>|<=|≤|<) ?${num}$`));
  if (m) {
    const n = Number(m[2]);
    switch (m[1]) {
      case ">": return { min: n, minInclusive: false, maxInclusive: true };
      case ">=": case "≥": return { min: n, minInclusive: true, maxInclusive: true };
      case "<": return { max: n, minInclusive: true, maxInclusive: false };
      default: return { max: n, minInclusive: true, maxInclusive: true };
    }
  }
  m = t.match(new RegExp(`^${num}$`));
  if (m) return { min: Number(m[1]), max: Number(m[1]), minInclusive: true, maxInclusive: true };
  return null;
}

export function inRange(value: number, r: Range) {
  if (r.min !== undefined && (r.minInclusive ? value < r.min : value <= r.min)) return false;
  if (r.max !== undefined && (r.maxInclusive ? value > r.max : value >= r.max)) return false;
  return true;
}

/** The range in plain words: "660–679", "over 90%", "680 or more". */
export function describeRange(r: Range, unit = "") {
  const u = (n: number) => `${n}${unit}`;
  if (r.min !== undefined && r.max !== undefined) return r.min === r.max ? u(r.min) : `${r.min}–${u(r.max)}`;
  if (r.min !== undefined) return r.minInclusive ? `${u(r.min)} or more` : `over ${u(r.min)}`;
  if (r.max !== undefined) return r.maxInclusive ? `${u(r.max)} or less` : `under ${u(r.max)}`;
  return "any";
}

export interface Chip {
  field: keyof Filters;
  label: string;
}

/** Every applied filter, in plain words. Empty fields add no chip. */
export function chipsFor(f: Filters): Chip[] {
  const chips: Chip[] = [];
  if (f.lender) chips.push({ field: "lender", label: `Lender is ${f.lender}` });
  if (f.status) chips.push({ field: "status", label: `Status is ${f.status}` });
  const fico = f.fico.trim() ? parseRange(f.fico) : null;
  if (fico) chips.push({ field: "fico", label: `FICO ${describeRange(fico)}` });
  const ltv = f.ltv.trim() ? parseRange(f.ltv) : null;
  if (ltv) chips.push({ field: "ltv", label: `LTV ${describeRange(ltv, "%")}` });
  return chips;
}

export const sameFilters = (a: Filters, b: Filters) =>
  a.lender === b.lender && a.status === b.status && a.fico.trim() === b.fico.trim() && a.ltv.trim() === b.ltv.trim();

export function matchesLoan(loan: Loan, status: LoanStatus, f: Filters) {
  if (f.lender && shortLender(loan.lender) !== f.lender) return false;
  if (f.status && status !== f.status) return false;
  const fico = f.fico.trim() ? parseRange(f.fico) : null;
  if (fico && !inRange(loan.fico, fico)) return false;
  const ltv = f.ltv.trim() ? parseRange(f.ltv) : null;
  if (ltv && !inRange(loan.ltvPercent, ltv)) return false;
  return true;
}

/**
 * Whether a group of loans outside the sample matches. Every loan in a group is Ready; their FICO and LTV
 * aren't known, and the "other" group's lenders aren't either, so some filters make the answer "unknown".
 */
export function matchesGroup(g: UnseenGroup, f: Filters): "all" | "none" | "unknown" {
  if (f.status && f.status !== "Ready") return "none";
  if (f.lender) {
    if (g.lender && g.lender !== f.lender) return "none";
    if (!g.lender && f.lender === "Harbor Point") return "none";
    if (!g.lender) return "unknown";
  }
  if (f.fico.trim() || f.ltv.trim()) return "unknown";
  return "all";
}

export function filtersFromView(view: { filters: { field: string; value: string }[] }): Filters {
  const f: Filters = { ...NO_FILTERS };
  for (const { field, value } of view.filters) {
    if (field === "Lender") f.lender = value;
    if (field === "Status") f.status = value as LoanStatus;
    if (field === "FICO") f.fico = value;
    if (field === "LTV") f.ltv = value;
  }
  return f;
}

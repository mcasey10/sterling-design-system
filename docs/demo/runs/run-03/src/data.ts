import raw from "../data/pool-2026-07.json";

export type LoanStatus = "Ready" | "Exception" | "Signed off";
export const STATUSES: LoanStatus[] = ["Ready", "Exception", "Signed off"];

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
export const savedViews = raw.savedViews;
export const sampleLoans: Loan[] = raw.loans;

/** The lender name used in filters and chips ("Harbor Point" for "Harbor Point Lending"). */
export function shortLender(lender: string): string {
  return lender.replace(/\s+(Lending Co\.|Lending|Capital|Home Loans|Mortgage|Funding)$/, "");
}

export const LENDERS = [...new Set(sampleLoans.map((l) => shortLender(l.lender)))].sort();

/** Which values break the Ready rule, with the reason in words. */
export function breaks(loan: Pick<Loan, "fico" | "ltvPercent">) {
  const out: { key: "fico" | "ltv"; reason: string }[] = [];
  if (loan.fico < rules.ready.minFico) {
    out.push({ key: "fico", reason: `FICO ${loan.fico} — below ${rules.ready.minFico}` });
  }
  if (loan.ltvPercent > rules.ready.maxLtvPercent) {
    out.push({
      key: "ltv",
      reason: `LTV ${formatPercent(loan.ltvPercent)} — above ${rules.ready.maxLtvPercent}%`,
    });
  }
  return out;
}

export function statusOf(loan: Loan, signOffs: Record<string, SignOff>): LoanStatus {
  if (breaks(loan).length === 0) return "Ready";
  return loan.signOff || signOffs[loan.id] ? "Signed off" : "Exception";
}

/* ---------- The loans outside the sample ----------
   The file holds only the first page of each view. Its totals account for every exception and sign-off, and
   all of those are in the sample, so every loan outside it is Ready. They are kept as two groups whose sizes
   come from the totals: Harbor Point's other loans (its view matches 58), and everyone else's. */

const HARBOR = "Harbor Point";
const harborShare = totals.lendersOverTheCap.find((l) => l.lender === HARBOR)?.sharePercent ?? 0;
const harborView = savedViews.find((v) => v.filters.some((f) => f.field === "Lender" && f.value === HARBOR));
const harborCount = harborView?.matchingLoans ?? 0;
const sum = (loans: Loan[]) => loans.reduce((s, l) => s + l.upb, 0);
const isHarbor = (l: Loan) => shortLender(l.lender) === HARBOR;
const harborSample = sampleLoans.filter(isHarbor);
const otherSample = sampleLoans.filter((l) => !isHarbor(l));
const harborUpb = (pool.upb * harborShare) / 100;

export type GroupId = "harbor" | "other";
export interface UnseenGroup {
  id: GroupId;
  /** The group's lender, when every loan in it has the same one. */
  lender: string | null;
  count: number;
  upb: number;
}

export const unseenGroups: UnseenGroup[] = [
  { id: "harbor", lender: HARBOR, count: harborCount - harborSample.length, upb: harborUpb - sum(harborSample) },
  {
    id: "other",
    lender: null,
    count: totals.loansInPool - harborCount - otherSample.length,
    upb: pool.upb - harborUpb - sum(otherSample),
  },
];

/* ---------- Formatting ---------- */

const amount = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const formatUpb = (n: number) => amount.format(n);
export const formatPercent = (n: number) => `${n.toFixed(1)}%`;
export const formatMillions = (n: number) => `$${(n / 1_000_000).toFixed(1)}M`;
/** 32 → "32%", 31.46 → "31.5%". */
export const formatShare = (n: number) => `${Number(n.toFixed(1))}%`;
export const plural = (n: number, one: string, many = `${one}s`) =>
  `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

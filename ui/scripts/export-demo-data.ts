// Writes the loan pooling example's data as JSON, for an application built outside this repository
// (demo/data/pool-2026-07.json, which the demo kit ships). It is the example's data and business rules from
// plugin/src/example/loan-pooling/loanData.ts, and nothing about how the screen is drawn: no columns, widths,
// selection, or layout. All of it is fictional.
// This script imports the plugin's example, whose files use Figma's types, so it is left out of ui/'s
// type-check (tsconfig.json "exclude"); `check:demo-data` runs it on every CI build instead.
//
// Usage: npm run export:demo-data            (writes the file)
//        npm run check:demo-data             (fails if the committed file differs from the source)

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { COUNTS, EXCEPTIONS_VIEW, POOL, POOL_LOANS, POOL_VIEW, PAGE_SIZE, candidateTotal, poolTotal } from "../../plugin/src/example/loan-pooling/loanData";

const file = resolve(dirname(fileURLToPath(import.meta.url)), "../../demo/data/pool-2026-07.json");

const view = (v: { name: string; filters: { field: string; panel: string }[]; total: number }) => ({
  name: v.name,
  filters: v.filters.map((f) => ({ field: f.field, value: f.panel })),
  matchingLoans: v.total,
});

const data = {
  about:
    "Fictional sample data for the loan pooling example. `loans` is a sample of the pool, not all of it: it holds the " +
    "first page of each saved view. Use `totals` and each view's `matchingLoans` for counts.",
  pool: {
    id: POOL.id,
    name: POOL.name,
    state: POOL.state,
    criteria: POOL.criteria,
    targetUpb: POOL.targetM * 1_000_000,
    upb: POOL.upbM * 1_000_000,
  },
  rules: {
    ready: { minFico: 680, maxLtvPercent: 90 },
    exception: { minFico: 660, maxLtvPercent: 95 },
    lenderSharePercentCap: COUNTS.limitBreaches[0].cap,
  },
  totals: {
    loansInPool: poolTotal(),
    loansByStatus: COUNTS.pool,
    candidatesToAdd: candidateTotal(),
    lendersOverTheCap: COUNTS.limitBreaches.map((b) => ({ lender: b.lender, sharePercent: b.share, capPercent: b.cap })),
  },
  pageSize: PAGE_SIZE,
  savedViews: [view(POOL_VIEW), view(EXCEPTIONS_VIEW)],
  loans: POOL_LOANS.map((l) => ({
    id: l.id,
    lender: l.lender,
    upb: l.upb,
    fico: l.fico,
    ltvPercent: l.ltv,
    ...(l.signOff ? { signOff: l.signOff } : {}),
  })),
};

const text = JSON.stringify(data, null, 2) + "\n";
if (process.argv.includes("--check")) {
  const current = existsSync(file) ? readFileSync(file, "utf8") : "";
  if (current !== text) {
    console.error("  ✗ demo/data/pool-2026-07.json is out of date: run npm run export:demo-data and commit the result");
    process.exit(1);
  }
  console.log(`demo/data/pool-2026-07.json matches the example's data: ${data.loans.length} sample loans of ${data.totals.loansInPool} — 0 problem(s).`);
} else {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
  console.log(`Wrote demo/data/pool-2026-07.json: ${data.loans.length} sample loans of ${data.totals.loansInPool}.`);
}

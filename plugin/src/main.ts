// Sterling — entry point.
// Generates variables, text styles, and pages from tokens/tokens.json. Safe to rerun.
//
// Menu commands (Plugins → Development → Sterling):
//   • Build library — variables, text styles, and every library page (library/buildLibrary.ts).
//   • Build example — the loan-pooling example page, from an existing library; never writes to
//     variables, styles, or library pages (example/loan-pooling/buildExample.ts).
//
// Pages: Cover · Read me · Foundations · Components · Guidelines · Patterns · Template (blank skeleton) ·
// Component architecture (reference) · Example: Loan pooling (an example built with Sterling).

import { buildLibrary } from "./library/buildLibrary";
import { buildExample } from "./example/loan-pooling/buildExample";
import { report, printReport } from "./core/log";

function finish(what: string, extra = "") {
  printReport();
  const counts = `(${report.created.length} created, ${report.updated.length} updated)${extra}`;
  const warnings = report.warnings.length ? ` — ${report.warnings.length} warning(s), see console` : "";
  figma.closePlugin(`${what} ${counts}${warnings}`);
}

async function run() {
  const result = figma.command === "example" ? await buildExample() : await buildLibrary();
  figma.viewport.scrollAndZoomIntoView([result.focus]);
  finish(result.summary, result.extra);
}

run().catch((e: Error) => {
  console.error(e);
  figma.closePlugin(`Sterling failed: ${e.message}`);
});

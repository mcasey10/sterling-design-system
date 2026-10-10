// Collects a run report so the final notification and console log summarize
// what was created, updated, or skipped.

export interface Report {
  created: string[];
  updated: string[];
  warnings: string[];
}

export const report: Report = { created: [], updated: [], warnings: [] };

export function created(what: string) {
  report.created.push(what);
}

export function updated(what: string) {
  report.updated.push(what);
}

export function warn(message: string) {
  report.warnings.push(message);
  console.warn(`[sterling] ${message}`);
}

export function printReport() {
  console.log(
    `[sterling] Created ${report.created.length}, updated ${report.updated.length}, warnings ${report.warnings.length}`
  );
  if (report.created.length) console.log("Created:\n  " + report.created.join("\n  "));
  if (report.warnings.length) console.log("Warnings:\n  " + report.warnings.join("\n  "));
}

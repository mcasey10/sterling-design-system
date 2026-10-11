// "Build example": the loan-pooling example page, built from an existing library. Reads the library's
// variables, text styles, and components without changing them, so run "Build library" first.
// Then runs the link check on the example page and the example checks (data and action triggers).

import { useStrokeScale, ensurePage, underlineInstanceLinks, plainInstanceLinks } from "../../core/helpers";
import { loadKit, loadLibrary } from "../../library/libraryLoader";
import { report, warn } from "../../core/log";
import { snapshotInstances, compareInstances } from "../../core/linkCheck";
import { buildLoanExample, EXAMPLE_PAGE } from "./loanPooling";
import { CHECK_FAILED } from "./checks";

export async function buildExample(): Promise<{ summary: string; extra: string; focus: SceneNode }> {
  const kit = await loadKit();
  useStrokeScale(kit);
  const componentsPage = figma.root.children.find((p) => p.name === "Components");
  if (!componentsPage) throw new Error('Components page not found — run "Build library" first.');
  await componentsPage.loadAsync();
  const lib = loadLibrary(componentsPage);

  const instancesBefore = await snapshotInstances([EXAMPLE_PAGE]);
  const page = await ensurePage(EXAMPLE_PAGE);
  const root = await buildLoanExample(kit, page, lib);
  // Link text inside instances keeps the styling it had when its text was set, so it is underlined here.
  await underlineInstanceLinks(page);
  const plain = await plainInstanceLinks(page);
  if (plain) warn(`${CHECK_FAILED} — ${plain} link text(s) in instances aren't underlined`);

  const links = await compareInstances(instancesBefore);
  const kept = [...links.values()].reduce((n, c) => n + c.kept, 0);
  const changed = report.warnings.filter((w) => w.startsWith("Link check")).length;
  // Example checks (data consistency + action triggers) are failures, shown in the notification.
  const failed = report.warnings.filter((w) => w.startsWith(CHECK_FAILED)).length;

  await figma.setCurrentPageAsync(page);
  return {
    summary: "Sterling example: loan pooling",
    extra: ` · links: ${kept} kept, ${changed} changed · example checks: ${failed ? `${failed} FAILED` : "pass"}`,
    focus: root,
  };
}

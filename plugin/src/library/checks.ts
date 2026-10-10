// Library checks, run at the end of "Build library". Failures are logged as warnings starting with
// LIBRARY_CHECK_FAILED, and the run notification shows "library checks: N FAILED".
//   • Every published component has a registry entry, a one-sentence description, and a documentation link.
//   • Every registry entry matches a published component (no stale entries).
//   • Every published variable (Color, Spacing, Size, Density) has a description.
//   • Every Primitives variable is hidden from publishing.
//   • In the generic grid, each right-aligned header label is flush with the values below it.

import { COMPONENT_DOCS, docFor, isOneSentence, targetLabel } from "./docRegistry";
import { publishedComponents } from "./docLinks";
import { GENERIC_DATA, headerAlignmentProblems } from "./components/grid";
import { COLLECTIONS } from "../core/variables";
import type { Kit } from "../core/helpers";
import { warn } from "../core/log";

export const LIBRARY_CHECK_FAILED = "Library check failed";

export function checkLibrary(kit: Kit, componentsPage: PageNode) {
  const failures: string[] = [];
  const components = publishedComponents(componentsPage);
  for (const comp of components) {
    const entry = docFor(comp.name);
    if (!entry) {
      failures.push(`${comp.name} has no entry in docRegistry.ts`);
      continue;
    }
    if (!comp.description.trim()) failures.push(`${comp.name} has no description`);
    else if (!isOneSentence(comp.description)) failures.push(`${comp.name}: the description isn't exactly one sentence`);
    if (!comp.documentationLinks.length) {
      failures.push(`${comp.name} has no documentation link (target ${targetLabel(entry.docs)} not found)`);
    }
  }
  const names = new Set(components.map((c) => c.name));
  for (const name of Object.keys(COMPONENT_DOCS)) {
    if (!names.has(name)) failures.push(`docRegistry.ts has an entry for ${name}, but no published component has that name`);
  }

  let primitives = 0;
  let published = 0;
  for (const [key, variable] of kit.vars) {
    if (key.startsWith(`${COLLECTIONS.primitives}/`)) {
      primitives++;
      if (!variable.hiddenFromPublishing) failures.push(`Primitives/${variable.name} isn't hidden from publishing`);
    } else {
      published++;
      if (!variable.description.trim()) failures.push(`${key} has no description (add it to "$descriptions" in tokens.json)`);
    }
  }

  const grid = components.find((c) => c.name === "Grid/Data grid");
  if (grid?.type === "COMPONENT") failures.push(...headerAlignmentProblems(grid, GENERIC_DATA));

  for (const f of failures) warn(`${LIBRARY_CHECK_FAILED} — ${f}`);
  console.log(
    `[sterling] Library checks — ${components.length} published components (description, one sentence, documentation link), ` +
      `${Object.keys(COMPONENT_DOCS).length} registry entries, ${published} published variables (description), ` +
      `${primitives} Primitives hidden: ` +
      `${failures.length ? `${failures.length} failed` : "pass"}`
  );
}

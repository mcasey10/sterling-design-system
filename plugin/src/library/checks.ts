// Library checks, run at the end of "Build library". Failures are logged as warnings starting with
// LIBRARY_CHECK_FAILED, and the run notification shows "library checks: N FAILED".
//   • Every published component has a registry entry, a one-sentence description, and a documentation link.
//   • Every registry entry matches a published component (no stale entries).
//   • Every published component matches its definition in definitions/components.ts: the same variant
//     properties and values, and the same properties with the same types and defaults.
//   • Every published variable (Color, Spacing, Size, Density) has a description.
//   • Every Primitives variable is hidden from publishing.
//   • In the generic grid, each right-aligned header label is flush with the values below it, and every
//     numeric cell's content fits its column.

import { COMPONENT_DOCS, docFor, isOneSentence, targetLabel } from "../../../definitions/docRegistry";
import { publishedComponents } from "./docLinks";
import { GENERIC_DATA, gridLayoutProblems } from "./components/grid";
import { COLLECTIONS } from "../core/variables";
import type { Kit } from "../core/helpers";
import { warn } from "../core/log";
import { COMPONENTS, variantCount } from "../../../definitions/components";

export const LIBRARY_CHECK_FAILED = "Library check failed";

const sameSet = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x) => b.includes(x));

/**
 * Differences between a built component and its definition in definitions/components.ts: variant properties
 * and their values, the variant count, and each property's name, type, and default (instance-swap defaults are
 * node IDs in Figma and icon names in the definition, so only their presence is compared).
 */
function definitionProblems(comp: ComponentNode | ComponentSetNode): string[] {
  if (comp.name.startsWith("Icon/")) return []; // icons have no properties; their glyphs are in definitions/icons.ts
  const def = COMPONENTS[comp.name];
  if (!def) return [`${comp.name} has no entry in definitions/components.ts`];
  const problems: string[] = [];
  const built = comp.componentPropertyDefinitions;
  const builtName = (key: string) => key.split("#")[0];
  const variantKeys = Object.keys(built).filter((k) => built[k].type === "VARIANT");
  if (!sameSet(variantKeys.map(builtName), Object.keys(def.variants))) {
    problems.push(`${comp.name}: variant properties are [${variantKeys.map(builtName).join(", ")}], defined as [${Object.keys(def.variants).join(", ")}]`);
  }
  for (const key of variantKeys) {
    const values = def.variants[builtName(key)];
    const options = built[key].variantOptions ?? [];
    if (values && !sameSet(options, values)) {
      problems.push(`${comp.name} / ${builtName(key)}: values are [${options.join(", ")}], defined as [${values.join(", ")}]`);
    }
  }
  const count = comp.type === "COMPONENT_SET" ? comp.children.length : 1;
  if (count !== variantCount(def)) problems.push(`${comp.name}: ${count} variants built, ${variantCount(def)} defined`);

  const otherKeys = Object.keys(built).filter((k) => built[k].type !== "VARIANT");
  if (!sameSet(otherKeys.map(builtName), def.properties.map((p) => p.name))) {
    problems.push(`${comp.name}: properties are [${otherKeys.map(builtName).join(", ")}], defined as [${def.properties.map((p) => p.name).join(", ")}]`);
  }
  for (const key of otherKeys) {
    const prop = def.properties.find((p) => p.name === builtName(key));
    if (!prop) continue;
    if (built[key].type !== prop.type) problems.push(`${comp.name} / ${prop.name}: type is ${built[key].type}, defined as ${prop.type}`);
    else if ((prop.type === "TEXT" || prop.type === "BOOLEAN") && built[key].defaultValue !== prop.default) {
      problems.push(`${comp.name} / ${prop.name}: default is ${JSON.stringify(built[key].defaultValue)}, defined as ${JSON.stringify(prop.default)}`);
    }
  }
  return problems;
}

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
  for (const comp of components) failures.push(...definitionProblems(comp));
  for (const name of Object.keys(COMPONENTS)) {
    if (!names.has(name)) failures.push(`definitions/components.ts defines ${name}, but no published component has that name`);
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
  if (grid?.type === "COMPONENT") failures.push(...gridLayoutProblems(grid, GENERIC_DATA));

  for (const f of failures) warn(`${LIBRARY_CHECK_FAILED} — ${f}`);
  console.log(
    `[sterling] Library checks — ${components.length} published components (description, one sentence, documentation link), ` +
      `${Object.keys(COMPONENT_DOCS).length} registry entries, ${Object.keys(COMPONENTS).length} definitions matched, ` +
      `${published} published variables (description), ` +
      `${primitives} Primitives hidden: ` +
      `${failures.length ? `${failures.length} failed` : "pass"}`
  );
}

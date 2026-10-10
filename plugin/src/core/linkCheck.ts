// Link check: records which main component (variant) every instance on the given pages uses
// before a rebuild, and compares afterwards. An instance that still exists must point at the
// same main component node — same node means still linked and the same variant selected, even
// when a property or value was renamed. Results go to the run report.
//
// Instances inside documentation frames that are rebuilt each run (e.g. the Component architecture
// reference sheet) are recreated, so they're counted as "rebuilt" rather than compared.

import { updated, warn } from "./log";

interface Entry {
  page: string;
  name: string;
  main: string;
  variant: string;
}
export interface InstanceSnapshot {
  /** The pages checked, in report order. */
  pages: string[];
  entries: Map<string, Entry>;
}

function describe(main: ComponentNode): string {
  return main.parent?.type === "COMPONENT_SET" ? `${main.parent.name} / ${main.name}` : main.name;
}

/** Every top-level instance (not a sublayer of another instance) on the given pages. */
export async function snapshotInstances(pages: string[]): Promise<InstanceSnapshot> {
  const snap = new Map<string, Entry>();
  for (const name of pages) {
    const page = figma.root.children.find((p) => p.name === name);
    if (!page) continue;
    await page.loadAsync();
    for (const inst of page.findAllWithCriteria({ types: ["INSTANCE"] })) {
      if (inst.id.startsWith("I")) continue;
      const main = await inst.getMainComponentAsync();
      snap.set(inst.id, { page: name, name: inst.name, main: main?.id ?? "", variant: main ? describe(main) : "(missing)" });
    }
  }
  return { pages, entries: snap };
}

/** Compares a snapshot taken before the run with the current file and reports the result. */
export async function compareInstances(before: InstanceSnapshot) {
  const { pages } = before;
  const after = (await snapshotInstances(pages)).entries;
  const counts = new Map<string, { kept: number; renamed: number; rebuilt: number }>();
  for (const name of pages) counts.set(name, { kept: 0, renamed: 0, rebuilt: 0 });

  for (const [id, b] of before.entries) {
    const c = counts.get(b.page)!;
    const a = after.get(id);
    if (!a) {
      c.rebuilt++;
      continue;
    }
    if (a.main !== b.main) {
      warn(`Link check: ${b.page} / "${b.name}" (${id}) now uses ${a.variant}, was ${b.variant}`);
      continue;
    }
    c.kept++;
    if (a.variant !== b.variant) {
      c.renamed++;
      updated(`Link check: ${b.page} / "${b.name}" ${b.variant} → ${a.variant} (same variant, renamed)`);
    }
  }
  for (const [id, a] of after) {
    if (!a.main) warn(`Link check: ${a.page} / "${a.name}" (${id}) has no main component`);
  }

  const summary = pages.map((p) => {
    const c = counts.get(p)!;
    return `${p}: ${c.kept} kept (${c.renamed} with renamed properties), ${c.rebuilt} rebuilt`;
  }).join(" · ");
  console.log(`[sterling] Link check — ${summary}`);
  return counts;
}

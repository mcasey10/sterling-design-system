// Bulk action bar — "N selected · Select all M matching" plus actions, shown above a grid while
// rows are selected. Built from a spec so the Components page has a generic bar
// (Grid/BulkActionBar) and worked examples can define their own actions.
// Properties: Count, Select all (text), Hint and Show hint (why an action is disabled; off by default), plus
// one boolean per toggleable action. Action buttons are exposed instances, so their labels can be edited
// from the bar instance.

import { Kit, color, density, space, configureFrame } from "../../core/helpers";
import {
  ensureComponent, ensureFrame, ensureInstance, ensureText, ensureProp, prune, reference, setProps, variantOf,
} from "../../core/ensure";
import type { IconIndex } from "../icons";
import { describe } from "../docRegistry";

export interface BarAction {
  /** Layer name; keep stable so instance overrides survive reruns. */
  name: string;
  label: string;
  variant: "primary" | "secondary" | "ghost" | "danger";
  icon?: string;
  /** Boolean property controlling visibility; omitted = always shown. */
  toggle?: { prop: string; default: boolean; previousNames?: string[] };
}

export interface BarSpec {
  name: string;
  description: string;
  count: string;
  selectAll: string;
  actions: BarAction[];
  /**
   * Optional hint before the actions (Caption, text/secondary), e.g. why an action is disabled. Adds Hint (text)
   * and Show hint (boolean, off by default) properties.
   */
  hint?: string;
}

export const GENERIC_BAR: BarSpec = {
  name: "Grid/BulkActionBar",
  description: describe("Grid/BulkActionBar"),
  count: "2 selected",
  selectAll: "Select all 120 matching",
  actions: [
    { name: "Clear", label: "Clear selection", variant: "ghost" },
    { name: "Secondary", label: "Export", variant: "secondary" },
    { name: "Destructive", label: "Delete", variant: "danger", toggle: { prop: "Show destructive", default: true } },
    { name: "Primary", label: "Primary action", variant: "primary" },
  ],
  hint: "No eligible items selected",
};

export async function buildBulkActionBar(
  kit: Kit,
  page: PageNode,
  parent: FrameNode,
  index: number,
  sets: { button: ComponentSetNode; checkbox: ComponentSetNode; icons: IconIndex },
  width: number,
  spec: BarSpec
): Promise<ComponentNode> {
  const comp = ensureComponent(page, parent, index, spec.name, spec.description);
  configureFrame(comp, {
    direction: "HORIZONTAL",
    align: "CENTER",
    justify: "SPACE_BETWEEN",
    width,
    padding: { x: space(kit, "space/12"), y: space(kit, "space/4") },
    fill: color(kit, "accent/subtle"),
    stroke: color(kit, "border/default"),
    radius: space(kit, "radius/sm"),
  });

  const selection = ensureFrame(
    comp, "Selection",
    { direction: "HORIZONTAL", align: "CENTER", gap: density(kit, "control/gap") },
    0
  );
  const box = await ensureInstance(selection, "Checkbox", variantOf(sets.checkbox, { Checked: "indeterminate", State: "default" }), 0);
  const count = await ensureText(kit, selection, "Count", spec.count, "Body-strong", "text/primary", 1);
  const dot = await ensureText(kit, selection, "Separator", "·", "Body", "text/secondary", 2);
  const all = await ensureText(kit, selection, "Select all", spec.selectAll, "Body", "accent/default", 3);
  prune(selection, [box, count, dot, all]);

  const actions = ensureFrame(
    comp, "Actions",
    { direction: "HORIZONTAL", align: "CENTER", gap: space(kit, "space/8") },
    1
  );
  const keep: SceneNode[] = [];
  if (spec.hint) keep.push(await ensureText(kit, actions, "Hint", spec.hint, "Caption", "text/secondary", 0));
  for (const a of spec.actions) {
    const main = variantOf(sets.button, { Kind: a.variant, Size: "sm", State: "default" });
    const btn = await ensureInstance(actions, a.name, main, keep.length);
    setProps(btn, a.icon
      ? { Label: a.label, "Show icon": true, Icon: sets.icons.get(a.icon)!.id }
      : { Label: a.label });
    if (!btn.isExposedInstance) btn.isExposedInstance = true;
    keep.push(btn);
  }
  prune(actions, keep);
  prune(comp, [selection, actions]);

  reference(comp, "Count", "characters", ensureProp(comp, "Count", "TEXT", spec.count));
  reference(comp, "Select all", "characters", ensureProp(comp, "Select all", "TEXT", spec.selectAll));
  const showAll = ensureProp(comp, "Show select all", "BOOLEAN", true);
  reference(comp, "Separator", "visible", showAll);
  reference(comp, "Select all", "visible", showAll);
  if (spec.hint) {
    reference(comp, "Hint", "characters", ensureProp(comp, "Hint", "TEXT", spec.hint));
    reference(comp, "Hint", "visible", ensureProp(comp, "Show hint", "BOOLEAN", false));
  }
  for (const a of spec.actions) {
    if (a.toggle) reference(comp, a.name, "visible", ensureProp(comp, a.toggle.prop, "BOOLEAN", a.toggle.default, undefined, a.toggle.previousNames));
  }
  return comp;
}

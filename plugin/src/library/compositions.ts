// Compositions: reusable layouts built from library components — the filter panel, the view toolbar with its
// filter chips, the view menu, side-panel cards, and link rows. The Patterns page shows them with neutral data;
// examples pass their own fields and values. They aren't components: each call builds (or updates in place)
// frames and instances inside the parent it's given, so they work on screens that are updated in place and in
// documentation frames that are redrawn.

import { Kit, color, space, setSize, frame } from "../core/helpers";
import { ensureFrame, ensureInstance, ensureText, setProps, variantOf, prune } from "../core/ensure";
import { columnSpan } from "../core/layout";
import type { Library } from "./pages/componentsPage";

function fillWidth(node: SceneNode & LayoutMixin) {
  if (node.layoutSizingHorizontal !== "FILL") node.layoutSizingHorizontal = "FILL";
}

/** One field in a filter panel. An empty field shows its placeholder. */
export interface FilterField {
  label: string;
  kind: "select" | "text";
  placeholder: string;
}

/**
 * Grid toolbar: "View" label + view select · applied filter chips · Save view (right, enabled only when the
 * view was edited). Filters are added in the filter panel.
 */
export async function toolbar(
  kit: Kit, lib: Library, parent: FrameNode, index: number, view: string, chips: string[], saveEnabled: boolean
) {
  const bar = ensureFrame(
    parent, "Toolbar",
    { direction: "HORIZONTAL", align: "CENTER", justify: "SPACE_BETWEEN", gap: space(kit, "space/8"), fillWidth: true },
    index
  );
  // Left: "View" label + view select · applied filter chips. Right: Save view (enabled only when the view
  // was edited). Filters are added in the filter panel. (No spacer frame: an empty frame keeps a default height.)
  const left = ensureFrame(bar, "Filters", { direction: "HORIZONTAL", align: "CENTER", gap: space(kit, "space/8") }, 0);
  const keep: SceneNode[] = [];
  keep.push(await ensureText(kit, left, "View label", "View", "Label", "text/secondary", 0));
  const select = await ensureInstance(left, "View", variantOf(lib.select, { State: "default", Content: "value" }), 1);
  setSize(select, 200, select.height);
  setProps(select, { Label: "View", Value: view, "Show label": false, "Show helper": false });
  keep.push(select);
  for (const [i, label] of chips.entries()) {
    const c = await ensureInstance(left, `Filter ${i + 1}`, variantOf(lib.filterChip, { State: "default" }), keep.length);
    setProps(c, { Label: label, "Show remove": true });
    keep.push(c);
  }
  prune(left, keep);
  const save = await ensureInstance(bar, "Save view",
    variantOf(lib.button, { Kind: "ghost", Size: "sm", State: saveEnabled ? "default" : "disabled" }), 1);
  setProps(save, { Label: "Save view" });
  prune(bar, [left, save]);
  return bar;
}

/**
 * Left filter panel (2 of 12 columns by default): a title, one field per filterable column, + Add filter, then
 * Reset / Apply. It filters the grid only. `values` fills fields by label (e.g. from a chosen view); empty
 * fields show their placeholder.
 */
export async function filterPanel(
  kit: Kit, lib: Library, parent: FrameNode, index: number, title: string, fields: FilterField[],
  values: Record<string, string> = {}, width = columnSpan(2)
): Promise<FrameNode> {
  const panel = ensureFrame(
    parent, "Filters panel",
    {
      gap: space(kit, "space/12"),
      padding: space(kit, "space/16"),
      width,
      fill: color(kit, "surface/panel"),
      stroke: color(kit, "border/default"),
      radius: space(kit, "radius/md"),
    },
    index
  );
  const keep: SceneNode[] = [
    await ensureText(kit, panel, "Title", title, "Heading", "text/primary", 0),
  ];
  for (const f of fields) {
    const value = values[f.label];
    const set = f.kind === "select" ? lib.select : lib.textInput;
    const inst = await ensureInstance(panel, f.label, variantOf(set, { State: "default", Content: value ? "value" : "placeholder" }), keep.length);
    fillWidth(inst);
    setProps(inst, value
      ? { Label: f.label, Value: value, "Show helper": false }
      : { Label: f.label, Placeholder: f.placeholder, "Show helper": false });
    keep.push(inst);
  }
  const add = await ensureInstance(panel, "Add filter", variantOf(lib.button, { Kind: "ghost", Size: "sm", State: "default" }), keep.length);
  setProps(add, { Label: "Add filter", "Show icon": true, Icon: lib.icons.get("plus")!.id });
  keep.push(add);
  const actions = ensureFrame(panel, "Actions", { direction: "HORIZONTAL", gap: space(kit, "space/8"), justify: "MAX", fillWidth: true }, keep.length);
  const reset = await ensureInstance(actions, "Reset", variantOf(lib.button, { Kind: "ghost", Size: "sm", State: "default" }), 0);
  setProps(reset, { Label: "Reset" });
  const apply = await ensureInstance(actions, "Apply", variantOf(lib.button, { Kind: "primary", Size: "sm", State: "default" }), 1);
  setProps(apply, { Label: "Apply" });
  prune(actions, [reset, apply]);
  keep.push(actions);
  prune(panel, keep);
  return panel;
}

/** One group in a view menu: a heading and its views, each with the filter set it applies. */
export interface ViewGroup {
  heading: string;
  views: { name: string; filter: string; selected?: boolean }[];
}

/**
 * Open view menu: a raised list with a heading per group (e.g. Predefined, Saved by me) and one two-line
 * option per view — its name, and its filter set in muted text. Appended to `parent`.
 */
export function viewMenu(kit: Kit, lib: Library, parent: FrameNode, groups: ViewGroup[], width: number): FrameNode {
  const menu = frame("Menu", {
    padding: { y: space(kit, "space/4") },
    width,
    fill: color(kit, "surface/raised"),
    stroke: color(kit, "border/default"),
    radius: space(kit, "radius/sm"),
  });
  parent.appendChild(menu);
  for (const group of groups) {
    const h = lib.menuHeading.createInstance();
    menu.appendChild(h);
    fillWidth(h);
    setProps(h, { Label: group.heading });
    for (const v of group.views) {
      const o = variantOf(lib.optionDescription, { State: v.selected ? "selected" : "default" }).createInstance();
      menu.appendChild(o);
      fillWidth(o);
      setProps(o, { Label: v.name, Description: v.filter });
    }
  }
  return menu;
}

/** Card in a side panel: a bordered panel for a title and its content, styled like a summary metric. */
export function card(kit: Kit, parent: FrameNode, name: string, index: number): FrameNode {
  const c = ensureFrame(
    parent, name,
    {
      gap: space(kit, "space/8"),
      padding: space(kit, "space/16"),
      fill: color(kit, "surface/panel"),
      stroke: color(kit, "border/default"),
      radius: space(kit, "radius/md"),
      fillWidth: true,
    },
    index
  );
  return c;
}

/** A row of links separated by "·" (e.g. shortcuts that each add a filter chip). */
export async function linkRow(kit: Kit, lib: Library, parent: FrameNode, name: string, labels: string[], index: number) {
  const row = ensureFrame(parent, name, { direction: "HORIZONTAL", align: "CENTER", gap: space(kit, "space/4"), wrap: true, fillWidth: true }, index);
  const keep: SceneNode[] = [];
  for (const [i, label] of labels.entries()) {
    if (i > 0) keep.push(await ensureText(kit, row, `Separator ${i}`, "·", "Label", "text/secondary", keep.length));
    const link = await ensureInstance(row, `Link ${i + 1}`, variantOf(lib.link, { Size: "sm", State: "default" }), keep.length);
    setProps(link, { Label: label });
    keep.push(link);
  }
  prune(row, keep);
  return row;
}

/**
 * The Body of a dialog instance, emptied and ready for the caller's content. Returns null if the Body slot
 * can't be found or edited (the caller should then leave the dialog's default content).
 */
export function dialogBody(dialog: InstanceNode): FrameNode | null {
  try {
    const body = dialog.findOne((n) => n.name === "Body") as FrameNode | null;
    if (!body) return null;
    for (const c of [...body.children]) c.remove();
    return body;
  } catch {
    return null;
  }
}

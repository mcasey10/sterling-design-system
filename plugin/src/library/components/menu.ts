// Input/Option — one row of a select's menu. State (default / hover / selected / disabled).
// Selected adds a check icon and bold label, so selection isn't shown by the tint alone.
// Input/Menu — the open list: a raised panel of exposed Option instances. The open Select variant
// places one below its field.

import { Kit, color, density, space, configureFrame, setSize, truncate } from "../../core/helpers";
import {
  ComponentSetSpec, Props, combos, ensureInstance, ensureText, ensureProp, prune, tintIcon, reference, variantOf,
  setProps, ensureComponent, ensureFrame,
} from "../../core/ensure";
import type { IconIndex } from "../icons";
import { describe } from "../../../../definitions/docRegistry";

export const MENU_WIDTH = 240;

const LOOKS: Record<string, { fill?: string; text: string; style: string }> = {
  default: { text: "text/primary", style: "Body" },
  hover: { fill: "surface/hover", text: "text/primary", style: "Body" },
  selected: { fill: "accent/subtle", text: "text/primary", style: "Body-strong" },
  disabled: { text: "text/disabled", style: "Body" },
};

export function optionSpec(kit: Kit, icons: IconIndex): ComponentSetSpec {
  return {
    name: "Input/Option",
    description: describe("Input/Option"),
    variants: combos({ State: ["default", "hover", "selected", "disabled"] }),
    columnProp: "State",

    async build(comp: ComponentNode, p: Props) {
      const look = LOOKS[p.State];
      configureFrame(comp, {
        direction: "HORIZONTAL",
        align: "CENTER",
        gap: density(kit, "control/gap"),
        padding: { x: density(kit, "control/padding-x") },
        width: MENU_WIDTH,
        height: density(kit, "control/height"),
        fill: look.fill ? color(kit, look.fill) : undefined,
      });
      const label = await ensureText(kit, comp, "Label", "Option", look.style, look.text, 0);
      truncate(label, { fill: true });
      const keep: SceneNode[] = [label];
      if (p.State === "selected") {
        const check = await ensureInstance(comp, "Check", icons.get("check")!, 1);
        setSize(check, density(kit, "icon/size"), density(kit, "icon/size"));
        tintIcon(check, color(kit, "accent/default"));
        keep.push(check);
      }
      prune(comp, keep);
    },

    wire(set: ComponentSetNode, variants: ComponentNode[]) {
      const labelKey = ensureProp(set, "Label", "TEXT", "Option");
      for (const comp of variants) reference(comp, "Label", "characters", labelKey);
    },
  };
}

const MENU_OPTIONS: { state: string; label: string }[] = [
  { state: "default", label: "Option one" },
  { state: "selected", label: "Option two" },
  { state: "hover", label: "Option three" },
  { state: "default", label: "Option four" },
  { state: "disabled", label: "Option five" },
];

/** Input/Menu: five exposed Option instances on a raised panel. */
export async function buildMenu(
  kit: Kit,
  page: PageNode,
  parent: FrameNode,
  index: number,
  option: ComponentSetNode
): Promise<ComponentNode> {
  const comp = ensureComponent(
    page, parent, index, "Input/Menu",
    describe("Input/Menu")
  );
  configureFrame(comp, {
    padding: { y: space(kit, "space/4") },
    width: MENU_WIDTH,
    fill: color(kit, "surface/raised"),
    stroke: color(kit, "border/default"),
    radius: space(kit, "radius/sm"),
  });
  const keep: SceneNode[] = [];
  for (const [i, o] of MENU_OPTIONS.entries()) {
    const inst = await ensureInstance(comp, `Option ${i + 1}`, variantOf(option, { State: o.state }), i);
    if (inst.layoutSizingHorizontal !== "FILL") inst.layoutSizingHorizontal = "FILL";
    setProps(inst, { Label: o.label });
    if (!inst.isExposedInstance) inst.isExposedInstance = true;
    keep.push(inst);
  }
  prune(comp, keep);
  return comp;
}

export const DESCRIPTION_MENU_WIDTH = 280;

/** Input/Option with description — a menu row with a muted second line (e.g. a saved view and its filter). */
export function optionDescriptionSpec(kit: Kit, icons: IconIndex): ComponentSetSpec {
  return {
    name: "Input/Option with description",
    description: describe("Input/Option with description"),
    variants: combos({ State: ["default", "hover", "selected", "disabled"] }),
    columnProp: "State",

    async build(comp: ComponentNode, p: Props) {
      const look = LOOKS[p.State];
      const disabled = p.State === "disabled";
      configureFrame(comp, {
        direction: "HORIZONTAL",
        align: "CENTER",
        gap: density(kit, "control/gap"),
        padding: { x: density(kit, "control/padding-x"), y: space(kit, "space/8") },
        width: DESCRIPTION_MENU_WIDTH,
        fill: look.fill ? color(kit, look.fill) : undefined,
      });
      const textCol = ensureFrame(comp, "Text", { gap: space(kit, "space/2") }, 0);
      if (textCol.layoutGrow !== 1) textCol.layoutGrow = 1;
      const label = await ensureText(kit, textCol, "Label", "Option", look.style, look.text, 0);
      const detail = await ensureText(kit, textCol, "Description", "Description", "Caption", disabled ? "text/disabled" : "text/secondary", 1);
      truncate(label, { fill: true });
      truncate(detail, { fill: true });
      prune(textCol, [label, detail]);
      const keep: SceneNode[] = [textCol];
      if (p.State === "selected") {
        const check = await ensureInstance(comp, "Check", icons.get("check")!, 1);
        setSize(check, density(kit, "icon/size"), density(kit, "icon/size"));
        tintIcon(check, color(kit, "accent/default"));
        keep.push(check);
      }
      prune(comp, keep);
    },

    wire(set: ComponentSetNode, variants: ComponentNode[]) {
      const labelKey = ensureProp(set, "Label", "TEXT", "Option");
      const detailKey = ensureProp(set, "Description", "TEXT", "Description");
      for (const comp of variants) {
        reference(comp, "Label", "characters", labelKey);
        reference(comp, "Description", "characters", detailKey);
      }
    },
  };
}

/** Input/Menu heading — a group heading inside a menu ("Predefined", "Saved by me"). */
export async function buildMenuHeading(kit: Kit, page: PageNode, parent: FrameNode, index: number): Promise<ComponentNode> {
  const comp = ensureComponent(
    page, parent, index, "Input/Menu heading",
    describe("Input/Menu heading")
  );
  configureFrame(comp, {
    padding: { x: density(kit, "control/padding-x"), y: space(kit, "space/4") },
    width: DESCRIPTION_MENU_WIDTH,
  });
  const label = await ensureText(kit, comp, "Label", "Group", "Label", "text/secondary", 0);
  truncate(label, { fill: true });
  prune(comp, [label]);
  reference(comp, "Label", "characters", ensureProp(comp, "Label", "TEXT", "Group"));
  return comp;
}

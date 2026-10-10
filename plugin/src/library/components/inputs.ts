// Input/Text and Input/Select — State × Content (value / placeholder).
// State: default / hover / focus / error / error-focus / warning / disabled, plus open (Select only:
// an Input/Menu under the field). Label above, field, helper text below. Error and warning add an icon
// and colored helper text, not just a border color; error-focus keeps the error and adds the focus ring.
// Properties: Label, Value, Placeholder, Helper (text), Show label, Show helper (boolean).

import { Kit, size, color, density, space, configureFrame, setSize, truncate } from "../../core/helpers";
import {
  ComponentSetSpec, Props, combos, ensureFrame, ensureInstance, ensureText, ensureProp, prune, tintIcon, reference,
  ensureFocusRing,
} from "../../core/ensure";
import type { IconIndex } from "../icons";
import { describe } from "../../../../definitions/docRegistry";

interface FieldLook {
  fill: string;
  stroke: string;
  weight: number;
  value: string;
  helper: string;
  /** Helper icon and its color (error / warning), so the state never relies on the border color alone. */
  flag?: { icon: string; ink: string; layer: string };
  ring?: boolean;
}

const ERROR = { icon: "circle-x", ink: "status/critical", layer: "Error icon" };
const WARNING = { icon: "alert-triangle", ink: "status/warning-strong", layer: "Warning icon" };

const LOOKS: Record<string, FieldLook> = {
  default: { fill: "surface/panel", stroke: "border/strong", weight: 1, value: "text/primary", helper: "text/secondary" },
  hover: { fill: "surface/panel", stroke: "text/secondary", weight: 1, value: "text/primary", helper: "text/secondary" },
  focus: { fill: "surface/panel", stroke: "focus/ring", weight: 2, value: "text/primary", helper: "text/secondary" },
  open: { fill: "surface/panel", stroke: "focus/ring", weight: 2, value: "text/primary", helper: "text/secondary" },
  error: { fill: "surface/panel", stroke: "status/critical", weight: 1, value: "text/primary", helper: "status/critical", flag: ERROR },
  "error-focus": {
    fill: "surface/panel", stroke: "status/critical", weight: 1, value: "text/primary", helper: "status/critical", flag: ERROR, ring: true,
  },
  warning: {
    fill: "surface/panel", stroke: "status/warning", weight: 1, value: "text/primary", helper: "status/warning-strong", flag: WARNING,
  },
  disabled: { fill: "surface/disabled", stroke: "border/default", weight: 1, value: "text/disabled", helper: "text/disabled" },
};

const TEXT_STATES = ["default", "hover", "focus", "error", "error-focus", "warning", "disabled"];
const SELECT_STATES = ["default", "hover", "focus", "open", "error", "error-focus", "warning", "disabled"];

function inputSpec(kit: Kit, icons: IconIndex, kind: "text" | "select", menu?: ComponentNode): ComponentSetSpec {
  const select = kind === "select";
  const defaults = select
    ? { label: "Label", value: "Option", placeholder: "Select an option", helper: "Helper text" }
    : { label: "Label", value: "Value", placeholder: "Enter a value", helper: "Helper text" };
  return {
    name: select ? "Input/Select" : "Input/Text",
    description: describe(select ? "Input/Select" : "Input/Text"),
    variants: combos({ State: select ? SELECT_STATES : TEXT_STATES, Content: ["value", "placeholder"] }),
    columnProp: "State",

    async build(comp: ComponentNode, p: Props) {
      const look = LOOKS[p.State];
      const placeholder = p.Content === "placeholder";
      const disabled = p.State === "disabled";
      configureFrame(comp, { gap: space(kit, "space/4"), width: 240 });

      const label = await ensureText(kit, comp, "Label", defaults.label, "Label", "text/secondary", 0);

      const field = ensureFrame(
        comp, "Field",
        {
          direction: "HORIZONTAL",
          align: "CENTER",
          justify: select ? "SPACE_BETWEEN" : "MIN",
          gap: density(kit, "control/gap"),
          padding: { x: density(kit, "control/padding-x") },
          height: density(kit, "control/height"),
          fill: color(kit, look.fill),
          stroke: color(kit, look.stroke),
          strokeSides: { top: look.weight, right: look.weight, bottom: look.weight, left: look.weight },
          radius: space(kit, "radius/sm"),
          fillWidth: true,
        },
        1
      );
      // Value variants show the Value layer; placeholder variants show the Placeholder layer instead.
      const content = placeholder
        ? await ensureText(kit, field, "Placeholder", defaults.placeholder, "Body", disabled ? "text/disabled" : "text/secondary", 0)
        : await ensureText(kit, field, "Value", defaults.value, select ? "Body" : "Numeric", look.value, 0);
      truncate(content, { fill: true });
      const fieldKeep: SceneNode[] = [content];
      if (select) {
        const chevron = await ensureInstance(field, "Chevron", icons.get(p.State === "open" ? "chevron-up" : "chevron-down")!, 1);
        setSize(chevron, density(kit, "icon/size"), density(kit, "icon/size"));
        tintIcon(chevron, color(kit, disabled ? "text/disabled" : "text/secondary"));
        fieldKeep.push(chevron);
      }
      // The open list sits under the field, positioned absolutely so the select's height doesn't change.
      if (select && p.State === "open" && menu) {
        const list = await ensureInstance(field, "Menu", menu);
        if (list.layoutPositioning !== "ABSOLUTE") list.layoutPositioning = "ABSOLUTE";
        if (list.constraints.horizontal !== "STRETCH" || list.constraints.vertical !== "MIN") {
          list.constraints = { horizontal: "STRETCH", vertical: "MIN" };
        }
        const y = field.height + 4;
        if (list.x !== 0) list.x = 0;
        if (list.y !== y) list.y = y;
        if (list.width !== field.width) list.resize(field.width, list.height);
        fieldKeep.push(list);
      }
      // error-focus keeps the error border and adds the focus ring outside the field.
      const ring = ensureFocusRing(kit, field, !!look.ring, space(kit, "radius/sm"));
      if (ring) fieldKeep.push(ring);
      prune(field, fieldKeep);

      // Open: the menu covers where the helper text would be (as in a real dropdown), so the open variant has
      // no helper row — otherwise it would paint over the menu, which sits inside the field.
      if (p.State === "open") {
        comp.findChild((n) => n.name === "Helper row")?.remove();
        prune(comp, [label, field]);
        return;
      }
      const helperRow = ensureFrame(
        comp, "Helper row",
        { direction: "HORIZONTAL", align: "CENTER", gap: space(kit, "space/4") },
        2
      );
      const helperKeep: SceneNode[] = [];
      if (look.flag) {
        const icon = await ensureInstance(helperRow, look.flag.layer, icons.get(look.flag.icon)!, 0);
        setSize(icon, size(kit, "size/12"), size(kit, "size/12"));
        tintIcon(icon, color(kit, look.flag.ink));
        helperKeep.push(icon);
      }
      helperKeep.push(await ensureText(kit, helperRow, "Helper", defaults.helper, "Caption", look.helper, helperKeep.length));
      prune(helperRow, helperKeep);
      prune(comp, [label, field, helperRow]);
    },

    wire(set: ComponentSetNode, variants: ComponentNode[]) {
      const labelKey = ensureProp(set, "Label", "TEXT", defaults.label);
      const valueKey = ensureProp(set, "Value", "TEXT", defaults.value);
      const placeholderKey = ensureProp(set, "Placeholder", "TEXT", defaults.placeholder);
      const helperKey = ensureProp(set, "Helper", "TEXT", defaults.helper);
      const showLabelKey = ensureProp(set, "Show label", "BOOLEAN", true);
      const showHelperKey = ensureProp(set, "Show helper", "BOOLEAN", true);
      for (const comp of variants) {
        reference(comp, "Label", "characters", labelKey);
        reference(comp, "Label", "visible", showLabelKey);
        reference(comp, "Value", "characters", valueKey);
        reference(comp, "Placeholder", "characters", placeholderKey);
        reference(comp, "Helper", "characters", helperKey);
        reference(comp, "Helper row", "visible", showHelperKey);
      }
    },
  };
}

export const textInputSpec = (kit: Kit, icons: IconIndex) => inputSpec(kit, icons, "text");
export const selectSpec = (kit: Kit, icons: IconIndex, menu: ComponentNode) => inputSpec(kit, icons, "select", menu);

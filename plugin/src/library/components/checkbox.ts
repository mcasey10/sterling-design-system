// Checkbox — Checked (off / on / indeterminate) × State (default / hover / focus / disabled).
// A 16px Box with a 12px glyph, plus an optional Label (Show label, off by default so grid use is
// unchanged — with the label hidden the checkbox is still 16 × 16).

import { Kit, size, color, space, configureFrame, setSize } from "../../core/helpers";
import {
  ComponentSetSpec, Props, combos, ensureFrame, ensureInstance, ensureText, prune, tintIcon, reference, ensureFocusRing,
  defineProp, variantAxes,
} from "../../core/ensure";
import type { IconIndex } from "../icons";
import { describe } from "../../../../definitions/docRegistry";

export function checkboxSpec(kit: Kit, icons: IconIndex): ComponentSetSpec {
  return {
    name: "Controls/Checkbox",
    description: describe("Controls/Checkbox"),
    variants: combos(variantAxes("Controls/Checkbox")),
    columnProp: "State",

    async build(comp: ComponentNode, p: Props) {
      const off = p.Checked === "off";
      const disabled = p.State === "disabled";
      const hover = p.State === "hover";
      const fill = disabled
        ? "surface/disabled"
        : off
          ? hover ? "surface/hover" : "surface/panel"
          : hover ? "accent/hover" : "accent/default";
      const stroke = disabled ? "border/default" : off ? "border/strong" : undefined;
      // The component is a hugging row (Box + Label); the box look lives on the Box layer.
      configureFrame(comp, { direction: "HORIZONTAL", align: "CENTER", gap: space(kit, "space/8") });
      const box = ensureFrame(
        comp, "Box",
        {
          direction: "HORIZONTAL",
          align: "CENTER",
          justify: "CENTER",
          width: size(kit, "size/16"),
          height: size(kit, "size/16"),
          radius: space(kit, "radius/xs"),
          fill: color(kit, fill),
          stroke: stroke ? color(kit, stroke) : undefined,
        },
        0
      );
      if (off) {
        prune(box, []);
      } else {
        const icon = await ensureInstance(box, "Icon", icons.get(p.Checked === "on" ? "check" : "minus")!, 0);
        setSize(icon, size(kit, "size/12"), size(kit, "size/12"));
        tintIcon(icon, color(kit, disabled ? "text/disabled" : "text/inverse"));
        prune(box, [icon]);
      }
      const label = await ensureText(kit, comp, "Label", "Label", "Body", disabled ? "text/disabled" : "text/primary", 1);
      // Hidden by default (Show label); the property reference toggles it per instance.
      if (!label.componentPropertyReferences?.visible && label.visible) label.visible = false;
      const ring = ensureFocusRing(kit, comp, p.State === "focus", space(kit, "radius/xs"));
      prune(comp, ring ? [box, label, ring] : [box, label]);
    },

    wire(set: ComponentSetNode, variants: ComponentNode[]) {
      const labelKey = defineProp(set, "Label");
      const showKey = defineProp(set, "Show label");
      for (const comp of variants) {
        reference(comp, "Label", "characters", labelKey);
        reference(comp, "Label", "visible", showKey);
      }
    },
  };
}

// Chip/Filter — removable filter chip. State (default / hover / pressed / focus).
// Properties: Label (text), Show remove (boolean, shows the x icon).

import { Kit, size, color, density, space, configureFrame, setSize, truncate, doc } from "../../core/helpers";
import { ComponentSetSpec, Props, combos, ensureInstance, ensureText, ensureProp, prune, tintIcon, reference, ensureFocusRing } from "../../core/ensure";
import type { IconIndex } from "../icons";

export function filterChipSpec(kit: Kit, icons: IconIndex): ComponentSetSpec {
  return {
    name: "Chip/Filter",
    description:
      doc(
      "Applied filter, State (default / hover / pressed / focus). Label and Show remove are component properties; labels " +
        "longer than 240px truncate. Height follows Density → control/height-sm.",
      "summarizing filters already applied to a view, with a way to remove each one.",
      "showing a record's status (use Chip/Status), or offering filters to apply (use inputs and selects in a filters panel).",
      { guidelines: ["Accessibility"], patterns: ["Filters, grid, and bulk actions"] }
    ),
    variants: combos({ State: ["default", "hover", "pressed", "focus"] }),
    columnProp: "State",

    async build(comp: ComponentNode, p: Props) {
      configureFrame(comp, {
        direction: "HORIZONTAL",
        align: "CENTER",
        gap: space(kit, "space/4"),
        padding: { x: density(kit, "control/padding-x-sm") },
        height: density(kit, "control/height-sm"),
        radius: space(kit, "radius/pill"),
        fill: color(kit, p.State === "hover" ? "surface/hover" : p.State === "pressed" ? "surface/pressed" : "surface/panel"),
        stroke: color(kit, "border/strong"),
      });
      const label = await ensureText(kit, comp, "Label", "Filter: Value", "Label", "text/primary", 0);
      truncate(label, { maxWidth: 240 });
      const remove = await ensureInstance(comp, "Remove", icons.get("x")!, 1);
      setSize(remove, size(kit, "size/12"), size(kit, "size/12"));
      tintIcon(remove, color(kit, "text/secondary"));
      const ring = ensureFocusRing(kit, comp, p.State === "focus", space(kit, "radius/pill"));
      prune(comp, ring ? [label, remove, ring] : [label, remove]);
    },

    wire(set: ComponentSetNode, variants: ComponentNode[]) {
      const labelKey = ensureProp(set, "Label", "TEXT", "Filter: Value");
      const removableKey = ensureProp(set, "Show remove", "BOOLEAN", true);
      for (const comp of variants) {
        reference(comp, "Label", "characters", labelKey);
        reference(comp, "Remove", "visible", removableKey);
      }
    },
  };
}

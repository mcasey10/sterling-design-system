// Controls/Link — inline text link. Size (sm / md) × State (default / hover / focus).
// Always underlined, so a link is never marked by color alone: the underline is part of its text styles
// (Label-link, Body-link), never written on the layer (see ensureComponentSet). Property: Label (text).

import { Kit, space, configureFrame } from "../../core/helpers";
import {
  ComponentSetSpec, Props, combos, ensureText, prune, reference, ensureFocusRing, defineProp, variantAxes,
} from "../../core/ensure";
import { describe } from "../../../../definitions/docRegistry";

export function linkSpec(kit: Kit): ComponentSetSpec {
  return {
    name: "Controls/Link",
    description: describe("Controls/Link"),
    variants: combos(variantAxes("Controls/Link")),
    columnProp: "State",

    async build(comp: ComponentNode, p: Props) {
      configureFrame(comp, { direction: "HORIZONTAL", align: "CENTER" });
      const label = await ensureText(
        kit, comp, "Label", "Link", p.Size === "md" ? "Body-link" : "Label-link", p.State === "hover" ? "accent/hover" : "accent/default", 0
      );
      const ring = ensureFocusRing(kit, comp, p.State === "focus", space(kit, "radius/xs"));
      prune(comp, ring ? [label, ring] : [label]);
    },

    wire(set: ComponentSetNode, variants: ComponentNode[]) {
      const labelKey = defineProp(set, "Label");
      for (const comp of variants) reference(comp, "Label", "characters", labelKey);
    },
  };
}

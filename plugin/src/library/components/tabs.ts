// Tabs/Tab — State (default / hover / focus / disabled / selected / selected-focus). Label plus a count badge; the selected tab adds a
// 2px accent underline and stronger text, so selection isn't shown by color alone.
// Properties: Label, Count (text).

import { Kit, color, density, space, configureFrame, truncate } from "../../core/helpers";
import { ComponentSetSpec, Props, combos, ensureFrame, ensureText, ensureProp, prune, reference, ensureFocusRing } from "../../core/ensure";
import { describe } from "../docRegistry";

export function tabSpec(kit: Kit): ComponentSetSpec {
  return {
    name: "Tabs/Tab",
    description: describe("Tabs/Tab"),
    variants: combos({ State: ["default", "hover", "focus", "disabled", "selected", "selected-focus"] }),
    columnProp: "State",

    async build(comp: ComponentNode, p: Props) {
      const selected = p.State.startsWith("selected");
      const disabled = p.State === "disabled";
      const labelInk = disabled ? "text/disabled" : selected || p.State === "hover" ? "text/primary" : "text/secondary";
      configureFrame(comp, {
        direction: "HORIZONTAL",
        align: "CENTER",
        gap: space(kit, "space/8"),
        padding: { x: space(kit, "space/12") },
        height: density(kit, "control/height"),
        fill: p.State === "hover" ? color(kit, "surface/hover") : undefined,
        stroke: selected ? color(kit, "accent/default") : undefined,
        strokeSides: { bottom: 2 },
      });
      const label = await ensureText(
        kit, comp, "Label", "Tab", selected ? "Body-strong" : "Body", labelInk, 0
      );
      const badge = ensureFrame(
        comp, "Badge",
        {
          direction: "HORIZONTAL",
          align: "CENTER",
          padding: { x: space(kit, "space/4") },
          radius: space(kit, "radius/pill"),
          fill: color(kit, selected ? "accent/subtle" : "status/neutral-subtle"),
        },
        1
      );
      const count = await ensureText(
        kit, badge, "Count", "0", "Caption", disabled ? "text/disabled" : selected ? "accent/default" : "status/neutral-strong", 0
      );
      prune(badge, [count]);
      truncate(label, { maxWidth: 200 });
      // Tabs sit edge to edge, so the focus ring is drawn inside the tab.
      const ring = ensureFocusRing(kit, comp, p.State.endsWith("focus"), space(kit, "radius/sm"), "inside");
      prune(comp, ring ? [label, badge, ring] : [label, badge]);
    },

    wire(set: ComponentSetNode, variants: ComponentNode[]) {
      const labelKey = ensureProp(set, "Label", "TEXT", "Tab");
      const countKey = ensureProp(set, "Count", "TEXT", "0");
      const showCountKey = ensureProp(set, "Show count", "BOOLEAN", true);
      for (const comp of variants) {
        reference(comp, "Label", "characters", labelKey);
        reference(comp, "Count", "characters", countKey);
        reference(comp, "Badge", "visible", showCountKey);
      }
    },
  };
}

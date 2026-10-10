// Chip/Side — Side (buy / sell). The text label ("Buy" / "Sell", or "B" / "S") carries the meaning, so
// side never relies on color alone. Buy/Sell hues (blue / coral) stay distinct from Gain/Loss (green / red).
// Label is a plain text layer (overridable), not a text property: a text property has one default
// across the set, which would make the Sell variant read "Buy".

import { Kit, color, space, configureFrame } from "../../core/helpers";
import { ComponentSetSpec, Props, combos, ensureText, prune } from "../../core/ensure";
import { describe } from "../../../../definitions/docRegistry";

const LABELS: Record<string, string> = { buy: "Buy", sell: "Sell" };

export function sideChipSpec(kit: Kit): ComponentSetSpec {
  return {
    name: "Chip/Side",
    description: describe("Chip/Side"),
    variants: combos({ Side: ["buy", "sell"] }),
    columnProp: "Side",

    async build(comp: ComponentNode, p: Props) {
      configureFrame(comp, {
        direction: "HORIZONTAL",
        align: "CENTER",
        padding: { x: space(kit, "space/8"), y: space(kit, "space/2") },
        radius: space(kit, "radius/sm"),
        fill: color(kit, `finance/${p.Side}-subtle`),
      });
      const label = await ensureText(kit, comp, "Label", LABELS[p.Side], "Label", `finance/${p.Side}-strong`, 0);
      prune(comp, [label]);
    },
  };
}

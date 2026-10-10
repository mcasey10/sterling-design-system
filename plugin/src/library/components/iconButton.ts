// Controls/Icon button — Kind (secondary / ghost / danger) × Size (sm / md) × State
// (default / hover / pressed / focus / disabled). Square, sized to the control height.
// Properties: Icon (swap), Label (text) — the accessible name. The Label layer is hidden, so an
// icon-only button can never show a visible label; it exists for the properties panel and Dev Mode.
// Danger uses status/critical (destructive row actions such as delete), never finance/sell.

import { Kit, color, density, space, configureFrame, setSize } from "../../core/helpers";
import {
  ComponentSetSpec, Props, combos, ensureInstance, ensureText, prune, tintIcon, reference, ensureFocusRing, defineProp,
  variantAxes,
} from "../../core/ensure";
import type { IconIndex } from "../icons";
import { describe } from "../../../../definitions/docRegistry";
import { propertyDef } from "../../../../definitions/components";

interface Look {
  fill?: string;
  stroke?: string;
  icon: string;
}

const LOOKS: Record<string, Record<string, Look>> = {
  secondary: {
    default: { fill: "surface/panel", stroke: "border/strong", icon: "text/primary" },
    hover: { fill: "surface/hover", stroke: "border/strong", icon: "text/primary" },
    pressed: { fill: "surface/pressed", stroke: "border/strong", icon: "text/primary" },
    disabled: { fill: "surface/disabled", stroke: "border/default", icon: "text/disabled" },
  },
  ghost: {
    default: { icon: "text/primary" },
    hover: { fill: "surface/hover", icon: "text/primary" },
    pressed: { fill: "surface/pressed", icon: "text/primary" },
    disabled: { icon: "text/disabled" },
  },
  // Ghost-style so it sits quietly in a row until hovered; pressed fills solid critical.
  danger: {
    default: { icon: "status/critical" },
    hover: { fill: "status/critical-subtle", icon: "status/critical-strong" },
    pressed: { fill: "status/critical", icon: "text/inverse" },
    disabled: { icon: "text/disabled" },
  },
};

export function iconButtonSpec(kit: Kit, icons: IconIndex): ComponentSetSpec {
  const defaultIcon = icons.get(propertyDef("Controls/Icon button", "Icon").default as string)!;
  return {
    name: "Controls/Icon button",
    description: describe("Controls/Icon button"),
    variants: combos(variantAxes("Controls/Icon button")),
    columnProp: "State",

    async build(comp: ComponentNode, p: Props) {
      const look = LOOKS[p.Kind][p.State === "focus" ? "default" : p.State];
      const side = density(kit, p.Size === "md" ? "control/height" : "control/height-sm");
      configureFrame(comp, {
        direction: "HORIZONTAL",
        align: "CENTER",
        justify: "CENTER",
        width: side,
        height: side,
        radius: space(kit, "radius/sm"),
        fill: look.fill ? color(kit, look.fill) : undefined,
        stroke: look.stroke ? color(kit, look.stroke) : undefined,
      });
      const icon = await ensureInstance(comp, "Icon", defaultIcon, 0);
      setSize(icon, density(kit, "icon/size"), density(kit, "icon/size"));
      tintIcon(icon, color(kit, look.icon));
      // Accessible name: hidden, so it never renders, but it shows in the properties panel and Dev Mode.
      const label = await ensureText(kit, comp, "Label", "Action", "Label", "text/primary", 1);
      if (label.visible) label.visible = false;
      const ring = ensureFocusRing(kit, comp, p.State === "focus", space(kit, "radius/sm"));
      prune(comp, ring ? [icon, label, ring] : [icon, label]);
    },

    wire(set: ComponentSetNode, variants: ComponentNode[]) {
      const labelKey = defineProp(set, "Label");
      const iconKey = defineProp(set, "Icon", {
        defaultId: defaultIcon.id,
        preferredValues: [...icons.values()].map((c) => ({ type: "COMPONENT" as const, key: c.key })),
      });
      for (const comp of variants) {
        reference(comp, "Label", "characters", labelKey);
        reference(comp, "Icon", "mainComponent", iconKey);
      }
    },
  };
}

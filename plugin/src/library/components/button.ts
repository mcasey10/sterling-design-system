// Button — Kind (primary / secondary / ghost / danger) × Size (sm / md) × State
// (default / hover / pressed / focus / disabled). Focus adds a focus/ring outline. Properties: Label (text), Show icon (boolean), Icon (swap).
// Danger uses status/critical — never finance/sell, so Sell never reads as destructive.

import { Kit, color, density, space, configureFrame, setSize, doc } from "../../core/helpers";
import { ComponentSetSpec, Props, combos, ensureInstance, ensureText, ensureProp, prune, tintIcon, reference, ensureFocusRing } from "../../core/ensure";
import type { IconIndex } from "../icons";

interface Look {
  fill?: string;
  stroke?: string;
  text: string;
}

const DISABLED_SOLID: Look = { fill: "surface/disabled", text: "text/disabled" };

const LOOKS: Record<string, Record<string, Look>> = {
  primary: {
    default: { fill: "accent/default", text: "text/inverse" },
    hover: { fill: "accent/hover", text: "text/inverse" },
    pressed: { fill: "accent/pressed", text: "text/inverse" },
    disabled: DISABLED_SOLID,
  },
  secondary: {
    default: { fill: "surface/panel", stroke: "border/strong", text: "text/primary" },
    hover: { fill: "surface/hover", stroke: "border/strong", text: "text/primary" },
    pressed: { fill: "surface/pressed", stroke: "border/strong", text: "text/primary" },
    disabled: { fill: "surface/disabled", stroke: "border/default", text: "text/disabled" },
  },
  ghost: {
    default: { text: "text/primary" },
    hover: { fill: "surface/hover", text: "text/primary" },
    pressed: { fill: "surface/pressed", text: "text/primary" },
    disabled: { text: "text/disabled" },
  },
  danger: {
    default: { fill: "status/critical", text: "text/inverse" },
    hover: { fill: "status/critical-hover", text: "text/inverse" },
    pressed: { fill: "status/critical-pressed", text: "text/inverse" },
    disabled: DISABLED_SOLID,
  },
};

export function buttonSpec(kit: Kit, icons: IconIndex): ComponentSetSpec {
  const defaultIcon = icons.get("plus")!;
  return {
    name: "Controls/Button",
    description:
      doc(
      "Kind × Size × State (default / hover / pressed / focus / disabled). Label, Show icon, and Icon are component " +
        "properties. Height and padding follow the Density mode. Danger uses status/critical, never finance/sell.",
      "triggering an action. One primary per area; secondary for alternatives; ghost in dense toolbars and bulk bars; " +
        "danger for destructive actions.",
      "navigating to another page (use a link), toggling a setting (use a checkbox), or Buy/Sell trade actions styled with danger.",
      { guidelines: ["Accessibility", "Color", "Naming"] }
    ),
    variants: combos({
      Kind: ["primary", "secondary", "ghost", "danger"],
      Size: ["sm", "md"],
      State: ["default", "hover", "pressed", "focus", "disabled"],
    }),
    columnProp: "State",

    async build(comp: ComponentNode, p: Props) {
      // Focus keeps the default look and adds the focus ring.
      const look = LOOKS[p.Kind][p.State === "focus" ? "default" : p.State];
      const md = p.Size === "md";
      configureFrame(comp, {
        direction: "HORIZONTAL",
        align: "CENTER",
        justify: "CENTER",
        gap: density(kit, "control/gap"),
        padding: { x: density(kit, md ? "control/padding-x" : "control/padding-x-sm") },
        height: density(kit, md ? "control/height" : "control/height-sm"),
        radius: space(kit, "radius/sm"),
        fill: look.fill ? color(kit, look.fill) : undefined,
        stroke: look.stroke ? color(kit, look.stroke) : undefined,
      });
      const icon = await ensureInstance(comp, "Icon", defaultIcon, 0);
      setSize(icon, density(kit, "icon/size"), density(kit, "icon/size"));
      tintIcon(icon, color(kit, look.text));
      if (!icon.componentPropertyReferences?.visible) icon.visible = false;
      const label = await ensureText(kit, comp, "Label", "Button", md ? "Body-strong" : "Label", look.text, 1);
      const ring = ensureFocusRing(kit, comp, p.State === "focus", space(kit, "radius/sm"));
      prune(comp, ring ? [icon, label, ring] : [icon, label]);
    },

    wire(set: ComponentSetNode, variants: ComponentNode[]) {
      const labelKey = ensureProp(set, "Label", "TEXT", "Button");
      const showKey = ensureProp(set, "Show icon", "BOOLEAN", false);
      const iconKey = ensureProp(
        set,
        "Icon",
        "INSTANCE_SWAP",
        defaultIcon.id,
        [...icons.values()].map((c) => ({ type: "COMPONENT" as const, key: c.key }))
      );
      for (const comp of variants) {
        reference(comp, "Label", "characters", labelKey);
        reference(comp, "Icon", "visible", showKey);
        reference(comp, "Icon", "mainComponent", iconKey);
      }
    },
  };
}

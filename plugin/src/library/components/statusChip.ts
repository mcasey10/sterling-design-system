// Chip/Status — Tone (positive / warning / critical / info / neutral).
// Properties: Label (text), Show icon (boolean). Each tone has its own glyph so
// status is never conveyed by color alone.

import { Kit, size, color, space, configureFrame, setSize, truncate, doc } from "../../core/helpers";
import { ComponentSetSpec, Props, combos, ensureInstance, ensureText, ensureProp, prune, tintIcon, reference } from "../../core/ensure";
import type { IconIndex } from "../icons";

export const TONE_ICONS: Record<string, string> = {
  positive: "circle-check",
  warning: "alert-triangle",
  critical: "circle-x",
  info: "info",
  neutral: "circle-dot",
};

export function statusChipSpec(kit: Kit, icons: IconIndex): ComponentSetSpec {
  return {
    name: "Chip/Status",
    description:
      doc(
      "Tone (positive / warning / critical / info / neutral) with a tone-specific icon. Label and Show icon are component " +
        "properties; labels longer than 160px truncate. Colors: status/<tone>-subtle background, status/<tone>-strong text and icon.",
      "showing the status of a record (in a grid cell, card, or header). Keep labels to one or two words.",
      "the status is an applied filter (use Chip/Filter), or the chip would be the only signal — keep the icon or label visible.",
      { guidelines: ["Accessibility"] }
    ),
    variants: combos({ Tone: Object.keys(TONE_ICONS) }),
    columnProp: "Tone",

    async build(comp: ComponentNode, p: Props) {
      const tone = p.Tone;
      const ink = `status/${tone}-strong`;
      configureFrame(comp, {
        direction: "HORIZONTAL",
        align: "CENTER",
        gap: space(kit, "space/4"),
        padding: { x: space(kit, "space/8"), y: space(kit, "space/2") },
        radius: space(kit, "radius/sm"),
        fill: color(kit, `status/${tone}-subtle`),
      });
      const icon = await ensureInstance(comp, "Icon", icons.get(TONE_ICONS[tone])!, 0);
      setSize(icon, size(kit, "size/12"), size(kit, "size/12"));
      tintIcon(icon, color(kit, ink));
      const label = await ensureText(kit, comp, "Label", "Status", "Label", ink, 1);
      truncate(label, { maxWidth: 160 });
      prune(comp, [icon, label]);
    },

    wire(set: ComponentSetNode, variants: ComponentNode[]) {
      const labelKey = ensureProp(set, "Label", "TEXT", "Status");
      const showKey = ensureProp(set, "Show icon", "BOOLEAN", true);
      for (const comp of variants) {
        reference(comp, "Label", "characters", labelKey);
        reference(comp, "Icon", "visible", showKey);
      }
    },
  };
}

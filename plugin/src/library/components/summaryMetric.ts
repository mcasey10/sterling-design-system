// SummaryMetric — label, value, optional progress bar vs. target.
// Status (normal / over-target) × State (default / loading). Over-target adds a warning icon and text, not
// just color. Loading replaces the value with a skeleton bar and says "Loading…"; it looks the same for both Statuses.
// Properties: Label, Value, Detail (text), Show progress (boolean).

import { Kit, size, color, space, configureFrame, setSize, bindFill, bindRadius, rect, truncate, untruncate } from "../../core/helpers";
import {
  ComponentSetSpec, Props, combos, ensureFrame, ensureInstance, ensureText, prune, tintIcon, reference, defineProp,
  variantAxes,
} from "../../core/ensure";
import type { IconIndex } from "../icons";
import { describe } from "../../../../definitions/docRegistry";

const WIDTH = 220;
const PAD = 16;

const STATES: Record<string, { value: string; detail: string; ratio: number }> = {
  normal: { value: "1,234", detail: "75% of target", ratio: 0.75 },
  "over-target": { value: "1,380", detail: "Over target by 12%", ratio: 1 },
};

export function summaryMetricSpec(kit: Kit, icons: IconIndex): ComponentSetSpec {
  return {
    name: "Summary/Summary metric",
    description: describe("Summary/Summary metric"),
    variants: combos(variantAxes("Summary/Summary metric")),
    columnProp: "Status",

    async build(comp: ComponentNode, p: Props) {
      const loading = p.State === "loading";
      // Loading looks the same for both Statuses: the data isn't known yet.
      const over = p.Status === "over-target" && !loading;
      const spec = STATES[p.Status];
      configureFrame(comp, {
        gap: space(kit, "space/8"),
        padding: space(kit, "space/16"),
        width: WIDTH,
        fill: color(kit, "surface/panel"),
        stroke: color(kit, "border/default"),
        radius: space(kit, "radius/md"),
      });
      const label = await ensureText(kit, comp, "Label", "Metric", "Label", "text/secondary", 0);
      truncate(label, { fill: true });
      if (loading) {
        // Skeleton bar in place of the value, plus a "Loading…" detail so it isn't conveyed by the bar alone.
        const skeleton = ensureFrame(
          comp, "Value skeleton",
          { width: 120, height: size(kit, "size/24"), radius: space(kit, "radius/xs"), fill: color(kit, "surface/skeleton") },
          1
        );
        const row = ensureFrame(comp, "Detail row", { direction: "HORIZONTAL", align: "MIN", gap: space(kit, "space/4"), fillWidth: true }, 2);
        const detailText = await ensureText(kit, row, "Detail", "Loading…", "Caption", "text/secondary", 0);
        if (detailText.layoutSizingHorizontal !== "FILL") detailText.layoutSizingHorizontal = "FILL";
        prune(row, [detailText]);
        prune(comp, [label, skeleton, row]);
        return;
      }
      const value = await ensureText(kit, comp, "Value", spec.value, "Title", "text/primary", 1);
      // Truncate text, never numbers: the value hugs. Use compact notation (e.g. $12.35B) for large values,
      // with the full value in the Detail line.
      untruncate(value);

      // Progress: a full-width track with a fixed-width bar inside.
      const track = ensureFrame(
        comp, "Progress",
        { direction: "HORIZONTAL", height: size(kit, "size/4"), fillWidth: true, fill: color(kit, "border/default"), radius: space(kit, "radius/pill") },
        2
      );
      let bar = track.findChild((n) => n.name === "Bar" && n.type === "RECTANGLE") as RectangleNode | null;
      if (!bar) {
        bar = rect("Bar", 1, 4);
        track.appendChild(bar);
      }
      const barWidth = Math.round((WIDTH - PAD * 2) * spec.ratio);
      setSize(bar, barWidth, size(kit, "size/4"));
      bindFill(bar, color(kit, over ? "status/warning-strong" : "accent/default"));
      bindRadius(bar, space(kit, "radius/pill"));
      prune(track, [bar]);

      const detail = ensureFrame(
        comp, "Detail row",
        { direction: "HORIZONTAL", align: "MIN", gap: space(kit, "space/4"), fillWidth: true },
        3
      );
      const keep: SceneNode[] = [];
      if (over) {
        const icon = await ensureInstance(detail, "Warning icon", icons.get("alert-triangle")!, 0);
        setSize(icon, size(kit, "size/12"), size(kit, "size/12"));
        tintIcon(icon, color(kit, "status/warning-strong"));
        keep.push(icon);
      }
      const detailText = await ensureText(
        kit, detail, "Detail", spec.detail, "Caption", over ? "status/warning-strong" : "text/secondary", keep.length
      );
      // Fill the remaining width and wrap, so long details (e.g. on a narrow instance) never overflow the card.
      if (detailText.layoutSizingHorizontal !== "FILL") detailText.layoutSizingHorizontal = "FILL";
      keep.push(detailText);
      prune(detail, keep);
      prune(comp, [label, value, track, detail]);
    },

    wire(set: ComponentSetNode, variants: ComponentNode[]) {
      // Value and Detail differ per state, so they stay plain text layers (overridable) rather than
      // set-wide text properties, which would force one default across both variants.
      const labelKey = defineProp(set, "Label");
      const showKey = defineProp(set, "Show progress");
      for (const comp of variants) {
        reference(comp, "Label", "characters", labelKey);
        reference(comp, "Progress", "visible", showKey);
      }
    },
  };
}

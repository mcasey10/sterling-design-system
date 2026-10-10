// Cover page: one 1920 × 960 frame with Sterling's name, tagline, and version beside a montage of live
// components (summary metrics, bulk action bar, data grid, pagination), pinned to the Dark color mode.
// It's the file's cover, so it's what people see first. Documentation only, so it is rebuilt on each
// run (at the same position).
//
// Cover type is larger than any text style in tokens.json (those are sized for product UI), so its font
// sizes are set here rather than through a style. Colors and spacing are still bound to variables.

import { tokens } from "../../core/tokens";
import { COLLECTIONS } from "../../core/variables";
import { Kit, color, space, frame, bindFill, pinMode, takeOver, PLUGIN_KEY } from "../../core/helpers";
import { variantOf, setProps } from "../../core/ensure";
import { NAME, TAGLINE, VERSION } from "../../core/meta";
import type { Library } from "./componentsPage";
import { created, updated } from "../../core/log";

const ROOT = "Cover";
export const COVER_WIDTH = 1920;
export const COVER_HEIGHT = 960;
/** Components in the montage are shown larger than life, so they read at thumbnail size. */
const MONTAGE_SCALE = 1.25;
/** Neutral placeholder metrics for the montage: label, value, detail. */
const METRICS: [string, string, string][] = [
  ["Open items", "1,204", "Across 14 owners"],
  ["Total amount", "$12.35B", "Full value: $12,345,678,901.25"],
  ["Flagged", "37", "3% of open items"],
];

/** Large cover text: Inter at a set size, with its color bound to a variable. */
async function coverText(kit: Kit, chars: string, style: string, fontSize: number, colorName: string, letterSpacing = 0) {
  const t = figma.createText();
  t.setPluginData(PLUGIN_KEY, "generated");
  const fontName = { family: tokens.typography.fontFamily, style };
  await figma.loadFontAsync(fontName);
  t.fontName = fontName;
  t.fontSize = fontSize;
  t.lineHeight = { unit: "PERCENT", value: 110 };
  t.letterSpacing = { unit: "PERCENT", value: letterSpacing };
  t.characters = chars;
  t.name = chars;
  bindFill(t, color(kit, colorName));
  return t;
}

export async function buildCover(kit: Kit, page: PageNode, lib: Library): Promise<FrameNode> {
  const pos = takeOver(page, ROOT);
  const root = frame(ROOT, {
    direction: "HORIZONTAL",
    align: "CENTER",
    justify: "SPACE_BETWEEN",
    padding: { x: 96 },
    width: COVER_WIDTH,
    height: COVER_HEIGHT,
    fill: color(kit, "surface/background"),
    clip: true,
  });
  pinMode(kit, root, COLLECTIONS.color, "Dark");
  pinMode(kit, root, COLLECTIONS.density, "Default");
  page.appendChild(root);
  if (pos) {
    root.x = pos.x;
    root.y = pos.y;
  }

  // Left: name, tagline, version.
  const title = frame("Title", { gap: space(kit, "space/24"), width: 760 });
  root.appendChild(title);
  title.appendChild(await coverText(kit, "DESIGN SYSTEM", "Semi Bold", 28, "accent/default", 12));
  title.appendChild(await coverText(kit, NAME, "Semi Bold", 200, "text/primary", -4));
  const tagline = await coverText(kit, TAGLINE, "Regular", 44, "text/secondary");
  title.appendChild(tagline);
  tagline.layoutSizingHorizontal = "FILL";
  const version = frame("Version", {
    direction: "HORIZONTAL",
    padding: { x: space(kit, "space/24"), y: space(kit, "space/12") },
    stroke: color(kit, "border/strong"),
    radius: space(kit, "radius/pill"),
  });
  title.appendChild(version);
  version.appendChild(await coverText(kit, `Version ${VERSION}`, "Medium", 28, "text/primary"));

  // Right: a montage of live components on a panel — summary metrics, then a bulk action bar, data grid,
  // and pagination.
  const montage = frame("Montage", {
    gap: space(kit, "space/24"),
    padding: space(kit, "space/32"),
    fill: color(kit, "surface/panel"),
    stroke: color(kit, "border/default"),
    radius: space(kit, "radius/md"),
  });
  root.appendChild(montage);
  const metrics = frame("Metrics", { direction: "HORIZONTAL", gap: space(kit, "space/24") });
  montage.appendChild(metrics);
  for (const [label, value, detail] of METRICS) {
    const metric = variantOf(lib.summaryMetric, { Status: "normal", State: "default" }).createInstance();
    metrics.appendChild(metric);
    setProps(metric, { Label: label, "Show progress": false });
    for (const [layer, chars] of [["Value", value], ["Detail", detail]]) {
      const t = metric.findOne((n) => n.type === "TEXT" && n.name === layer) as TextNode | null;
      if (!t) continue;
      await figma.loadFontAsync(t.fontName as FontName);
      t.characters = chars;
    }
    metric.scaleFactor = MONTAGE_SCALE;
  }
  for (const main of [lib.bulkActionBar, lib.exampleGrid, lib.pagination]) {
    const inst = main.createInstance();
    montage.appendChild(inst);
    inst.scaleFactor = MONTAGE_SCALE;
  }

  if (pos) updated("Page Cover");
  else created("Page Cover content");
  return root;
}

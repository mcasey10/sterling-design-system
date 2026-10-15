// Cover page: one 1920 × 960 frame with Sterling's name, tagline, and version beside a montage of live
// components (summary metrics, bulk action bar, data grid, pagination) and an author credit, pinned to
// the Dark color mode. It's set as the file's thumbnail, so it's what people see first. Documentation
// only, so it is rebuilt on each run (at the same position).
//
// Cover type is larger than any text style in tokens.json (those are sized for product UI), so its font
// sizes are set here rather than through a style. Colors and spacing are still bound to variables.

import { tokens } from "../../core/tokens";
import { COLLECTIONS } from "../../core/variables";
import { Kit, color, space, frame, bindFill, pinMode, takeOver, PLUGIN_KEY } from "../../core/helpers";
import { variantOf, setProps, nested } from "../../core/ensure";
import { NAME, TAGLINE, VERSION, CREDIT } from "../../core/meta";
import { WEBSITE_URL } from "../../../../definitions/pluginAddresses";
import type { Library } from "./componentsPage";
import { created, updated, warn } from "../../core/log";

const ROOT = "Cover";
export const COVER_WIDTH = 1920;
export const COVER_HEIGHT = 960;
const COVER_PADDING = 96;
/** How far the name moves left so its first letter aligns optically with the lines around it. */
const NAME_NUDGE = 8;
/** Components in the montage are shown larger than life, so they read at thumbnail size. */
const MONTAGE_SCALE = 1.25;
/** Neutral placeholder metrics for the montage: label, value, detail. */
const METRICS: [string, string, string][] = [
  ["Open items", "1,204", "Across 14 owners"],
  ["Total amount", "$12.35B", "Full value: $12,348,206,417.63"],
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
    padding: { x: COVER_PADDING },
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
  title.appendChild(await coverText(kit, "TOKENS · COMPONENTS · GUIDELINES", "Semi Bold", 28, "accent/default", 12));
  // The name is nudged left so the round "S" lines up optically with the straight edges of the text above
  // and below it; a wrapper keeps the nudge out of the auto layout.
  const name = await coverText(kit, NAME, "Semi Bold", 200, "text/primary", -4);
  const nameBox = frame("Name", { width: 760, height: name.height });
  title.appendChild(nameBox);
  nameBox.appendChild(name);
  name.layoutPositioning = "ABSOLUTE";
  name.x = -NAME_NUDGE;
  name.y = 0;
  // The tagline breaks after "for", so its two lines are even and no word is left alone.
  title.appendChild(await coverText(kit, TAGLINE.replace(" for ", " for\n"), "Regular", 44, "text/secondary"));
  const version = frame("Version", {
    direction: "HORIZONTAL",
    padding: { x: space(kit, "space/24"), y: space(kit, "space/12") },
    stroke: color(kit, "border/strong"),
    radius: space(kit, "radius/pill"),
  });
  title.appendChild(version);
  version.appendChild(await coverText(kit, `Version ${VERSION}`, "Medium", 28, "text/primary"));
  // The website, where every way into Sterling starts: a link, underlined so it isn't marked by color alone.
  const address = await coverText(kit, WEBSITE_URL.replace(/^https:\/\//, "").replace(/\/$/, ""), "Regular", 28, "text/secondary");
  address.textDecoration = "UNDERLINE";
  address.hyperlink = { type: "URL", value: WEBSITE_URL };
  title.appendChild(address);

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
  // The three metrics share the grid's width, so the panel's right edge is one clean line.
  const metricWidth = (lib.exampleGrid.width * MONTAGE_SCALE - 24 * (METRICS.length - 1)) / METRICS.length;
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
    metric.resize(metricWidth, metric.height);
  }
  for (const main of [lib.bulkActionBar, lib.exampleGrid, lib.pagination]) {
    const inst = main.createInstance();
    montage.appendChild(inst);
    // The bar's primary action gets a real verb here; in the library it stays a placeholder.
    const primary = main === lib.bulkActionBar ? nested(inst, "Primary") : undefined;
    if (primary) setProps(primary, { Label: "Approve" });
    inst.scaleFactor = MONTAGE_SCALE;
  }

  // Author credit, bottom left, outside the auto layout so it doesn't move the title.
  const credit = await coverText(kit, CREDIT, "Regular", 24, "text/secondary");
  root.appendChild(credit);
  credit.layoutPositioning = "ABSOLUTE";
  credit.x = COVER_PADDING;
  credit.y = COVER_HEIGHT - COVER_PADDING + 24;

  // The cover is the file's thumbnail. It's redrawn on every build (a new node), so it's set again each time.
  try {
    await figma.setFileThumbnailNodeAsync(root);
  } catch (e) {
    warn(`Couldn't set the cover as the file thumbnail: ${(e as Error).message}`);
  }

  if (pos) updated("Page Cover");
  else created("Page Cover content");
  return root;
}

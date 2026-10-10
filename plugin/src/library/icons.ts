// Icon components ("Icon/<name>"), drawn on a 16px grid as original, simple outline glyphs.
// Every drawn layer is named "Glyph" so parent components can recolor it (tintIcon) and
// overrides carry over when an icon is swapped. Glyph layers scale with the instance.
// Glyphs are only redrawn when their SVG source changes, keeping node IDs stable.

import { Kit, color, space, recolor, PLUGIN_KEY, setDescription } from "../core/helpers";
import { ensureFrame, ensureText, findComponent } from "../core/ensure";
import { created, updated } from "../core/log";
import { describe } from "../../../definitions/docRegistry";
import { ICONS, svgFor } from "../../../definitions/icons";

export type IconIndex = Map<string, ComponentNode>;

function drawGlyph(comp: ComponentNode, svg: string) {
  for (const c of [...comp.children]) c.remove();
  const f = figma.createNodeFromSvg(svg);
  comp.appendChild(f);
  f.x = 0;
  f.y = 0;
  for (const shape of [...f.children]) {
    comp.appendChild(shape); // keeps its position: f sits at the component's origin
    shape.name = "Glyph";
    if ("constraints" in shape) shape.constraints = { horizontal: "SCALE", vertical: "SCALE" };
  }
  f.remove();
  comp.setPluginData("svg", svg);
}

export async function buildIcons(kit: Kit, page: PageNode, grid: FrameNode): Promise<IconIndex> {
  const index: IconIndex = new Map();
  const ink = color(kit, "text/primary");
  let i = 0;
  for (const [name, body] of Object.entries(ICONS)) {
    const svg = svgFor(body);
    const cell = ensureFrame(grid, `Cell/${name}`, { gap: space(kit, "space/8"), align: "CENTER" }, i++);
    let comp = findComponent(page, `Icon/${name}`);
    if (!comp) {
      comp = figma.createComponent();
      comp.name = `Icon/${name}`;
      cell.insertChild(0, comp);
      created(`Component Icon/${name}`);
    } else {
      updated(`Component Icon/${name}`);
    }
    const description = describe(`Icon/${name}`);
    if (comp.getPluginData(PLUGIN_KEY) !== "generated") comp.setPluginData(PLUGIN_KEY, "generated");
    if (comp.width !== 16 || comp.height !== 16) comp.resizeWithoutConstraints(16, 16);
    if (!Array.isArray(comp.fills) || comp.fills.length) comp.fills = [];
    if (comp.clipsContent) comp.clipsContent = false;
    setDescription(comp, description);
    if (comp.getPluginData("svg") !== svg || !comp.findOne((n) => n.name === "Glyph")) drawGlyph(comp, svg);

    for (const g of comp.findAll((n) => n.name === "Glyph")) recolor(g as VectorNode, ink);
    if (comp.parent === cell) {
      await ensureText(kit, cell, "Name", name, "Caption", "text/secondary", 1);
    }
    index.set(name, comp);
  }
  return index;
}
